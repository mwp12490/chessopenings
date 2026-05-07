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
  let currentMode = "practice";
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
    if (mode === "practice") startPractice();
    else if (mode === "explore") startExplore();
    else if (mode === "analysis") startAnalysis();
    else if (mode === "stats") startStats();
  }

  // ===== Practice Mode (mixed identify + setup) =====
  function startPractice() {
    nextPracticeQuestion();
  }

  function nextPracticeQuestion() {
    const opening = SRS.pickNext(OPENINGS);
    // Brand-new openings always start as identify so the user sees the
    // position before being asked to reproduce it from memory.
    const isNew = !SRS.getCard(opening.name);
    const useSetup = !isNew && Math.random() < 0.5;
    if (useSetup) loadSetupCard(opening);
    else loadIdentifyCard(opening);
  }

  function loadIdentifyCard(opening) {
    const fen = fenFromMoves(opening.moves);
    game.load(fen);
    // Keep the orientation as White by default
    if (board.orientation !== "white") board.setOrientation("white");
    board.setPosition(game.board(), null);
    updateTurnIndicator();

    const distractors = getRandomOpenings(3, opening);
    const choices = shuffle([opening, ...distractors]);

    modeState = { questionType: "identify", opening, choices, answered: false };
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
    SRS.review(modeState.opening.name, correct ? "good" : "again");
    saveScore();
    renderScore();
    renderPanel(true);
  }

  function loadSetupCard(opening) {
    game.reset();
    board.setOrientation("white");
    board.setPosition(game.board(), null);
    modeState = {
      questionType: "setup",
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
          SRS.review(modeState.opening.name, modeState.mistakes === 0 ? "good" : "again");
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
      SRS.review(modeState.opening.name, "again");
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

  // ===== Stats Mode =====
  function startStats() {
    // Park the board on the start position so the left side isn't stale.
    game.reset();
    board.setOrientation("white");
    board.setPosition(game.board(), null);
    updateTurnIndicator();
    renderPanel();
  }

  const ECO_FAMILY_LABELS = {
    A: "Flank openings",
    B: "Semi-open games",
    C: "Open games",
    D: "Closed games",
    E: "Indian defenses"
  };

  function renderStatsPanel() {
    panelEl.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "Stats";
    panelEl.appendChild(h);

    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = "Your spaced-repetition progress across the openings deck.";
    panelEl.appendChild(sub);

    const deck = SRS.deckStats(OPENINGS);
    const fc = SRS.forecast(OPENINGS);
    const hardest = SRS.hardest(OPENINGS, 5);
    const eco = SRS.byEco(OPENINGS);

    panelEl.appendChild(renderDeckSummary(deck));
    panelEl.appendChild(renderForecast(fc));
    panelEl.appendChild(renderEcoBreakdown(eco));
    panelEl.appendChild(renderHardest(hardest));
  }

  function renderDeckSummary(s) {
    const known = s.nYoung + s.nMature;
    const seg = (n, cls, label) => n > 0
      ? `<div class="bucket-seg ${cls}" style="flex:${n}" title="${label}: ${n}"></div>`
      : "";
    const wrap = document.createElement("div");
    wrap.className = "stats-block";
    wrap.innerHTML = `
      <div class="stats-row">
        <div class="stat"><span class="big">${known}</span><span class="lab">/ ${s.total} known</span></div>
        <div class="stat"><span class="big">${s.nDue}</span><span class="lab">due now</span></div>
        <div class="stat"><span class="big">${s.nNew}</span><span class="lab">new</span></div>
      </div>
      <div class="bucket-bar">
        ${seg(s.nMature, "mature", "Mature (≥21d)")}
        ${seg(s.nYoung, "young", "Young (<21d)")}
        ${seg(s.nLearning, "learning", "Learning")}
        ${seg(s.nNew, "new", "New")}
      </div>
      <div class="bucket-legend">
        <span><i class="dot mature"></i>Mature ${s.nMature}</span>
        <span><i class="dot young"></i>Young ${s.nYoung}</span>
        <span><i class="dot learning"></i>Learning ${s.nLearning}</span>
        <span><i class="dot new"></i>New ${s.nNew}</span>
      </div>
    `;
    return wrap;
  }

  function renderForecast(fc) {
    const wrap = document.createElement("div");
    wrap.className = "stats-block";
    wrap.innerHTML = `
      <div class="stats-h3">Coming up</div>
      <div class="stats-row">
        <div class="stat"><span class="big">${fc.today}</span><span class="lab">today</span></div>
        <div class="stat"><span class="big">${fc.tomorrow}</span><span class="lab">tomorrow</span></div>
        <div class="stat"><span class="big">${fc.week}</span><span class="lab">rest of week</span></div>
      </div>
    `;
    return wrap;
  }

  function renderEcoBreakdown(eco) {
    const wrap = document.createElement("div");
    wrap.className = "stats-block";
    let rows = "";
    for (const fam of ["A", "B", "C", "D", "E"]) {
      const g = eco[fam];
      if (!g || g.total === 0) continue;
      const pct = Math.round((g.known / g.total) * 100);
      rows += `
        <div class="eco-row">
          <div class="eco-name">${ECO_FAMILY_LABELS[fam]} <span class="eco-tag">(${fam})</span></div>
          <div class="eco-bar"><div style="width:${pct}%"></div></div>
          <div class="eco-count">${g.known}/${g.total}</div>
        </div>`;
    }
    wrap.innerHTML = `<div class="stats-h3">By family</div>${rows}`;
    return wrap;
  }

  function renderHardest(items) {
    const wrap = document.createElement("div");
    wrap.className = "stats-block";
    let body;
    if (items.length === 0) {
      body = `<div class="subtitle">No struggle data yet — answer a few wrong to populate this.</div>`;
    } else {
      body = items.map(({ opening, card }) => `
        <div class="hard-row">
          <span class="eco">${opening.eco}</span>
          <span class="hard-name">${escapeHtml(opening.name)}</span>
          <span class="hard-meta">${card.lapses} lapse${card.lapses === 1 ? "" : "s"} · ease ${card.ease.toFixed(2)}</span>
        </div>
      `).join("");
    }
    wrap.innerHTML = `<div class="stats-h3">Your hardest openings</div>${body}`;
    return wrap;
  }

  // ===== Engine Analysis Mode =====
  function startAnalysis() {
    // Don't reset the game — coming in from Practice should let the user
    // analyze the position they just played. Use the FEN/Reset controls if
    // they want to start over.
    modeState = { lastMove: null, eval: null, info: null, redoStack: [] };
    board.setOrientation("white");
    board.setPosition(game.board(), null);
    updateTurnIndicator();
    renderPanel();
    triggerAnalysis();
  }

  function handleAnalysisMoveAttempt({ from, to }) {
    const m = game.move({ from, to, promotion: "q" });
    if (!m) return false;
    // A new move from a viewed-past position branches off — drop forward history.
    if (modeState.redoStack) modeState.redoStack = [];
    modeState.lastMove = { from: m.from, to: m.to };
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
    return true;
  }

  // ===== Analysis history navigation =====
  function analysisStepBack() {
    const m = game.undo();
    if (!m) return;
    modeState.redoStack.push(m);
    const top = game.history({ verbose: true }).slice(-1)[0];
    modeState.lastMove = top ? { from: top.from, to: top.to } : null;
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
  }

  function analysisStepForward() {
    const m = modeState.redoStack && modeState.redoStack.pop();
    if (!m) return;
    game.move({ from: m.from, to: m.to, promotion: m.promotion });
    modeState.lastMove = { from: m.from, to: m.to };
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
  }

  function analysisJumpToStart() {
    let m;
    while ((m = game.undo())) modeState.redoStack.push(m);
    modeState.lastMove = null;
    board.setPosition(game.board(), null);
    updateTurnIndicator();
    triggerAnalysis();
  }

  function analysisJumpToEnd() {
    while (modeState.redoStack && modeState.redoStack.length) {
      const m = modeState.redoStack.pop();
      game.move({ from: m.from, to: m.to, promotion: m.promotion });
      modeState.lastMove = { from: m.from, to: m.to };
    }
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
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
    if (currentMode === "practice" && modeState.questionType === "setup") {
      return handleSetupMoveAttempt(move);
    }
    if (currentMode === "analysis") return handleAnalysisMoveAttempt(move);
    return false;
  }

  // ===== UI rendering =====
  function renderPanel(isAfterAnswer) {
    if (currentMode === "practice") {
      if (modeState.questionType === "setup") return renderSetupPanel();
      return renderIdentifyPanel(isAfterAnswer);
    }
    if (currentMode === "explore") return renderExplorePanel();
    if (currentMode === "analysis") return renderAnalysisPanel();
    if (currentMode === "stats") return renderStatsPanel();
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
      fb.innerHTML = `<strong>${escapeHtml(opening.name)}</strong> (${opening.eco}). ${escapeHtml(opening.description)}<br/><br/><span style="color:var(--text-dim)">Moves: ${formatNumberedSan(opening.moves)}</span>`;
      panelEl.appendChild(fb);

      const actions = document.createElement("div");
      actions.className = "actions";
      const next = document.createElement("button");
      next.className = "btn primary";
      next.textContent = "Next →";
      next.addEventListener("click", nextPracticeQuestion);
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
        nextPracticeQuestion();
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
    // Description can mention specific squares (e.g. "the bishop on c4
    // targets f7") — those are hints when the user is trying to play
    // the opening from memory. Hide it until they're done.
    meta.innerHTML = `
      <div class="name"><span class="eco">${opening.eco}</span>${escapeHtml(opening.name)}</div>
      ${complete ? `<div class="desc">${escapeHtml(opening.description)}</div>` : ""}
      <div class="progress"><div style="width:${(moveIndex / opening.moves.length) * 100}%"></div></div>
    `;
    panelEl.appendChild(meta);

    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = complete
      ? (mistakes === 0 ? "Perfect — opening reproduced exactly!" : "Completed (with hints/mistakes).")
      : `Make the next move for ${game.turn() === "w" ? "White" : "Black"} (${moveIndex + 1} / ${opening.moves.length}).`;
    panelEl.appendChild(sub);

    // Reveal the move list only after the user completes (or gives up via
    // "Show solution"). Showing it during the question would just be the
    // answer key.
    if (complete) {
      const ml = document.createElement("div");
      ml.className = "move-list";
      ml.innerHTML = renderMoveListHtml(opening.moves, moveIndex, true);
      panelEl.appendChild(ml);
    }

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
      nextPracticeQuestion();
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
  function formatNumberedSan(moves) {
    let s = "";
    for (let i = 0; i < moves.length; i += 2) {
      s += (i / 2 + 1) + ". " + moves[i];
      if (moves[i + 1]) s += " " + moves[i + 1];
      if (i + 2 < moves.length) s += " ";
    }
    return s;
  }

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

  // ===== Keyboard navigation =====
  // Arrow keys step through history in Analysis and Explore.
  document.addEventListener("keydown", (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (currentMode === "analysis") {
      if (e.key === "ArrowLeft") { e.preventDefault(); analysisStepBack(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); analysisStepForward(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); analysisJumpToStart(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); analysisJumpToEnd(); }
    } else if (currentMode === "explore") {
      if (e.key === "ArrowLeft") { e.preventDefault(); exploreStep(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); exploreStep(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); exploreStep(-Infinity); }
      else if (e.key === "ArrowDown") { e.preventDefault(); exploreStep(Infinity); }
    }
  });

  // Kick off
  setMode("practice");
})();
