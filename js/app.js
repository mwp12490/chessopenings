// Chess Openings Trainer — main controller.
// Wires the chess.js game state, the visual board, the openings database,
// and the Stockfish engine into four modes: identify, setup, explore, analysis.

(() => {
  const boardEl = document.getElementById("board");
  const overlayEl = document.getElementById("board-overlay");
  const panelEl = document.getElementById("panel");
  const turnEl = document.getElementById("turn-indicator");
  const scoreEl = document.getElementById("score");
  const engineDot = document.getElementById("engine-dot");
  const engineStatusEl = document.getElementById("engine-status");

  const SCORE_KEY = "chess-openings-trainer.score";
  let score = loadScore();
  renderScore();

  validateOpenings();

  const game = new Chess();
  const board = new ChessBoard(boardEl, {
    onMoveAttempt: handleMoveAttempt,
    legalSquaresFor: (square) => {
      const moves = game.moves({ square, verbose: true });
      return moves.map(m => m.to);
    }
  });
  board.setPosition(game.board(), null);
  updateTurnIndicator();

  const engine = new Engine();
  engine.onStatus(({ state, msg }) => {
    engineDot.className = "dot " + (state || "");
    engineStatusEl.textContent = msg;
  });
  engine.init().catch(() => {
    // Engine failure is non-fatal for the trainer modes; analysis mode will note it
  });

  // ===== Mode dispatcher =====
  let currentMode = "identify";
  let modeState = {}; // per-mode mutable state

  document.getElementById("modes").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    setMode(btn.dataset.mode);
  });
  document.getElementById("flip-board").addEventListener("click", () => board.flip());
  document.getElementById("reset-board").addEventListener("click", () => {
    if (currentMode === "analysis" || currentMode === "explore") {
      game.reset();
      modeState.lastMove = null;
      board.setPosition(game.board(), null);
      updateTurnIndicator();
      renderPanel();
      if (currentMode === "analysis") triggerAnalysis();
    } else {
      // In quiz modes, "Reset" restarts the current question
      renderPanel();
    }
  });
  document.getElementById("reset-score").addEventListener("click", () => {
    score = { correct: 0, total: 0 };
    saveScore();
    renderScore();
  });

  function setMode(mode) {
    currentMode = mode;
    for (const b of document.querySelectorAll(".modes .mode")) {
      b.classList.toggle("active", b.dataset.mode === mode);
    }
    overlayEl.classList.add("hidden");
    modeState = {};
    if (mode === "identify") startIdentify();
    else if (mode === "setup") startSetup();
    else if (mode === "explore") startExplore();
    else if (mode === "analysis") startAnalysis();
  }

  // ===== Identify Opening Mode =====
  function startIdentify() {
    nextIdentifyQuestion();
  }

  function nextIdentifyQuestion() {
    const opening = OPENINGS[Math.floor(Math.random() * OPENINGS.length)];
    const fen = fenFromMoves(opening.moves);
    game.load(fen);
    // Keep the orientation as White by default
    if (board.orientation !== "white") board.setOrientation("white");
    board.setPosition(game.board(), null);
    updateTurnIndicator();

    const distractors = getRandomOpenings(3, opening);
    const choices = shuffle([opening, ...distractors]);

    modeState = { opening, choices, answered: false };
    renderPanel();
  }

  function answerIdentify(choice, btnEl) {
    if (modeState.answered) return;
    modeState.answered = true;
    const correct = choice.name === modeState.opening.name;
    const buttons = panelEl.querySelectorAll(".choice");
    buttons.forEach(b => {
      b.disabled = true;
      if (b.dataset.name === modeState.opening.name) b.classList.add("correct");
      else if (b === btnEl && !correct) b.classList.add("incorrect");
    });
    score.total++;
    if (correct) score.correct++;
    saveScore();
    renderScore();
    renderPanel(true);
  }

  // ===== Set Up Opening Mode =====
  function startSetup() {
    nextSetupQuestion();
  }

  function nextSetupQuestion() {
    const opening = OPENINGS[Math.floor(Math.random() * OPENINGS.length)];
    game.reset();
    board.setOrientation("white");
    board.setPosition(game.board(), null);
    modeState = {
      opening,
      moveIndex: 0,
      mistakes: 0,
      complete: false,
      counted: false
    };
    updateTurnIndicator();
    renderPanel();
  }

  function handleSetupMoveAttempt({ from, to }) {
    if (modeState.complete) return false;
    const expectedSan = modeState.opening.moves[modeState.moveIndex];
    if (!expectedSan) return false;

    // Try the user's move first to see what SAN it produces
    // We simulate using a clone so we can reject without mutating real state
    const probe = new Chess(game.fen());
    const move = probe.move({ from, to, promotion: "q" });
    if (!move) return false; // illegal move — board will re-render

    if (move.san === expectedSan || sansEqual(move.san, expectedSan)) {
      // Accept: apply to real game
      const real = game.move({ from, to, promotion: "q" });
      modeState.moveIndex++;
      board.setPosition(game.board(), { from: real.from, to: real.to });
      updateTurnIndicator();
      if (modeState.moveIndex >= modeState.opening.moves.length) {
        modeState.complete = true;
        if (!modeState.counted) {
          modeState.counted = true;
          score.total++;
          if (modeState.mistakes === 0) score.correct++;
          saveScore();
          renderScore();
        }
        flashOverlay("Correct!", "ok", 900);
      }
      renderPanel();
      return true;
    } else {
      modeState.mistakes++;
      flashFeedback(panelEl.querySelector(".feedback-slot"),
        "Not quite — that move doesn't match this opening's main line. Try again.", "bad");
      return false;
    }
  }

  function setupHint() {
    if (modeState.complete) return;
    const expectedSan = modeState.opening.moves[modeState.moveIndex];
    if (!expectedSan) return;
    const moves = game.moves({ verbose: true });
    const target = moves.find(m => m.san === expectedSan);
    if (target) board.showHint(target.from);
  }

  function setupShowSolution() {
    if (modeState.complete) return;
    while (modeState.moveIndex < modeState.opening.moves.length) {
      const san = modeState.opening.moves[modeState.moveIndex];
      const m = game.move(san, { sloppy: true });
      if (!m) break;
      modeState.moveIndex++;
      board.setPosition(game.board(), { from: m.from, to: m.to });
    }
    modeState.complete = true;
    modeState.mistakes = Math.max(modeState.mistakes, 1); // counts as not mastered
    if (!modeState.counted) {
      modeState.counted = true;
      score.total++;
      saveScore();
      renderScore();
    }
    updateTurnIndicator();
    renderPanel();
  }

  // ===== Explore Mode =====
  function startExplore() {
    modeState = { selected: null, ply: 0, query: "" };
    selectExplore(OPENINGS[0]);
  }

  function selectExplore(opening) {
    modeState.selected = opening;
    modeState.ply = opening.moves.length;
    applyExploreState();
    renderPanel();
  }

  function applyExploreState() {
    if (!modeState.selected) return;
    const moves = modeState.selected.moves.slice(0, modeState.ply);
    game.reset();
    let last = null;
    for (const san of moves) {
      const m = game.move(san, { sloppy: true });
      if (m) last = { from: m.from, to: m.to };
    }
    board.setPosition(game.board(), last);
    updateTurnIndicator();
  }

  function exploreStep(delta) {
    if (!modeState.selected) return;
    const max = modeState.selected.moves.length;
    modeState.ply = Math.max(0, Math.min(max, modeState.ply + delta));
    applyExploreState();
    renderPanel();
  }

  // ===== Engine Analysis Mode =====
  function startAnalysis() {
    game.reset();
    modeState = { lastMove: null, eval: null, info: null };
    board.setOrientation("white");
    board.setPosition(game.board(), null);
    updateTurnIndicator();
    renderPanel();
    triggerAnalysis();
  }

  function handleAnalysisMoveAttempt({ from, to }) {
    const m = game.move({ from, to, promotion: "q" });
    if (!m) return false;
    modeState.lastMove = { from: m.from, to: m.to };
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
    return true;
  }

  let _analysisDispose = null;
  function triggerAnalysis() {
    if (currentMode !== "analysis") return;
    if (!engine.ready) {
      const slot = panelEl.querySelector(".eval-slot");
      if (slot) slot.innerHTML = '<div class="feedback bad">Stockfish is not loaded — analysis unavailable.</div>';
      return;
    }
    if (_analysisDispose) _analysisDispose();
    const onInfo = engine.onInfo((info) => {
      modeState.info = info;
      renderEval();
    });
    _analysisDispose = onInfo;
    engine.analyze(game.fen(), { depth: 16 }).then(({ bestmove, info }) => {
      modeState.bestmove = bestmove;
      modeState.info = info || modeState.info;
      renderEval();
    }).catch(() => {});
  }

  // ===== Move handling dispatcher =====
  function handleMoveAttempt(move) {
    if (currentMode === "setup") return handleSetupMoveAttempt(move);
    if (currentMode === "analysis") return handleAnalysisMoveAttempt(move);
    return false;
  }

  // ===== UI rendering =====
  function renderPanel(isAfterAnswer) {
    if (currentMode === "identify") return renderIdentifyPanel(isAfterAnswer);
    if (currentMode === "setup") return renderSetupPanel();
    if (currentMode === "explore") return renderExplorePanel();
    if (currentMode === "analysis") return renderAnalysisPanel();
  }

  function renderIdentifyPanel(isAfterAnswer) {
    const { opening, choices, answered } = modeState;
    panelEl.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "What opening is this?";
    panelEl.appendChild(h);
    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = "Look at the position on the board, then choose its name.";
    panelEl.appendChild(sub);

    const choicesDiv = document.createElement("div");
    choicesDiv.className = "choices";
    for (const c of choices) {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.dataset.name = c.name;
      btn.innerHTML = `<span class="eco">${c.eco}</span>${escapeHtml(c.name)}`;
      btn.addEventListener("click", () => answerIdentify(c, btn));
      if (answered) {
        btn.disabled = true;
        if (c.name === opening.name) btn.classList.add("correct");
      }
      choicesDiv.appendChild(btn);
    }
    panelEl.appendChild(choicesDiv);

    if (answered) {
      const fb = document.createElement("div");
      fb.className = "feedback info";
      fb.innerHTML = `<strong>${escapeHtml(opening.name)}</strong> (${opening.eco}). ${escapeHtml(opening.description)}<br/><br/><span style="color:var(--text-dim)">Moves: ${opening.moves.join(" ")}</span>`;
      panelEl.appendChild(fb);

      const actions = document.createElement("div");
      actions.className = "actions";
      const next = document.createElement("button");
      next.className = "btn primary";
      next.textContent = "Next →";
      next.addEventListener("click", nextIdentifyQuestion);
      actions.appendChild(next);
      panelEl.appendChild(actions);
    } else {
      const actions = document.createElement("div");
      actions.className = "actions";
      const skip = document.createElement("button");
      skip.className = "btn";
      skip.textContent = "Skip";
      skip.addEventListener("click", () => {
        score.total++;
        saveScore();
        renderScore();
        nextIdentifyQuestion();
      });
      actions.appendChild(skip);
      panelEl.appendChild(actions);
    }
  }

  function renderSetupPanel() {
    const { opening, moveIndex, complete, mistakes } = modeState;
    panelEl.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "Play the opening";
    panelEl.appendChild(h);

    const meta = document.createElement("div");
    meta.className = "opening-meta";
    meta.innerHTML = `
      <div class="name"><span class="eco">${opening.eco}</span>${escapeHtml(opening.name)}</div>
      <div class="desc">${escapeHtml(opening.description)}</div>
      <div class="progress"><div style="width:${(moveIndex / opening.moves.length) * 100}%"></div></div>
    `;
    panelEl.appendChild(meta);

    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = complete
      ? (mistakes === 0 ? "Perfect — opening reproduced exactly!" : "Completed (with hints/mistakes).")
      : `Make the next move for ${game.turn() === "w" ? "White" : "Black"} (${moveIndex + 1} / ${opening.moves.length}).`;
    panelEl.appendChild(sub);

    // Move list display with played / next styling
    const ml = document.createElement("div");
    ml.className = "move-list";
    ml.innerHTML = renderMoveListHtml(opening.moves, moveIndex, complete);
    panelEl.appendChild(ml);

    const fb = document.createElement("div");
    fb.className = "feedback-slot";
    panelEl.appendChild(fb);

    const actions = document.createElement("div");
    actions.className = "actions";

    if (!complete) {
      const hint = document.createElement("button");
      hint.className = "btn";
      hint.textContent = "Hint";
      hint.addEventListener("click", setupHint);
      actions.appendChild(hint);

      const sol = document.createElement("button");
      sol.className = "btn";
      sol.textContent = "Show solution";
      sol.addEventListener("click", setupShowSolution);
      actions.appendChild(sol);
    }

    const next = document.createElement("button");
    next.className = "btn primary";
    next.textContent = complete ? "Next opening →" : "Skip";
    next.addEventListener("click", () => {
      if (!complete) {
        score.total++;
        saveScore();
        renderScore();
      }
      nextSetupQuestion();
    });
    actions.appendChild(next);

    panelEl.appendChild(actions);
  }

  function renderExplorePanel() {
    const { selected, query } = modeState;
    panelEl.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "Explore openings";
    panelEl.appendChild(h);

    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = "Browse the database. Click an opening to view its position and step through moves.";
    panelEl.appendChild(sub);

    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search openings…";
    search.className = "search-input";
    search.value = query || "";
    search.addEventListener("input", () => {
      modeState.query = search.value;
      const list = panelEl.querySelector(".opening-list");
      if (list) list.innerHTML = renderOpeningListHtml(modeState);
      bindOpeningListClicks();
    });
    panelEl.appendChild(search);

    const list = document.createElement("div");
    list.className = "opening-list";
    list.innerHTML = renderOpeningListHtml(modeState);
    panelEl.appendChild(list);

    if (selected) {
      const div = document.createElement("div");
      div.style.marginTop = "12px";
      div.innerHTML = `
        <div class="opening-meta">
          <div class="name"><span class="eco">${selected.eco}</span>${escapeHtml(selected.name)}</div>
          <div class="desc">${escapeHtml(selected.description)}</div>
        </div>
        <div class="move-list">${renderMoveListHtml(selected.moves, modeState.ply, true)}</div>
        <div class="actions" style="margin-top:8px">
          <button class="btn" id="ex-prev">◀ Prev</button>
          <button class="btn" id="ex-next">Next ▶</button>
          <button class="btn" id="ex-end">End</button>
        </div>
      `;
      panelEl.appendChild(div);
      panelEl.querySelector("#ex-prev").addEventListener("click", () => exploreStep(-1));
      panelEl.querySelector("#ex-next").addEventListener("click", () => exploreStep(1));
      panelEl.querySelector("#ex-end").addEventListener("click", () => {
        modeState.ply = selected.moves.length;
        applyExploreState();
        renderPanel();
      });
    }

    bindOpeningListClicks();
  }

  function bindOpeningListClicks() {
    const items = panelEl.querySelectorAll(".opening-item");
    for (const item of items) {
      item.addEventListener("click", () => {
        const idx = parseInt(item.dataset.idx, 10);
        selectExplore(OPENINGS[idx]);
      });
    }
  }

  function renderOpeningListHtml(state) {
    const q = (state.query || "").trim().toLowerCase();
    const items = OPENINGS
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !q ||
        o.name.toLowerCase().includes(q) ||
        o.eco.toLowerCase().includes(q) ||
        (o.aliases || []).some(a => a.toLowerCase().includes(q)));
    if (items.length === 0) return '<div class="opening-item">No matches</div>';
    return items.map(({ o, i }) => {
      const sel = state.selected && state.selected.name === o.name ? " selected" : "";
      return `<div class="opening-item${sel}" data-idx="${i}"><span class="eco">${o.eco}</span>${escapeHtml(o.name)}</div>`;
    }).join("");
  }

  function renderAnalysisPanel() {
    panelEl.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "Engine Analysis";
    panelEl.appendChild(h);

    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = "Make moves freely on the board. Stockfish analyzes the position in real time.";
    panelEl.appendChild(sub);

    const slot = document.createElement("div");
    slot.className = "eval-slot";
    panelEl.appendChild(slot);

    const fenBox = document.createElement("div");
    fenBox.style.marginTop = "12px";
    fenBox.innerHTML = `
      <div class="subtitle" style="margin-bottom:4px">FEN</div>
      <input class="search-input" id="fen-input" value="${game.fen()}" />
      <div class="actions" style="margin-top:8px">
        <button class="btn" id="fen-load">Load FEN</button>
        <button class="btn" id="fen-undo">Undo</button>
      </div>
    `;
    panelEl.appendChild(fenBox);

    panelEl.querySelector("#fen-load").addEventListener("click", () => {
      const v = panelEl.querySelector("#fen-input").value.trim();
      if (game.load(v)) {
        modeState.lastMove = null;
        board.setPosition(game.board(), null);
        updateTurnIndicator();
        triggerAnalysis();
      } else {
        flashFeedback(slot, "Invalid FEN string.", "bad");
      }
    });
    panelEl.querySelector("#fen-undo").addEventListener("click", () => {
      const undone = game.undo();
      if (undone) {
        modeState.lastMove = null;
        board.setPosition(game.board(), null);
        updateTurnIndicator();
        triggerAnalysis();
      }
    });

    renderEval();
  }

  function renderEval() {
    if (currentMode !== "analysis") return;
    const slot = panelEl.querySelector(".eval-slot");
    if (!slot) return;
    const info = modeState.info;
    if (!engine.ready) {
      slot.innerHTML = '<div class="feedback bad">Stockfish is not loaded. Check your network connection or serve the page over HTTP(S).</div>';
      return;
    }
    if (!info) {
      slot.innerHTML = '<div class="feedback info">Thinking…</div>';
      return;
    }

    const turn = game.turn();
    let cp = info.cp;
    let mate = info.mate;
    // Stockfish reports score from side-to-move's perspective; convert to White's POV
    if (turn === "b") {
      if (cp != null) cp = -cp;
      if (mate != null) mate = -mate;
    }
    let evalText, pct;
    if (mate != null) {
      evalText = "M" + Math.abs(mate);
      pct = mate > 0 ? 100 : 0;
    } else if (cp != null) {
      evalText = (cp >= 0 ? "+" : "") + (cp / 100).toFixed(2);
      // Map cp to bar percent via sigmoid
      const x = cp / 400;
      pct = 100 / (1 + Math.exp(-x));
    } else {
      evalText = "0.00"; pct = 50;
    }

    let pvDisplay = "";
    if (info.pv && info.pv.length) {
      const probe = new Chess(game.fen());
      const sanLine = [];
      for (const uci of info.pv.slice(0, 8)) {
        const move = probe.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length === 5 ? uci[4] : undefined
        });
        if (!move) break;
        sanLine.push(move.san);
      }
      if (sanLine.length) pvDisplay = sanLine.join(" ");
    }

    slot.innerHTML = `
      <div class="eval-bar"><div class="white" style="width:${pct.toFixed(1)}%"></div><div class="black"></div></div>
      <div class="eval-readout">
        <span class="cp">${evalText}</span>
        <span class="depth">depth ${info.depth || "?"}${info.nodes ? " · " + (info.nodes/1000).toFixed(0) + "k nodes" : ""}</span>
      </div>
      <div class="bestline"><strong>Best line:</strong> ${escapeHtml(pvDisplay || "—")}</div>
    `;
  }

  // ===== Helpers =====
  function renderMoveListHtml(moves, ply, complete) {
    let html = "";
    for (let i = 0; i < moves.length; i += 2) {
      const num = (i / 2) + 1;
      html += `<span class="move-num">${num}.</span> `;
      for (let j = 0; j < 2 && i + j < moves.length; j++) {
        const idx = i + j;
        const cls = idx < ply ? "played" : (idx === ply && !complete ? "next" : "");
        html += `<span class="move ${cls}">${moves[idx]}</span> `;
      }
    }
    return html.trim();
  }

  function updateTurnIndicator() {
    if (game.in_checkmate()) turnEl.textContent = "Checkmate";
    else if (game.in_stalemate()) turnEl.textContent = "Stalemate";
    else if (game.in_draw()) turnEl.textContent = "Draw";
    else turnEl.textContent = (game.turn() === "w" ? "White" : "Black") + " to move" + (game.in_check() ? " (check)" : "");
  }

  function renderScore() {
    scoreEl.textContent = `${score.correct} / ${score.total}`;
  }

  function loadScore() {
    try {
      const raw = localStorage.getItem(SCORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { correct: 0, total: 0 };
  }

  function saveScore() {
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(score)); } catch (e) {}
  }

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function flashOverlay(text, kind, ms) {
    overlayEl.classList.remove("hidden");
    overlayEl.innerHTML = `<span class="${kind}">${escapeHtml(text)}</span>`;
    setTimeout(() => overlayEl.classList.add("hidden"), ms || 1000);
  }

  function flashFeedback(slot, text, kind) {
    if (!slot) return;
    slot.innerHTML = `<div class="feedback ${kind}">${escapeHtml(text)}</div>`;
    setTimeout(() => {
      if (slot.querySelector(".feedback")) slot.innerHTML = "";
    }, 2200);
  }

  function sansEqual(a, b) {
    // Normalize SAN by stripping check/mate markers and disambiguation hints
    const normalize = (s) => s.replace(/[+#?!]/g, "");
    return normalize(a) === normalize(b);
  }

  // Kick off
  setMode("identify");
})();
