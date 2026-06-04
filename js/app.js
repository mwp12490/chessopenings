// Chess Openings Trainer — main controller.
// Wires the chess.js game state, the visual board, the openings database,
// and the Stockfish engine into four modes: identify, setup, explore, analysis.

(async () => {
  // Hidden file:// migration window: only here to dump localStorage. Bail
  // out so we don't spin up the engine, board, etc. for a throwaway run.
  if (typeof window !== "undefined" && window.location && window.location.search.includes("migration=1")) {
    return;
  }

  // One-time pull of localStorage from the previous file:// origin — see
  // the "legacy:read" IPC handler in main.js. Runs before any of this
  // file's localStorage reads so the loaded keys are picked up below.
  const LEGACY_MIGRATED_KEY = "chess-openings-trainer.migrated-legacy";
  if (window.legacyMigration && localStorage.getItem(LEGACY_MIGRATED_KEY) !== "1") {
    try {
      const data = await window.legacyMigration.read();
      if (data && typeof data === "object") {
        for (const [k, v] of Object.entries(data)) {
          if (k === LEGACY_MIGRATED_KEY) continue;
          if (localStorage.getItem(k) == null && typeof v === "string") {
            localStorage.setItem(k, v);
          }
        }
        await window.legacyMigration.clear();
      }
      localStorage.setItem(LEGACY_MIGRATED_KEY, "1");
    } catch (e) {
      console.warn("Legacy migration apply failed:", e);
    }
  }

  // Belt-and-suspenders: pull from the userData JSON backup if relevant
  // localStorage keys are empty. This protects against future origin
  // changes / Chromium storage quirks that browser-only persistence
  // can't survive on its own.
  if (window.progressFs) {
    try {
      const raw = await window.progressFs.read();
      if (raw) {
        const parsed = JSON.parse(raw);
        const storage = parsed && parsed.storage;
        if (storage && typeof storage === "object") {
          for (const [k, v] of Object.entries(storage)) {
            if (localStorage.getItem(k) == null && typeof v === "string") {
              localStorage.setItem(k, v);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Local progress restore failed:", e);
    }
  }

  const boardEl = document.getElementById("board");
  const overlayEl = document.getElementById("board-overlay");
  const panelEl = document.getElementById("panel");
  const turnEl = document.getElementById("turn-indicator");
  const scoreEl = document.getElementById("score");
  const engineDot = document.getElementById("engine-dot");
  const engineStatusEl = document.getElementById("engine-status");

  const SCORE_GOAL_PCT = 80;
  const SHOW_ENGINE_KEY = "chess-openings-trainer.show-engine";
  const TIER_FILTER_KEY = "chess-openings-trainer.tier-filter";
  const AUDIENCE_FILTER_KEY = "chess-openings-trainer.audience-filter";
  const SIDE_FILTER_KEY = "chess-openings-trainer.side-filter";
  const ELO_FILTER_KEY = "chess-openings-trainer.elo-filter";
  // Score is per-session — not persisted across launches. Each graded
  // question attempt is one tally: denominator bumped by 1, numerator by
  // 1 if correct.
  let score = { correct: 0, total: 0 };
  let showEngine = loadShowEngine();
  let tierFilter = loadTierFilter();
  let audienceFilter = loadAudienceFilter();
  // Side filter: Set of "white" / "black". Both selected = no constraint.
  // The last enabled side can't be toggled off (would leave nothing).
  let sideFilter = loadSideFilter();
  // Elo filter is { min, max } when active (study openings whose level
  // overlaps that range) or null when disabled.
  let eloFilter = loadEloFilter();
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
  board.onMoveSound = playMoveSound;
  updateTurnIndicator();

  // Web-Audio synthesized "click" sound on every piece move. Two
  // overlapping voices: a low-frequency thud for body, a high-frequency
  // tick for the attack — together they read as a wooden piece tap.
  // The AudioContext is created lazily on first move (browser autoplay
  // policy needs a user gesture, which piece moves naturally are).
  let _audioCtx = null;
  function playMoveSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!_audioCtx) _audioCtx = new AC();
      if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
      const ctx = _audioCtx;
      const t = ctx.currentTime;

      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = "sine";
      thud.frequency.setValueAtTime(180, t);
      thud.frequency.exponentialRampToValueAtTime(70, t + 0.07);
      thudGain.gain.setValueAtTime(0.18, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      thud.connect(thudGain).connect(ctx.destination);
      thud.start(t);
      thud.stop(t + 0.1);

      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = "triangle";
      click.frequency.setValueAtTime(2400, t);
      clickGain.gain.setValueAtTime(0.07, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      click.connect(clickGain).connect(ctx.destination);
      click.start(t);
      click.stop(t + 0.035);
    } catch (e) { /* audio failure is non-fatal */ }
  }

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
  document.getElementById("settings-btn").addEventListener("click", openSettingsModal);
  document.getElementById("settings-close").addEventListener("click", closeSettingsModal);
  document.getElementById("settings-modal").addEventListener("click", (e) => {
    // Click on the backdrop itself (not the modal box) closes.
    if (e.target.id === "settings-modal") closeSettingsModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettingsModal();
  });

  function openSettingsModal() {
    const body = document.getElementById("settings-body");
    body.innerHTML = "";
    body.appendChild(renderProgressSync());
    document.getElementById("settings-modal").classList.remove("hidden");
  }
  function closeSettingsModal() {
    document.getElementById("settings-modal").classList.add("hidden");
  }
  document.getElementById("engine-toggle").addEventListener("click", () => {
    showEngine = !showEngine;
    saveShowEngine();
    syncEngineToggleButton();
    if (currentMode === "practice") renderPanel();
    else if (!showEngine) {
      board.clearEngineArrow();
      updateVerticalEvalBar(50, "", false);
    }
  });
  document.getElementById("reset-board").addEventListener("click", () => {
    if (currentMode === "explore") {
      game.reset();
      modeState.lastMove = null;
      modeState.freestyle = false;
      modeState.exploreRedoStack = [];
      board.setPosition(game.board(), null);
      updateTurnIndicator();
      selectExplore(OPENINGS[0]);
    } else if (currentMode === "practice" && modeState.questionType === "setup") {
      // Replay the opening from the start position. We deliberately keep
      // modeState.counted/mistakes intact: if the user already finished the
      // card (e.g. via "Show solution"), the SRS grade is locked in and
      // re-running shouldn't promote it. Mistakes from a partial attempt also
      // persist so a reset doesn't launder away a wrong move.
      game.reset();
      board.setPosition(game.board(), null);
      modeState.moveIndex = 0;
      modeState.complete = false;
      updateTurnIndicator();
      renderPanel();
    } else {
      // Identify mode and other quiz states — just re-render.
      renderPanel();
    }
  });
  document.getElementById("reset-score").addEventListener("click", () => {
    score.correct = 0;
    score.total = 0;
    renderScore();
  });

  function setMode(mode) {
    currentMode = mode;
    for (const b of document.querySelectorAll(".modes .mode")) {
      b.classList.toggle("active", b.dataset.mode === mode);
    }
    overlayEl.classList.add("hidden");
    modeState = {};
    renderFilterBar();
    if (mode === "practice") startPractice();
    else if (mode === "tricks") startTricks();
    else if (mode === "explore") startExplore();
  }

  // Called after the user toggles a tier or audience filter. If the card
  // currently on screen no longer matches the new filter, advance to a fresh
  // pick so the user immediately sees the effect of their change. Otherwise
  // just re-render the panel (so things like distractor lists refresh).
  function applyFilterChange() {
    if (currentMode !== "practice") {
      renderPanel();
      return;
    }
    const op = modeState && modeState.opening;
    if (op) {
      const pool = getFilteredOpeningPool();
      const stillMatches = pool.some(o => o.name === op.name);
      if (!stillMatches) {
        // Park historyIndex at the head so nextPracticeQuestion picks a
        // fresh card rather than walking forward into a stale history entry
        // that might also fail the new filter.
        historyIndex = questionHistory.length - 1;
        nextPracticeQuestion();
        return;
      }
    }
    renderPanel();
  }

  // Filter bar (tier + side + audience + Elo) lives in its own strip
  // directly below the topbar. Shown in Practice and Explore (it
  // determines the rotation in Practice and the list contents in
  // Explore). Hidden in Tricks since trick selection has its own logic.
  function renderFilterBar() {
    const bar = document.getElementById("filterbar");
    if (!bar) return;
    bar.innerHTML = "";
    if (currentMode !== "practice" && currentMode !== "explore") {
      bar.classList.add("hidden");
      return;
    }
    bar.classList.remove("hidden");
    bar.appendChild(createTierFilter());
    bar.appendChild(createSideFilter());
    bar.appendChild(createAudienceFilter());
    bar.appendChild(createEloFilter());
  }

  // Side filter: choose to study only White's openings, only Black's, or
  // both. Mirrors the tier filter pattern.
  function createSideFilter() {
    const wrap = document.createElement("div");
    wrap.className = "side-filter";
    const lbl = document.createElement("span");
    lbl.className = "tier-filter-label";
    lbl.textContent = "Side:";
    wrap.appendChild(lbl);
    for (const s of [{ key: "white", label: "White" }, { key: "black", label: "Black" }]) {
      const btn = document.createElement("button");
      btn.className = "side-filter-btn side-" + s.key + (sideFilter.has(s.key) ? " active" : "");
      btn.dataset.side = s.key;
      btn.textContent = s.label;
      btn.title = "Toggle " + s.label + "'s openings in the rotation";
      btn.addEventListener("click", () => {
        if (sideFilter.has(s.key)) {
          // Don't let the user disable both — keeps the rotation alive.
          if (sideFilter.size > 1) sideFilter.delete(s.key);
        } else {
          sideFilter.add(s.key);
        }
        saveSideFilter();
        renderFilterBar();
        applyFilterChange();
      });
      wrap.appendChild(btn);
    }
    return wrap;
  }

  // Elo range filter — the user picks the difficulty range they want to
  // study (min and max). Combined with the audience checkboxes by AND.
  // An opening passes when its inferred Elo coverage overlaps the chosen
  // range. Two thumbs because HTML's <input type=range> is single-thumb
  // only; layered in CSS to look like a dual-handle slider.
  function createEloFilter() {
    const wrap = document.createElement("div");
    wrap.className = "elo-filter";
    const active = eloFilter != null;
    const range = active ? eloFilter : { min: 1200, max: 2000 };

    const lbl = document.createElement("span");
    lbl.className = "tier-filter-label";
    lbl.textContent = "Study range:";
    wrap.appendChild(lbl);

    const valueEl = document.createElement("span");
    valueEl.className = "elo-filter-value";
    valueEl.textContent = active ? `${range.min}–${range.max}` : "(off)";
    wrap.appendChild(valueEl);

    const sliders = document.createElement("span");
    sliders.className = "elo-filter-sliders";

    // Visible track + colored fill between the two thumbs. The two range
    // inputs are layered on top with transparent tracks so only their
    // thumbs show — the fill bar communicates the selected interval.
    const trackEl = document.createElement("span");
    trackEl.className = "elo-filter-track";
    sliders.appendChild(trackEl);
    const fillEl = document.createElement("span");
    fillEl.className = "elo-filter-fill";
    sliders.appendChild(fillEl);

    const minSlider = document.createElement("input");
    const maxSlider = document.createElement("input");
    for (const s of [minSlider, maxSlider]) {
      s.type = "range";
      s.className = "elo-filter-slider";
      s.min = "700";
      s.max = "2800";
      s.step = "50";
      s.disabled = !active;
    }
    minSlider.value = String(range.min);
    maxSlider.value = String(range.max);
    minSlider.title = "Low end of the study range";
    maxSlider.title = "High end of the study range";

    function updateFill(lo, hi) {
      const span = 2800 - 700;
      const minPct = ((lo - 700) / span) * 100;
      const maxPct = ((hi - 700) / span) * 100;
      fillEl.style.left = minPct + "%";
      fillEl.style.right = (100 - maxPct) + "%";
    }
    updateFill(range.min, range.max);

    const onInput = () => {
      let lo = parseInt(minSlider.value, 10);
      let hi = parseInt(maxSlider.value, 10);
      if (lo > hi) {
        if (document.activeElement === minSlider) hi = lo;
        else lo = hi;
        minSlider.value = String(lo);
        maxSlider.value = String(hi);
      }
      eloFilter = { min: lo, max: hi };
      valueEl.textContent = `${lo}–${hi}`;
      updateFill(lo, hi);
      saveEloFilter();
    };
    const onChange = () => applyFilterChange();
    minSlider.addEventListener("input", onInput);
    maxSlider.addEventListener("input", onInput);
    minSlider.addEventListener("change", onChange);
    maxSlider.addEventListener("change", onChange);

    sliders.appendChild(minSlider);
    sliders.appendChild(maxSlider);
    wrap.appendChild(sliders);

    const toggle = document.createElement("button");
    toggle.className = "tier-filter-bulk";
    toggle.textContent = active ? "Off" : "On";
    toggle.title = active
      ? "Disable the study-range filter"
      : "Enable the study-range filter and pick a low / high end";
    toggle.addEventListener("click", () => {
      if (eloFilter == null) eloFilter = { min: 1200, max: 2000 };
      else eloFilter = null;
      saveEloFilter();
      renderFilterBar();
      applyFilterChange();
    });
    wrap.appendChild(toggle);

    return wrap;
  }

  // ===== Practice Mode (mixed identify + setup) =====
  // Question history lets the user step back through past cards. Each entry
  // records the opening + question type chosen, plus a `graded` flag so we
  // don't double-grade SRS when reviewing.
  const questionHistory = [];
  let historyIndex = -1;
  const MAX_HISTORY = 50;

  function startPractice() {
    nextPracticeQuestion();
  }

  function nextPracticeQuestion() {
    // Walking forward through history (after using "Previous"): just reload.
    if (historyIndex < questionHistory.length - 1) {
      historyIndex++;
      loadHistoryEntry(questionHistory[historyIndex]);
      return;
    }
    // Otherwise pick a new card from the SRS scheduler and append.
    const opening = SRS.pickNext(getEligibleOpeningPool());
    // Brand-new openings always start as identify so the user sees the
    // position before being asked to reproduce it from memory.
    const isNew = !SRS.getCard(opening.name);
    let questionType;
    if (isNew) {
      questionType = "identify";
    } else {
      // Equal weight across the four practice types for seen cards.
      const types = ["identify", "setup", "play", "playmystery"];
      questionType = types[Math.floor(Math.random() * types.length)];
    }
    const entry = { opening, questionType, graded: false };
    questionHistory.push(entry);
    historyIndex = questionHistory.length - 1;
    if (questionHistory.length > MAX_HISTORY) {
      questionHistory.shift();
      historyIndex--;
    }
    loadHistoryEntry(entry);
  }

  function previousPracticeQuestion() {
    if (historyIndex <= 0) return;
    historyIndex--;
    loadHistoryEntry(questionHistory[historyIndex]);
  }

  function loadHistoryEntry(entry) {
    if (entry.questionType === "setup") loadSetupCard(entry.opening, entry);
    else if (entry.questionType === "play") loadPlayCard(entry.opening, false, entry);
    else if (entry.questionType === "playmystery") loadPlayCard(entry.opening, true, entry);
    else loadIdentifyCard(entry.opening, entry);
  }

  function loadIdentifyCard(opening, historyEntry) {
    // Replay the moves through chess.js (rather than loading the final FEN
    // directly) so the game retains a move history. Without this the
    // ←/→ arrow keys have nothing to step through after the answer is
    // revealed — game.undo() returns null on a position loaded via FEN.
    game.reset();
    let lastMove = null;
    for (const san of opening.moves) {
      const m = game.move(san, { sloppy: true });
      if (m) lastMove = { from: m.from, to: m.to };
    }
    // Random board orientation per card so the user sees positions from
    // both sides over time. Stored on the history entry so re-visits keep
    // the same view.
    const orientation = (historyEntry && historyEntry.orientation)
      || (Math.random() < 0.5 ? "white" : "black");
    if (historyEntry) historyEntry.orientation = orientation;
    if (board.orientation !== orientation) board.setOrientation(orientation);
    board.setPosition(game.board(), lastMove, { silent: true });
    updateTurnIndicator();

    const distractors = getRandomOpenings(5, opening, getFilteredOpeningPool());
    const choices = shuffle([opening, ...distractors]);

    modeState = {
      questionType: "identify",
      opening,
      choices,
      answered: false,
      // If we already graded this card on a prior visit, don't grade again.
      counted: !!(historyEntry && historyEntry.graded),
      historyEntry: historyEntry || null
    };
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
    if (!modeState.counted) {
      recordResult(modeState.opening.name, "identify", correct);
      SRS.review(modeState.opening.name, correct ? "good" : "again");
      modeState.counted = true;
      if (modeState.historyEntry) modeState.historyEntry.graded = true;
    }
    renderPanel(true);
  }

  // Convert a just-answered Identify question into a Setup-style practice
  // for the same opening. SRS already graded; this is pure practice.
  function tryPlayingMovesAfterIdentify() {
    const opening = modeState.opening;
    const historyEntry = modeState.historyEntry;
    game.reset();
    board.setPosition(game.board(), null);
    modeState = {
      questionType: "setup",
      opening,
      moveIndex: 0,
      mistakes: 0,
      complete: false,
      counted: true, // identify already graded the card
      historyEntry
    };
    updateTurnIndicator();
    renderPanel();
  }

  function loadSetupCard(opening, historyEntry) {
    game.reset();
    const orientation = (historyEntry && historyEntry.orientation)
      || (Math.random() < 0.5 ? "white" : "black");
    if (historyEntry) historyEntry.orientation = orientation;
    board.setOrientation(orientation);
    board.setPosition(game.board(), null);
    modeState = {
      questionType: "setup",
      opening,
      moveIndex: 0,
      mistakes: 0,
      complete: false,
      counted: !!(historyEntry && historyEntry.graded),
      historyEntry: historyEntry || null
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
          const wasCorrect = modeState.mistakes === 0;
          recordResult(modeState.opening.name, "setup", wasCorrect);
          SRS.review(modeState.opening.name, wasCorrect ? "good" : "again");
          if (modeState.historyEntry) modeState.historyEntry.graded = true;
        }
        flashOverlay("Correct!", "ok", 900);
      }
      renderPanel();
      return true;
    } else {
      modeState.mistakes++;
      // If the move IS a valid book move for some other opening, name it —
      // so a wrong attempt becomes a teaching moment instead of just "no".
      const newSeq = [...game.history(), move.san];
      const others = findCandidateOpenings(newSeq)
        .filter(op => op.name !== modeState.opening.name);
      let msg;
      if (others.length) {
        others.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        msg = `That's the ${others[0].name} line, not the ${modeState.opening.name}. Try again.`;
      } else {
        msg = "Not quite — that move doesn't match this opening's main line. Try again.";
      }
      flashFeedback(panelEl.querySelector(".feedback-slot"), msg, "bad");
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
      recordResult(modeState.opening.name, "setup", false);
      SRS.review(modeState.opening.name, "again");
      if (modeState.historyEntry) modeState.historyEntry.graded = true;
    }
    updateTurnIndicator();
    renderPanel();
  }

  // ===== Play mode (user plays one side, app plays the other) =====
  // When isMystery is true the opening name is hidden during play and the
  // user has to identify it from a 4-choice list at the end.
  function loadPlayCard(opening, isMystery, historyEntry) {
    game.reset();
    let userSide;
    let mysteryTarget = null;
    if (isMystery) {
      // Mystery is open-ended: no specific target shown to the user. Pick a
      // random side so they practice both colors. The "target" is the
      // opening the app aims toward — popularity-weighted random pick from
      // the whole database. The target determines where the app stops; if
      // the user deviates the app pivots to a new compatible target. Same
      // 2-ply prefix can stop early (target = Sicilian Defense) or run long
      // (target = Sicilian Najdorf), giving variety on repeat plays.
      userSide = (historyEntry && historyEntry.userSide)
        || (Math.random() < 0.5 ? "white" : "black");
      if (historyEntry) historyEntry.userSide = userSide;
      mysteryTarget = (historyEntry && historyEntry.mysteryTarget)
        || pickWeightedRandomOpening(getEligibleOpeningPool());
      if (historyEntry) historyEntry.mysteryTarget = mysteryTarget;
    } else {
      userSide = openingSide(opening).toLowerCase();
    }
    board.setOrientation(userSide);
    board.setPosition(game.board(), null);
    modeState = {
      questionType: isMystery ? "playmystery" : "play",
      isMystery,
      // For Mystery, no fixed target opening shown — matchedOpening at
      // finish time is what the user identifies.
      opening: isMystery ? null : opening,
      mysteryTarget, // hidden target the app aims toward (mystery only)
      userSide,
      moveIndex: 0,
      mistakes: 0,
      complete: false,
      // For mystery cards, "answered" tracks whether the user has picked the
      // opening name from choices yet. We grade SRS at that point (or, for
      // non-mystery play, when all moves complete).
      nameAnswered: !isMystery,
      matchedOpening: null,
      counted: !!(historyEntry && historyEntry.graded),
      historyEntry: historyEntry || null
    };
    updateTurnIndicator();
    renderPanel();
    // If user is Black, the app needs to play move 1 (a White move) first.
    if (userSide === "black") {
      setTimeout(() => playAutoMove(), 700);
    }
  }

  // Returns openings whose moves array starts with the played sequence
  // (i.e. the played sequence is a prefix of, or equal to, the opening's
  // book line). Used by Mystery to validate book moves and pick responses.
  function findCandidateOpenings(playedSans) {
    return OPENINGS.filter(op => {
      if (op.moves.length < playedSans.length) return false;
      for (let i = 0; i < playedSans.length; i++) {
        if (!sansEqual(op.moves[i], playedSans[i])) return false;
      }
      return true;
    });
  }

  // Pick a popularity-weighted random opening from `pool`. Squared weights
  // bias toward common openings without pushing rare ones to zero.
  function pickWeightedRandomOpening(pool) {
    if (!pool || pool.length === 0) return null;
    const weights = pool.map(op => Math.pow(op.popularity || 1, 2));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function isPrefixOf(short, long) {
    if (short.length > long.length) return false;
    for (let i = 0; i < short.length; i++) {
      if (!sansEqual(short[i], long[i])) return false;
    }
    return true;
  }

  function sameSeq(a, b) {
    return a.length === b.length && isPrefixOf(a, b);
  }

  // Openings whose book line extends past `opening`'s — i.e. real follow-up
  // variations the user might walk into next. Sorted by how many extra
  // moves are needed to reach them (shortest extensions first), then by
  // popularity within the same depth. Capped at `limit`.
  function findContinuationOpenings(opening, limit) {
    const out = OPENINGS.filter(op => {
      if (op.name === opening.name) return false;
      if (op.moves.length <= opening.moves.length) return false;
      return isPrefixOf(opening.moves, op.moves);
    });
    out.sort((a, b) => {
      if (a.moves.length !== b.moves.length) return a.moves.length - b.moves.length;
      return (b.popularity || 0) - (a.popularity || 0);
    });
    return out.slice(0, limit || 8);
  }

  // Renders the "Continues into" pill list. Includes the answered opening
  // itself as the first pill (highlighted) so the user can return to it
  // after browsing continuations. Empty when nothing extends past the
  // current line. Pills are buttons with data-continuation-name; a single
  // delegated click handler on panelEl handles the navigation.
  function renderContinuationsHtml(opening) {
    const conts = findContinuationOpenings(opening);
    if (!conts.length) {
      // Leaf line — no longer-prefix opening exists in the database. Say
      // so explicitly rather than rendering nothing, otherwise the absence
      // is hard to distinguish from a layout glitch.
      return `
        <div class="continuations">
          <div class="continuations-label">Continues into</div>
          <div class="continuations-empty">No further named variations from this position in the database.</div>
        </div>
      `;
    }
    const all = [opening, ...conts];
    const items = all.map((op, i) => `
      <button class="continuation-pill${i === 0 ? " active" : ""}" data-continuation-name="${escapeHtml(op.name)}" title="Show ${escapeHtml(op.name)} on the board">
        <span class="eco">${escapeHtml(op.eco || "")}</span>${escapeHtml(op.name)}
      </button>
    `).join("");
    return `
      <div class="continuations">
        <div class="continuations-label">Click to view position</div>
        <div class="continuations-list">${items}</div>
      </div>
    `;
  }

  // Load `name`'s book-line position onto the board without changing the
  // current SRS card. Used by the continuation pills so the user can browse
  // related lines after revealing a card. Highlights the active pill.
  function previewOpeningPosition(name) {
    const op = OPENINGS.find(o => o.name === name);
    if (!op) return;
    let fen;
    try { fen = fenFromMoves(op.moves); } catch (e) { return; }
    game.load(fen);
    board.setPosition(game.board(), null);
    updateTurnIndicator();
    // Re-trigger engine analysis on the new position so the eval bar /
    // best-move arrow follow the user's browsing.
    if (showEngine || isQuestionRevealed()) triggerAnalysis();
    // Highlight whichever pill matches the position now on the board.
    panelEl.querySelectorAll(".continuation-pill").forEach(p => {
      p.classList.toggle("active", p.dataset.continuationName === name);
    });
  }

  // Delegated click handler for continuation pills — one listener at the
  // panel level so each render doesn't have to wire individual buttons.
  panelEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".continuation-pill");
    if (!btn) return;
    const name = btn.dataset.continuationName;
    if (name) previewOpeningPosition(name);
  });

  function handlePlayMoveAttempt({ from, to }) {
    if (modeState.complete) return false;
    // Only let the user move when it's their turn — during the brief delay
    // between user-move and auto-played opponent-reply, this returns false
    // because game.turn() will be the opponent's color.
    const userTurn = modeState.userSide === "white" ? "w" : "b";
    if (game.turn() !== userTurn) return false;

    const probe = new Chess(game.fen());
    const move = probe.move({ from, to, promotion: "q" });
    if (!move) return false;

    if (modeState.isMystery) {
      // Open-ended: any move that's a prefix of some opening in the
      // database — but constrained to openings in the user's enabled
      // tiers so Mystery only ever lands on tiers they're studying.
      const playedSans = game.history();
      const newSeq = [...playedSans, move.san];
      const allCandidates = findCandidateOpenings(newSeq);
      const candidates = allCandidates.filter(op => tierFilter.has(op.tier || "C"));
      if (candidates.length === 0) {
        modeState.mistakes++;
        const msg = allCandidates.length === 0
          ? "Not a standard book move from here — try something more common."
          : "That move only leads into tiers you've turned off — try a different one.";
        flashFeedback(panelEl.querySelector(".feedback-slot"), msg, "bad");
        return false;
      }
      const real = game.move({ from, to, promotion: "q" });
      modeState.moveIndex++;
      modeState.matchedOpening = findMatchingOpening();
      board.setPosition(game.board(), { from: real.from, to: real.to });
      updateTurnIndicator();
      // If the user just deviated from the app's target line, pivot the
      // target to one of the still-enabled candidates.
      const target = modeState.mysteryTarget;
      if (!target || !isPrefixOf(newSeq, target.moves) || !tierFilter.has(target.tier || "C")) {
        const continuing = candidates.filter(op => op.moves.length > newSeq.length);
        modeState.mysteryTarget = pickWeightedRandomOpening(
          continuing.length ? continuing : candidates
        );
      }
      // Stop condition: the played sequence reached the target's full line.
      if (sameSeq(newSeq, modeState.mysteryTarget.moves)) {
        setTimeout(() => finishMysteryPlay(), 700);
      } else {
        setTimeout(() => playAutoMove(), 600);
      }
      renderPanel();
      return true;
    }

    // Named "play" mode: user must follow the pre-picked opening's line.
    const expectedSan = modeState.opening.moves[modeState.moveIndex];
    if (!expectedSan) return false;
    if (move.san === expectedSan || sansEqual(move.san, expectedSan)) {
      const real = game.move({ from, to, promotion: "q" });
      modeState.moveIndex++;
      board.setPosition(game.board(), { from: real.from, to: real.to });
      updateTurnIndicator();
      if (modeState.moveIndex >= modeState.opening.moves.length) {
        finishPlay();
      } else {
        setTimeout(() => playAutoMove(), 600);
      }
      renderPanel();
      return true;
    }
    modeState.mistakes++;
    // Same teaching nudge as Setup: if the move is in another opening's
    // book line, name that opening.
    const otherSeq = [...game.history(), move.san];
    const others = findCandidateOpenings(otherSeq)
      .filter(op => op.name !== modeState.opening.name);
    let msg;
    if (others.length) {
      others.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      msg = `That's the ${others[0].name} line, not the ${modeState.opening.name}. Try again.`;
    } else {
      msg = "Not the book move for this opening — try again.";
    }
    flashFeedback(panelEl.querySelector(".feedback-slot"), msg, "bad");
    return false;
  }

  function playAutoMove() {
    if (modeState.complete) return;

    let responseSan;
    if (modeState.isMystery) {
      const playedSans = game.history();
      const target = modeState.mysteryTarget;
      // If we're not on a continuing target (e.g. the very first auto-move
      // when user is Black), or the current target is in a now-excluded
      // tier, pick a fresh one from the user's enabled tiers.
      const targetOk = target
        && isPrefixOf(playedSans, target.moves)
        && playedSans.length < target.moves.length
        && tierFilter.has(target.tier || "C");
      if (!targetOk) {
        const candidates = findCandidateOpenings(playedSans)
          .filter(op => op.moves.length > playedSans.length)
          .filter(op => tierFilter.has(op.tier || "C"));
        if (candidates.length === 0) {
          finishMysteryPlay();
          return;
        }
        modeState.mysteryTarget = pickWeightedRandomOpening(candidates);
      }
      responseSan = modeState.mysteryTarget.moves[playedSans.length];
    } else {
      responseSan = modeState.opening.moves[modeState.moveIndex];
      if (!responseSan) return;
    }

    const m = game.move(responseSan, { sloppy: true });
    if (!m) return;
    modeState.moveIndex++;
    if (modeState.isMystery) {
      modeState.matchedOpening = findMatchingOpening();
    }
    board.setPosition(game.board(), { from: m.from, to: m.to });
    updateTurnIndicator();
    if (modeState.isMystery && sameSeq(game.history(), modeState.mysteryTarget.moves)) {
      // Target's full line played — auto-finish so the user can identify it.
      setTimeout(() => finishMysteryPlay(), 500);
    } else if (!modeState.isMystery && modeState.moveIndex >= modeState.opening.moves.length) {
      finishPlay();
    }
    renderPanel();
  }

  // User clicked "Done — identify" in Mystery mode. Lock in the matched
  // opening and surface the 4-choice identification panel.
  function finishMysteryPlay() {
    modeState.complete = true;
    modeState.matchedOpening = findMatchingOpening();
    renderPanel();
  }

  // Handle the end of the move sequence. For non-mystery play this is also
  // where SRS gets graded. For mystery, grading waits until the user picks
  // the opening name.
  function finishPlay() {
    modeState.complete = true;
    if (!modeState.isMystery && !modeState.counted) {
      modeState.counted = true;
      const wasCorrect = modeState.mistakes === 0;
      recordResult(modeState.opening.name, "play", wasCorrect);
      SRS.review(modeState.opening.name, wasCorrect ? "good" : "again");
      if (modeState.historyEntry) modeState.historyEntry.graded = true;
    }
    flashOverlay("Done!", "ok", 700);
  }

  function answerPlayMystery(choice, btnEl) {
    if (modeState.nameAnswered) return;
    modeState.nameAnswered = true;
    // The opening to identify is whichever one the played sequence ended on
    // (Mystery is open-ended, so this is determined at finish time, not at
    // card selection time).
    const target = modeState.matchedOpening;
    const nameCorrect = !!(target && choice.name === target.name);
    const buttons = panelEl.querySelectorAll(".choice");
    buttons.forEach(b => {
      b.disabled = true;
      if (target && b.dataset.name === target.name) b.classList.add("correct");
      else if (b === btnEl && !nameCorrect) b.classList.add("incorrect");
    });
    if (!modeState.counted && target) {
      modeState.counted = true;
      recordResult(target.name, "playmystery", nameCorrect);
      SRS.review(target.name, nameCorrect ? "good" : "again");
      if (modeState.historyEntry) modeState.historyEntry.graded = true;
    }
    // Stash the resolved opening on modeState so subsequent renders show the
    // pills/description for what was actually played.
    modeState.opening = target;
    renderPanel();
  }

  function playShowSolution() {
    if (modeState.complete) return;
    while (modeState.moveIndex < modeState.opening.moves.length) {
      const san = modeState.opening.moves[modeState.moveIndex];
      const m = game.move(san, { sloppy: true });
      if (!m) break;
      modeState.moveIndex++;
      board.setPosition(game.board(), { from: m.from, to: m.to });
    }
    modeState.mistakes = Math.max(modeState.mistakes, 1);
    finishPlay();
    updateTurnIndicator();
    renderPanel();
  }

  // ===== Explore Mode =====
  function startExplore() {
    modeState = { selected: null, ply: 0, query: "", freestyle: false };
    selectExplore(OPENINGS[0]);
  }

  function selectExplore(opening) {
    modeState.selected = opening;
    modeState.ply = opening.moves.length;
    modeState.freestyle = false;
    applyExploreState();
    renderPanel();
  }

  function applyExploreState() {
    if (modeState.freestyle) return; // game state already reflects played moves
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
    if (modeState.freestyle) {
      // In freestyle, ←/→ undo/redo via chess.js history.
      if (delta < 0) {
        const m = game.undo();
        if (!m) return;
        modeState.exploreRedoStack = modeState.exploreRedoStack || [];
        modeState.exploreRedoStack.push(m);
      } else if (delta > 0) {
        const m = modeState.exploreRedoStack && modeState.exploreRedoStack.pop();
        if (!m) return;
        game.move({ from: m.from, to: m.to, promotion: m.promotion });
      } else {
        // up/down jumps: jump to start (delta -Infinity) or end (Infinity)
        return;
      }
      const last = game.history({ verbose: true }).slice(-1)[0];
      modeState.selected = findMatchingOpening();
      board.setPosition(game.board(), last ? { from: last.from, to: last.to } : null);
      updateTurnIndicator();
      renderPanel();
      return;
    }
    if (!modeState.selected) return;
    const max = modeState.selected.moves.length;
    modeState.ply = Math.max(0, Math.min(max, modeState.ply + delta));
    applyExploreState();
    renderPanel();
  }

  // Free play: any legal move drops us into "freestyle" mode where the panel
  // shows the played moves and whatever opening (if any) the position
  // matches. Selecting from the openings list at the bottom or hitting Reset
  // exits freestyle.
  function handleExploreMoveAttempt({ from, to }) {
    const m = game.move({ from, to, promotion: "q" });
    if (!m) return false;
    modeState.freestyle = true;
    modeState.selected = findMatchingOpening();
    modeState.exploreRedoStack = []; // a new branch wipes redo history
    board.setPosition(game.board(), { from: m.from, to: m.to });
    updateTurnIndicator();
    renderPanel();
    return true;
  }

  // ===== Tricks Mode =====
  // Each trick is its own SRS card, keyed by "trick:<id>" so it doesn't
  // collide with openings. The pool exposed to SRS looks like an opening
  // (has .name) so SRS.pickNext / SRS.getCard work as-is.
  const TRICKS_LIST = (typeof window !== "undefined" && window.TRICKS) || [];
  function buildTrickPool() {
    return TRICKS_LIST.map(t => ({ ...t, name: "trick:" + t.id }));
  }

  function startTricks() {
    nextTrick();
  }

  function nextTrick() {
    const pool = buildTrickPool();
    if (!pool.length) {
      panelEl.innerHTML = '<div class="subtitle">No tricks loaded.</div>';
      return;
    }
    const picked = SRS.pickNext(pool);
    loadTrick(picked);
  }

  function loadTrick(trick) {
    game.reset();
    let last = null;
    for (const san of trick.setupMoves) {
      const m = game.move(san, { sloppy: true });
      if (m) last = { from: m.from, to: m.to };
    }
    board.setOrientation(trick.userColor);
    board.setPosition(game.board(), last, { silent: true });
    updateTurnIndicator();
    modeState = {
      trick,
      complete: false,
      mistakes: 0,
      counted: false,
      hintShown: false
    };
    renderPanel();
  }

  // The chess.js move() call only auto-promotes to queen. For tricks that
  // expect underpromotion (e.g. Lasker Trap's fxg1=N+) we sniff the
  // expected SAN to pick the right piece. Falls back to queen otherwise.
  function inferPromotionPiece(trick) {
    const expected = [trick.userMove, ...(trick.alternatives || [])].join(" ");
    const m = /=([QRBN])/.exec(expected);
    return m ? m[1].toLowerCase() : "q";
  }

  function handleTrickMoveAttempt({ from, to }) {
    if (!modeState.trick || modeState.complete) return false;
    const promotion = inferPromotionPiece(modeState.trick);
    const m = game.move({ from, to, promotion });
    if (!m) return false;
    const expected = [modeState.trick.userMove, ...(modeState.trick.alternatives || [])];
    const correct = expected.some(s => sansEqual(s, m.san));
    board.setPosition(game.board(), { from: m.from, to: m.to });
    updateTurnIndicator();
    if (correct) {
      modeState.complete = true;
      modeState.completedBy = modeState.hintShown ? "hinted" : "correct";
      modeState.lastUserSan = m.san;
      if (!modeState.counted) {
        modeState.counted = true;
        const trickKey = "trick:" + modeState.trick.id;
        const wasClean = modeState.mistakes === 0;
        recordResult(trickKey, "trick", wasClean);
        SRS.review(trickKey, wasClean ? "good" : "again");
      }
      // Visible "Correct!" flash on the board so the user knows the move
      // landed — the panel transitions immediately after.
      flashOverlay("Correct!", "ok", 900);
      renderPanel();
      if (modeState.trick.continuation && modeState.trick.continuation.length) {
        setTimeout(() => playTrickContinuation(0), 700);
      }
      return true;
    } else {
      // Undo so the user can try again from the same position.
      game.undo();
      board.setPosition(game.board(), null);
      modeState.mistakes++;
      const slot = panelEl.querySelector(".feedback-slot");
      flashFeedback(slot, `${m.san} isn't the trick refutation — try again, or hit Show solution.`, "bad");
      return false;
    }
  }

  function playTrickContinuation(idx) {
    if (!modeState.trick || !modeState.complete) return;
    const cont = modeState.trick.continuation || [];
    if (idx >= cont.length) return;
    const m = game.move(cont[idx], { sloppy: true });
    if (!m) return;
    board.setPosition(game.board(), { from: m.from, to: m.to });
    updateTurnIndicator();
    setTimeout(() => playTrickContinuation(idx + 1), 650);
  }

  function trickShowSolution() {
    if (!modeState.trick || modeState.complete) return;
    const trick = modeState.trick;
    const promotion = inferPromotionPiece(trick);
    // Parse the expected SAN via chess.js so promotion / disambiguation
    // are handled correctly.
    const m = game.move(trick.userMove, { sloppy: true });
    if (!m) return;
    modeState.complete = true;
    modeState.completedBy = "solution";
    modeState.mistakes = Math.max(modeState.mistakes, 1);
    modeState.lastUserSan = m.san;
    board.setPosition(game.board(), { from: m.from, to: m.to });
    updateTurnIndicator();
    if (!modeState.counted) {
      modeState.counted = true;
      const trickKey = "trick:" + trick.id;
      recordResult(trickKey, "trick", false);
      SRS.review(trickKey, "again");
    }
    renderPanel();
    if (trick.continuation && trick.continuation.length) {
      setTimeout(() => playTrickContinuation(0), 700);
    }
  }

  function trickHint() {
    if (!modeState.trick || modeState.complete) return;
    const trick = modeState.trick;
    // Resolve the user move via chess.js to get from/to without playing it.
    const probe = new Chess(game.fen());
    const m = probe.move(trick.userMove, { sloppy: true });
    if (m) board.showHint(m.from);
    modeState.hintShown = true;
    modeState.mistakes = Math.max(modeState.mistakes, 1);
  }

  function renderTricksPanel() {
    const trick = modeState.trick;
    if (!trick) return;
    panelEl.innerHTML = "";

    const h = document.createElement("h2");
    if (modeState.complete) {
      // The h2 is now the explicit outcome banner so it's the first thing
      // the user sees when the panel updates. Green check / orange warn /
      // matches the visual style of correct / incorrect feedback elsewhere.
      if (modeState.completedBy === "correct") {
        h.innerHTML = `<span class="trick-outcome ok">✓ Correct!</span>`;
      } else if (modeState.completedBy === "hinted") {
        h.innerHTML = `<span class="trick-outcome warn">✓ Correct (with a hint)</span>`;
      } else {
        h.innerHTML = `<span class="trick-outcome bad">✗ Solution shown</span>`;
      }
    } else {
      h.textContent = trick.category === "attack"
        ? "Find the punishment"
        : "Don't fall for it";
    }
    panelEl.appendChild(h);

    const sub = document.createElement("div");
    sub.className = "subtitle";
    const turn = game.turn() === "w" ? "White" : "Black";
    if (modeState.complete) {
      sub.textContent = trick.name + (trick.eco ? " (" + trick.eco + ")" : "");
    } else {
      sub.textContent = `${turn} to move — make your move on the board.`;
    }
    panelEl.appendChild(sub);

    if (modeState.complete) {
      const fb = document.createElement("div");
      fb.className = "feedback info";
      const catTag = trick.category === "attack"
        ? `<span class="trick-tag trick-attack">Attack</span>`
        : `<span class="trick-tag trick-defend">Defend</span>`;
      const tierTag = `<span class="tier-pill tier-${trick.tier || "C"}">${trick.tier || "C"}</span>`;
      fb.innerHTML = `
        <div class="trick-header">${catTag} ${tierTag}</div>
        <div class="trick-desc">${escapeHtml(trick.description)}</div>
        <div class="trick-why"><strong>Why it works:</strong> ${escapeHtml(trick.why || "")}</div>
        <div class="moves-line"><strong>Full line:</strong> ${formatNumberedSan([...trick.setupMoves, modeState.lastUserSan || trick.userMove, ...(trick.continuation || [])])}</div>
      `;
      panelEl.appendChild(fb);
    } else {
      // Pre-answer: short prompt without revealing the trick's name.
      const prompt = document.createElement("div");
      prompt.className = "trick-prompt";
      const catTag = trick.category === "attack"
        ? `<span class="trick-tag trick-attack">Attack</span>`
        : `<span class="trick-tag trick-defend">Defend</span>`;
      prompt.innerHTML = `
        <div class="trick-prompt-tag">${catTag}</div>
        <div>${escapeHtml(trick.description)}</div>
      `;
      panelEl.appendChild(prompt);
    }

    const fbSlot = document.createElement("div");
    fbSlot.className = "feedback-slot";
    panelEl.appendChild(fbSlot);

    const actions = document.createElement("div");
    actions.className = "actions";

    if (!modeState.complete) {
      const hint = document.createElement("button");
      hint.className = "btn";
      hint.textContent = "Hint";
      hint.addEventListener("click", trickHint);
      actions.appendChild(hint);

      const sol = document.createElement("button");
      sol.className = "btn";
      sol.textContent = "Show solution";
      sol.addEventListener("click", trickShowSolution);
      actions.appendChild(sol);
    }

    const next = document.createElement("button");
    next.className = "btn primary";
    next.textContent = modeState.complete ? "Next trick →" : "Skip";
    next.addEventListener("click", () => {
      if (!modeState.complete && modeState.trick) {
        recordResult("trick:" + modeState.trick.id, "trick", false);
        SRS.review("trick:" + modeState.trick.id, "again");
      }
      nextTrick();
    });
    actions.appendChild(next);

    panelEl.appendChild(actions);
  }

  // ===== Stats blocks (inlined into the Practice panel) =====

  const ECO_FAMILY_LABELS = {
    A: "Flank openings",
    B: "Semi-open games",
    C: "Open games",
    D: "Closed games",
    E: "Indian defenses"
  };

  function renderPillKey() {
    const wrap = document.createElement("div");
    wrap.className = "stats-block";
    wrap.innerHTML = `
      <div class="stats-h3">Opening pill key</div>
      <div class="subtitle" style="margin-bottom:10px">
        Three small pills appear next to each opening's name once you've answered.
        Hover any pill in the Practice or Analysis panels for the explanation; this
        section is the at-a-glance reference.
      </div>
      <div class="key-row"><span class="tier-pill tier-S">S</span> ${escapeHtml(TIER_INFO.S.desc)}</div>
      <div class="key-row"><span class="tier-pill tier-A">A</span> ${escapeHtml(TIER_INFO.A.desc)}</div>
      <div class="key-row"><span class="tier-pill tier-B">B</span> ${escapeHtml(TIER_INFO.B.desc)}</div>
      <div class="key-row"><span class="tier-pill tier-C">C</span> ${escapeHtml(TIER_INFO.C.desc)}</div>
      <div class="key-row"><span class="tier-pill tier-D">D</span> ${escapeHtml(TIER_INFO.D.desc)}</div>
      <div class="key-row"><span class="tier-pill tier-F">F</span> ${escapeHtml(TIER_INFO.F.desc)}</div>
      <div class="key-row"><span class="popularity-pill"><span class="stars-on">★★★★</span></span> ${escapeHtml(POPULARITY_DESCS[4])}</div>
      <div class="key-row"><span class="popularity-pill"><span class="stars-on">★★★</span><span class="stars-off">☆</span></span> ${escapeHtml(POPULARITY_DESCS[3])}</div>
      <div class="key-row"><span class="popularity-pill"><span class="stars-on">★★</span><span class="stars-off">☆☆</span></span> ${escapeHtml(POPULARITY_DESCS[2])}</div>
      <div class="key-row"><span class="popularity-pill"><span class="stars-on">★</span><span class="stars-off">☆☆☆</span></span> ${escapeHtml(POPULARITY_DESCS[1])}</div>
      <div class="key-row"><span class="audience-tag aud-beginner">Beginner</span> Beginner-friendly — clear plans, low risk of immediate disaster, easy to learn the typical structures.</div>
      <div class="key-row"><span class="audience-tag aud-intermediate">Intermediate</span> Intermediate-friendly — sound theoretical foundations and manageable complexity for a player past the basics.</div>
      <div class="key-row"><span class="audience-tag aud-gm">GM</span> Played at the top level — regularly appears in modern grandmaster practice.</div>
      <div class="key-row"><span class="eval-pill eval-equal">+0.20</span> Stockfish's evaluation at depth 14 of the position after the opening's main line. Positive favors White; negative favors Black; ≈0 means the position is balanced.</div>
    `;
    return wrap;
  }

  function renderEcoKey() {
    const wrap = document.createElement("div");
    wrap.className = "stats-block";
    wrap.innerHTML = `
      <div class="stats-h3">What's the ECO code?</div>
      <div class="subtitle" style="margin-bottom:10px">
        ECO (Encyclopedia of Chess Openings) is the standard chess classification
        system. Every named opening gets a code from <code>A00</code> to <code>E99</code>.
        The letter is the family; the number narrows it down.
      </div>
      <div class="eco-key-row"><strong>A</strong> — Flank openings: 1.c4 (English), 1.Nf3, 1.b3, etc. Anything not 1.e4 or 1.d4-with-d5/Nf6.</div>
      <div class="eco-key-row"><strong>B</strong> — Semi-open games: 1.e4 with Black not playing 1…e5 (Sicilian, French, Caro-Kann).</div>
      <div class="eco-key-row"><strong>C</strong> — Open games + French: 1.e4 e5 (Italian, Spanish, Petroff…) plus the French Defense.</div>
      <div class="eco-key-row"><strong>D</strong> — Closed + semi-Closed: 1.d4 d5 (Queen's Gambit, Slav) and other 1.d4 lines without an Indian setup.</div>
      <div class="eco-key-row"><strong>E</strong> — Indian defenses: 1.d4 Nf6 lines (King's Indian, Nimzo-Indian, Queen's Indian, Catalan).</div>
    `;
    return wrap;
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

  let _analysisDispose = null;
  function triggerAnalysis() {
    const slot = panelEl.querySelector(".eval-slot");
    if (!slot) return; // nothing to populate, no point firing the engine
    if (!engine.ready) {
      slot.innerHTML = '<div class="feedback bad">Stockfish is not loaded — analysis unavailable.</div>';
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
    if (currentMode === "practice") {
      // Once the question is revealed (Identify answered / Setup complete /
      // Play complete / Mystery identified), the user can freely play moves
      // past the book line. The engine eval/arrow follow along (auto-on
      // post-reveal), so this doubles as inline analysis.
      if (isQuestionRevealed()) return handleFreeMoveAttempt(move);
      if (modeState.questionType === "setup") return handleSetupMoveAttempt(move);
      if (modeState.questionType === "play" || modeState.questionType === "playmystery") return handlePlayMoveAttempt(move);
    }
    if (currentMode === "tricks") return handleTrickMoveAttempt(move);
    if (currentMode === "explore") return handleExploreMoveAttempt(move);
    return false;
  }

  // Post-completion free play: any legal move is accepted so the user can
  // explore continuations from the resulting position. Triggers engine
  // analysis immediately (eval section is already auto-rendered post-reveal).
  // If the user picks up a piece that belongs to the side whose turn it
  // ISN'T, we flip chess.js's active color so the move can land — otherwise
  // chess.js rejects opposite-color moves and "free play" doesn't feel free.
  function handleFreeMoveAttempt({ from, to }) {
    // Post-reveal free play follows normal turn alternation — sides take
    // turns. (Previously a turn-flip workaround let the user keep playing
    // one color repeatedly, which made every game state confusing.)
    const m = game.move({ from, to, promotion: "q" });
    if (!m) return false;
    // A new move from a stepped-back position branches off — drop forward
    // history so → doesn't replay a stale line.
    if (modeState.practiceRedoStack) modeState.practiceRedoStack = [];
    modeState.lastMove = { from: m.from, to: m.to };
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
    return true;
  }

  // ===== UI rendering =====
  function renderPanel(isAfterAnswer) {
    updateCurrentOpeningLabel();
    updateGameScoreLabel();
    if (currentMode === "practice") {
      if (modeState.questionType === "setup") renderSetupPanel();
      else if (modeState.questionType === "play" || modeState.questionType === "playmystery") renderPlayPanel();
      else renderIdentifyPanel(isAfterAnswer);
      // Tier and audience filters now live in the topbar filter strip
      // (renderFilterBar), not inside the right panel.

      // Pin the navigation actions row (Previous / Skip / Next / Try-playing /
      // Hint / Show solution) at the top of the panel so it always lives in
      // the same position regardless of what's revealed below — without this
      // it kept shifting depending on whether feedback / move list / etc. were
      // rendered.
      const actionsEl = panelEl.querySelector(".actions");
      if (actionsEl) panelEl.insertBefore(actionsEl, panelEl.firstChild);

      // Engine analysis section (toggle + eval slot) is appended at the
      // bottom of the practice content, above the stats divider.
      appendEngineAnalysisSection();
      // Wrap everything the practice render just produced into a single
      // div so we can give it a min-height that fills the visible panel
      // area. Stats rendered after the wrap end up below the fold.
      const wrap = document.createElement("div");
      wrap.className = "panel-practice";
      while (panelEl.firstChild) wrap.appendChild(panelEl.firstChild);
      panelEl.appendChild(wrap);
      appendInlineStats();
      // Reset scroll to top on every new render so the user sees the
      // question, not where they happened to leave the previous scroll.
      panelEl.scrollTop = 0;
      // Kick off engine analysis on the current position if the user has
      // toggled it on, or auto-on once the question has been revealed.
      // Otherwise clear any leftover arrow + hide the side-of-board eval bar.
      if (showEngine || isQuestionRevealed()) {
        triggerAnalysis();
      } else {
        board.clearEngineArrow();
        updateVerticalEvalBar(50, "", false);
      }
      syncEngineToggleButton();
      return;
    }
    if (currentMode === "tricks") return renderTricksPanel();
    if (currentMode === "explore") return renderExplorePanel();
  }

  // Renders an eval-slot for triggerAnalysis to populate when engine
  // analysis is active (or auto-on post-reveal). The toggle button itself
  // lives in the board-controls row beside Flip/Reset, not here.
  function appendEngineAnalysisSection() {
    const revealed = isQuestionRevealed();
    if (!showEngine && !revealed) return;
    const wrap = document.createElement("div");
    wrap.className = "engine-section";
    const slot = document.createElement("div");
    slot.className = "eval-slot";
    wrap.appendChild(slot);
    panelEl.appendChild(wrap);
  }

  // Renders the tier-filter row: a small inline group of S/A/B/C/D/F
  // pill buttons. Clicking a tier toggles it in the practice rotation.
  // The last enabled tier can't be turned off (would leave nothing to study).
  function createTierFilter() {
    const wrap = document.createElement("div");
    wrap.className = "tier-filter";
    const lbl = document.createElement("span");
    lbl.className = "tier-filter-label";
    lbl.textContent = "Study tiers:";
    wrap.appendChild(lbl);
    for (const t of ["S", "A", "B", "C", "D", "F"]) {
      const btn = document.createElement("button");
      btn.className = "tier-filter-btn" + (tierFilter.has(t) ? " active" : "");
      btn.dataset.tier = t;
      btn.textContent = t;
      btn.title = "Toggle " + t + "-tier openings in the practice rotation";
      btn.addEventListener("click", () => {
        if (tierFilter.has(t)) {
          if (tierFilter.size > 1) tierFilter.delete(t);
        } else {
          tierFilter.add(t);
        }
        saveTierFilter();
        renderFilterBar();
        applyFilterChange();
      });
      wrap.appendChild(btn);
    }
    // Bulk-toggle helpers — All enables every tier; None resets to just S
    // (we keep at least one so the rotation never starves).
    const all = document.createElement("button");
    all.className = "tier-filter-bulk";
    all.textContent = "All";
    all.title = "Enable every tier";
    all.addEventListener("click", () => {
      tierFilter = new Set(["S", "A", "B", "C", "D", "F"]);
      saveTierFilter();
      renderFilterBar();
      applyFilterChange();
    });
    wrap.appendChild(all);
    const none = document.createElement("button");
    none.className = "tier-filter-bulk";
    none.textContent = "None";
    none.title = "Disable all tiers (keeps S so the rotation has something to study)";
    none.addEventListener("click", () => {
      tierFilter = new Set(["S"]);
      saveTierFilter();
      renderFilterBar();
      applyFilterChange();
    });
    wrap.appendChild(none);
    return wrap;
  }

  // Renders the audience-filter row (Beginner / Intermediate / GM).
  // Empty selection means "no audience filter" (i.e. tier filter only).
  function createAudienceFilter() {
    const wrap = document.createElement("div");
    wrap.className = "audience-filter";
    const lbl = document.createElement("span");
    lbl.className = "tier-filter-label";
    lbl.textContent = "Audience:";
    wrap.appendChild(lbl);
    const types = [
      { key: "beginner", label: "Beginner", cls: "aud-beginner" },
      { key: "intermediate", label: "Intermediate", cls: "aud-intermediate" },
      { key: "gm", label: "GM", cls: "aud-gm" }
    ];
    for (const t of types) {
      const btn = document.createElement("button");
      btn.className = "audience-filter-btn " + t.cls + (audienceFilter.has(t.key) ? " active" : "");
      btn.dataset.audience = t.key;
      btn.textContent = t.label;
      btn.title = "Toggle " + t.label.toLowerCase() + "-friendly openings in the practice rotation";
      btn.addEventListener("click", () => {
        if (audienceFilter.has(t.key)) audienceFilter.delete(t.key);
        else audienceFilter.add(t.key);
        saveAudienceFilter();
        renderFilterBar();
        applyFilterChange();
      });
      wrap.appendChild(btn);
    }
    const all = document.createElement("button");
    all.className = "tier-filter-bulk";
    all.textContent = "All";
    all.addEventListener("click", () => {
      audienceFilter = new Set(["beginner", "intermediate", "gm"]);
      saveAudienceFilter();
      renderFilterBar();
      applyFilterChange();
    });
    wrap.appendChild(all);
    const none = document.createElement("button");
    none.className = "tier-filter-bulk";
    none.textContent = "None";
    none.title = "Clear the audience filter (only the tier filter remains)";
    none.addEventListener("click", () => {
      audienceFilter = new Set();
      saveAudienceFilter();
      renderFilterBar();
      applyFilterChange();
    });
    wrap.appendChild(none);
    return wrap;
  }

  // Update the small engine toggle button in the board-controls row to
  // reflect the current state.
  function syncEngineToggleButton() {
    const btn = document.getElementById("engine-toggle");
    if (!btn) return;
    const revealed = isQuestionRevealed();
    const effectiveShow = showEngine || revealed;
    btn.classList.toggle("active", effectiveShow);
    if (revealed && !showEngine) {
      btn.textContent = "Engine: auto";
      btn.title = "Engine analysis is auto-on after a question is revealed";
    } else {
      btn.textContent = "Engine: " + (showEngine ? "on" : "off");
      btn.title = "Toggle engine analysis (eval bar + best move arrow)";
    }
  }

  function isQuestionRevealed() {
    if (currentMode !== "practice") return false;
    const t = modeState.questionType;
    if (t === "identify") return !!modeState.answered;
    if (t === "setup") return !!modeState.complete;
    if (t === "play") return !!modeState.complete;
    if (t === "playmystery") return !!(modeState.complete && modeState.nameAnswered);
    return false;
  }

  // Stats now live inline at the bottom of the Practice panel rather than in
  // a separate tab. Reuses the same block builders the old Stats tab used.
  function appendInlineStats() {
    const sep = document.createElement("div");
    sep.className = "stats-divider";
    sep.innerHTML = `<span>Your progress</span>`;
    panelEl.appendChild(sep);

    const deck = SRS.deckStats(OPENINGS);
    const fc = SRS.forecast(OPENINGS);
    const hardest = SRS.hardest(OPENINGS, 5);
    const eco = SRS.byEco(OPENINGS);
    const tier = SRS.byTier(OPENINGS);
    const perOp = SRS.perOpening(OPENINGS);
    panelEl.appendChild(renderDeckSummary(deck));
    panelEl.appendChild(renderForecast(fc));
    panelEl.appendChild(renderTierBreakdown(tier));
    panelEl.appendChild(renderEcoBreakdown(eco));
    panelEl.appendChild(renderHardest(hardest));
    panelEl.appendChild(renderPerOpening(perOp));
    panelEl.appendChild(renderPillKey());
    panelEl.appendChild(renderEcoKey());
  }

  // Sync controls live in their own section, separate from progress stats.
  function appendSyncSection() {
    const sep = document.createElement("div");
    sep.className = "stats-divider";
    sep.innerHTML = `<span>Settings &amp; sync</span>`;
    panelEl.appendChild(sep);
    panelEl.appendChild(renderProgressSync());
  }

  // Persisted-state keys we round-trip in the JSON export — SRS data plus
  // the user's preferences. Score is intentionally session-only and not
  // exported.
  const SYNC_KEYS = [
    "chess-openings-trainer.srs",
    "chess-openings-trainer.show-engine",
    "chess-openings-trainer.tier-filter",
    "chess-openings-trainer.audience-filter",
    "chess-openings-trainer.side-filter",
    "chess-openings-trainer.elo-filter"
  ];
  const SYNC_FOLDER_KEY = "chess-openings-trainer.sync-folder";
  const SYNC_LAST_TS_KEY = "chess-openings-trainer.sync-ts";

  // Updates the small sync status pip in the topbar. Hidden when no folder is
  // configured. Spinner while a write is in flight, green ✓ when synced,
  // red ✕ if the last write failed.
  function updateSyncIndicator(state) {
    const el = document.getElementById("sync-indicator");
    if (!el) return;
    const folder = localStorage.getItem(SYNC_FOLDER_KEY);
    if (!folder) {
      el.className = "sync-indicator hidden";
      el.textContent = "";
      el.title = "";
      return;
    }
    if (state === "syncing") {
      el.className = "sync-indicator syncing";
      el.innerHTML = "<span>↻</span>";
      el.title = "Syncing…";
      return;
    }
    if (state === "error") {
      el.className = "sync-indicator error";
      el.textContent = "✕";
      el.title = "Last sync failed — will retry on next change";
      return;
    }
    // synced (default / idle) — show a checkmark with the last-sync time.
    const ts = parseInt(localStorage.getItem(SYNC_LAST_TS_KEY) || "0", 10);
    const tsLabel = ts > 0 ? new Date(ts).toLocaleString() : "(never)";
    el.className = "sync-indicator synced";
    el.textContent = "✓";
    el.title = "Synced · last sync: " + tsLabel;
  }

  function buildProgressJson() {
    const storage = {};
    for (const k of SYNC_KEYS) {
      const v = localStorage.getItem(k);
      if (v != null) storage[k] = v;
    }
    return {
      kind: "chess-openings-trainer-progress",
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: window.BUILD_VERSION || "dev",
      storage
    };
  }

  function applyImportedStorage(storage) {
    for (const k of SYNC_KEYS) {
      if (storage[k] != null) localStorage.setItem(k, storage[k]);
      else localStorage.removeItem(k);
    }
  }

  // Try to pull newer state from the configured sync folder. If we find a
  // newer file there, apply it and reload. Called once at startup.
  async function autoSyncOnLaunch() {
    if (!window.syncFs) return;
    const folder = localStorage.getItem(SYNC_FOLDER_KEY);
    if (!folder) return;
    let raw;
    try { raw = await window.syncFs.read(folder); }
    catch (e) { return; }
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); }
    catch (e) { return; }
    if (!data || data.kind !== "chess-openings-trainer-progress" || !data.storage) return;
    const remoteTs = Date.parse(data.exportedAt) || 0;
    const localTs = parseInt(localStorage.getItem(SYNC_LAST_TS_KEY) || "0", 10);
    // Only import if the file is meaningfully newer than what we last
    // synced (5s tolerance to avoid loops on the same write).
    if (remoteTs > localTs + 5000) {
      applyImportedStorage(data.storage);
      localStorage.setItem(SYNC_LAST_TS_KEY, String(remoteTs));
      // Reload so renderers and SRS pick up the imported state.
      location.reload();
    }
  }

  // Debounced write — coalesces a burst of state changes into a single
  // file write to avoid slamming the cloud client.
  let _syncWriteTimer = null;
  function autoSyncWriteDebounced() {
    if (!window.syncFs) return;
    const folder = localStorage.getItem(SYNC_FOLDER_KEY);
    if (!folder) return;
    if (_syncWriteTimer) clearTimeout(_syncWriteTimer);
    updateSyncIndicator("syncing");
    _syncWriteTimer = setTimeout(async () => {
      _syncWriteTimer = null;
      try {
        const data = buildProgressJson();
        await window.syncFs.write(folder, JSON.stringify(data, null, 2));
        localStorage.setItem(SYNC_LAST_TS_KEY, String(Date.parse(data.exportedAt)));
        updateSyncIndicator("synced");
      } catch (e) {
        // Soft-fail: if the folder went away (Drive offline, etc.), just
        // skip this write. Next change will retry.
        updateSyncIndicator("error");
      }
    }, 800);
  }

  // Always-on local backup — mirrors the same progress JSON into the app's
  // userData directory on every state change. Independent of any cloud
  // sync the user may or may not have configured. Restored on launch (see
  // window.progressFs.read() at the top of this IIFE).
  let _localBackupTimer = null;
  function localBackupWriteDebounced() {
    if (!window.progressFs) return;
    if (_localBackupTimer) clearTimeout(_localBackupTimer);
    _localBackupTimer = setTimeout(() => {
      _localBackupTimer = null;
      try {
        const data = buildProgressJson();
        window.progressFs.write(JSON.stringify(data, null, 2)).catch(() => {});
      } catch (e) {}
    }, 400);
  }

  // Wrap SRS.review so each review triggers both the (optional) cloud
  // sync write and the always-on local userData backup. SRS internals are
  // unchanged.
  if (window.SRS && typeof window.SRS.review === "function") {
    const _origReview = window.SRS.review;
    window.SRS.review = function () {
      const r = _origReview.apply(window.SRS, arguments);
      autoSyncWriteDebounced();
      localBackupWriteDebounced();
      return r;
    };
  }

  // Kick off the launch-time pull. Fire-and-forget — it'll reload the page
  // if it finds newer remote state.
  autoSyncOnLaunch().catch(() => {});

  // Initialize the topbar sync indicator now that the DOM is up. Reflects
  // whatever state we last persisted (synced / no folder).
  updateSyncIndicator("synced");

  function exportProgress() {
    const storage = {};
    for (const k of SYNC_KEYS) {
      const v = localStorage.getItem(k);
      if (v != null) storage[k] = v;
    }
    const data = {
      kind: "chess-openings-trainer-progress",
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: window.BUILD_VERSION || "dev",
      storage
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chess-openings-progress-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importProgress() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      let data;
      try {
        const text = await file.text();
        data = JSON.parse(text);
      } catch (e) {
        alert("Couldn't read that file as JSON.");
        return;
      }
      if (!data || data.kind !== "chess-openings-trainer-progress" || !data.storage) {
        alert("That doesn't look like a Chess Openings Trainer progress file.");
        return;
      }
      const ok = confirm(
        "Replace this machine's progress with the imported file? " +
        "Your current SRS state and settings will be overwritten."
      );
      if (!ok) return;
      for (const k of SYNC_KEYS) {
        if (data.storage[k] != null) {
          localStorage.setItem(k, data.storage[k]);
        } else {
          // Clear keys not present in the import so the two machines truly
          // mirror after a sync.
          localStorage.removeItem(k);
        }
      }
      // Reload so SRS / filters / engine toggle pick up the new state.
      location.reload();
    });
    input.click();
  }

  async function pickSyncFolder() {
    if (!window.syncFs) {
      alert("Auto-sync needs the desktop app build (won't work in dev mode).");
      return;
    }
    const folder = await window.syncFs.pickFolder();
    if (!folder) return;
    localStorage.setItem(SYNC_FOLDER_KEY, folder);
    // On first config: try to pull existing progress from the folder. If
    // the file already exists (other device set up first), import. If not,
    // write our current state out so the file appears in cloud sync.
    let raw = null;
    try { raw = await window.syncFs.read(folder); } catch (e) {}
    if (raw) {
      let data;
      try { data = JSON.parse(raw); } catch (e) {}
      if (data && data.kind === "chess-openings-trainer-progress" && data.storage) {
        const ok = confirm(
          "Found an existing progress file in that folder. Import it now? " +
          "Your current local progress will be overwritten."
        );
        if (ok) {
          applyImportedStorage(data.storage);
          localStorage.setItem(SYNC_LAST_TS_KEY, String(Date.parse(data.exportedAt) || Date.now()));
          location.reload();
          return;
        }
      }
    }
    // No existing file (or user chose to keep local) — write current state.
    autoSyncWriteDebounced();
    localBackupWriteDebounced();
    updateSyncIndicator("syncing");
    renderPanel();
  }

  function clearSyncFolder() {
    localStorage.removeItem(SYNC_FOLDER_KEY);
    localStorage.removeItem(SYNC_LAST_TS_KEY);
    updateSyncIndicator("synced");
    renderPanel();
  }

  function renderProgressSync() {
    const folder = localStorage.getItem(SYNC_FOLDER_KEY) || "";
    const lastTs = parseInt(localStorage.getItem(SYNC_LAST_TS_KEY) || "0", 10);
    const lastLabel = lastTs > 0
      ? new Date(lastTs).toLocaleString()
      : (folder ? "(no syncs yet on this device)" : "—");
    const wrap = document.createElement("div");
    wrap.className = "stats-block";
    wrap.innerHTML = `
      <div class="stats-h3">Sync between devices</div>
      <div class="subtitle" style="margin-bottom:10px">
        Auto-sync via a shared folder (Google Drive, iCloud, OneDrive, Dropbox).
        Each card review and settings change writes a tiny progress.json to the
        folder; opening the app reads it back. Closing the app isn't required —
        sync happens continuously in the background. Last-write-wins, so don't
        study on two devices at once while offline.
      </div>
      <div class="sync-folder-row">
        <span class="sync-folder-label">Folder:</span>
        <code class="sync-folder-path">${folder ? escapeHtml(folder) : "(none — manual export only)"}</code>
      </div>
      <div class="sync-folder-row">
        <span class="sync-folder-label">Last sync:</span>
        <span style="font-size:12px;color:var(--text-dim)">${escapeHtml(lastLabel)}</span>
      </div>
      <div class="actions" style="margin-bottom:10px">
        <button class="btn" id="pick-sync-folder">${folder ? "Change sync folder…" : "Choose sync folder…"}</button>
        ${folder ? '<button class="btn" id="clear-sync-folder">Clear</button>' : ""}
      </div>
      <div class="subtitle" style="margin: 14px 0 8px">Manual fallback (no setup)</div>
      <div class="actions">
        <button class="btn" id="export-progress">Export progress…</button>
        <button class="btn" id="import-progress">Import progress…</button>
      </div>
    `;
    wrap.querySelector("#pick-sync-folder").addEventListener("click", pickSyncFolder);
    const clearBtn = wrap.querySelector("#clear-sync-folder");
    if (clearBtn) clearBtn.addEventListener("click", clearSyncFolder);
    wrap.querySelector("#export-progress").addEventListener("click", exportProgress);
    wrap.querySelector("#import-progress").addEventListener("click", importProgress);
    return wrap;
  }

  function renderPerOpening(rows) {
    const wrap = document.createElement("div");
    wrap.className = "stats-block";
    let body;
    if (!rows.length) {
      body = `<div class="subtitle">Practice some openings to see your per-opening accuracy here.</div>`;
    } else {
      body = rows.map(({ opening, successes, total, accuracy }) => {
        const pct = Math.round(accuracy);
        const cls = pct >= 80 ? "acc-good" : (pct >= 50 ? "acc-mid" : "acc-bad");
        const tier = opening.tier || "C";
        const eloR = openingEloRange(opening);
        const eloPill = eloR
          ? `<span class="elo-range-pill" title="Inferred study range from this opening's audience flags">${eloR[0]}–${eloR[1]}</span>`
          : `<span class="elo-range-pill elo-range-none" title="No audience flags — no inferred Elo range">—</span>`;
        return `
          <div class="hard-row">
            <span class="eco">${opening.eco}</span>
            <span class="tier-pill tier-${tier}" title="Tier ${tier}">${tier}</span>
            <span class="hard-name">${escapeHtml(opening.name)}</span>
            ${eloPill}
            <span class="acc-bar"><span class="acc-bar-fill ${cls}" style="width:${pct}%"></span></span>
            <span class="hard-meta acc-meta ${cls}">${successes}/${total} · ${pct}%</span>
          </div>`;
      }).join("");
    }
    wrap.innerHTML = `<div class="stats-h3">Per-opening accuracy</div>${body}`;
    return wrap;
  }

  function renderTierBreakdown(tier) {
    const wrap = document.createElement("div");
    wrap.className = "stats-block";
    let rows = "";
    for (const t of ["S", "A", "B", "C", "D", "F"]) {
      const g = tier[t];
      if (!g || g.total === 0) continue;
      const pct = Math.round((g.known / g.total) * 100);
      rows += `
        <div class="eco-row">
          <div class="eco-name"><span class="tier-pill tier-${t}">${t}</span></div>
          <div class="eco-bar"><div style="width:${pct}%"></div></div>
          <div class="eco-count">${g.known}/${g.total}</div>
        </div>`;
    }
    wrap.innerHTML = `<div class="stats-h3">By tier</div>${rows}`;
    return wrap;
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
      fb.innerHTML = `<strong>${escapeHtml(opening.name)}</strong> (${opening.eco})${renderOpeningPillsHtml(opening, { includeEval: true })}${escapeHtml(opening.description)}${opening.assessment ? `<div class="assessment">${escapeHtml(opening.assessment)}</div>` : ""}<div class="moves-line">Moves: ${formatNumberedSan(opening.moves)}</div>${renderContinuationsHtml(opening)}`;
      panelEl.appendChild(fb);
      // Engine eval of the position after the opening's main line.
      try { fetchAndShowEval(fenFromMoves(opening.moves)); } catch (e) {}

      const actions = document.createElement("div");
      actions.className = "actions";

      const tryBtn = document.createElement("button");
      tryBtn.className = "btn";
      tryBtn.textContent = "Try playing the moves";
      tryBtn.addEventListener("click", tryPlayingMovesAfterIdentify);
      actions.appendChild(tryBtn);

      appendPreviousButton(actions);

      const next = document.createElement("button");
      next.className = "btn primary";
      next.textContent = "Next →";
      next.addEventListener("click", nextPracticeQuestion);
      actions.appendChild(next);
      panelEl.appendChild(actions);
    } else {
      const actions = document.createElement("div");
      actions.className = "actions";

      appendPreviousButton(actions);

      const skip = document.createElement("button");
      skip.className = "btn primary";
      skip.textContent = "Skip";
      skip.addEventListener("click", () => {
        if (modeState.opening) recordResult(modeState.opening.name, "identify", false);
        nextPracticeQuestion();
      });
      actions.appendChild(skip);
      panelEl.appendChild(actions);
    }
  }

  function appendPreviousButton(actionsEl) {
    if (historyIndex <= 0) return;
    const prev = document.createElement("button");
    prev.className = "btn";
    prev.textContent = "← Previous";
    prev.title = "Re-show the previous question (won't affect SRS)";
    prev.addEventListener("click", previousPracticeQuestion);
    actionsEl.appendChild(prev);
  }

  function renderSetupPanel() {
    const { opening, moveIndex, complete, mistakes } = modeState;
    panelEl.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "Play the opening";
    panelEl.appendChild(h);

    const meta = document.createElement("div");
    meta.className = "opening-meta";
    // Description and badges can leak hints (specific squares, side, etc) so
    // they're gated behind completion — hidden during the question, revealed
    // when the user finishes (or hits "Show solution").
    meta.innerHTML = `
      <div class="name"><span class="eco">${opening.eco}</span>${escapeHtml(opening.name)}</div>
      ${complete ? renderOpeningPillsHtml(opening, { includeEval: true }) : ""}
      ${complete ? `<div class="desc">${escapeHtml(opening.description)}</div>` : ""}
      ${complete && opening.assessment ? `<div class="assessment">${escapeHtml(opening.assessment)}</div>` : ""}
      ${complete ? renderContinuationsHtml(opening) : ""}
      <div class="progress"><div style="width:${(moveIndex / opening.moves.length) * 100}%"></div></div>
    `;
    panelEl.appendChild(meta);
    if (complete) {
      try { fetchAndShowEval(fenFromMoves(opening.moves)); } catch (e) {}
    }

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

    appendPreviousButton(actions);

    const next = document.createElement("button");
    next.className = "btn primary";
    next.textContent = complete ? "Next opening →" : "Skip";
    next.addEventListener("click", () => {
      if (!complete && modeState.opening) {
        recordResult(modeState.opening.name, "setup", false);
      }
      nextPracticeQuestion();
    });
    actions.appendChild(next);

    panelEl.appendChild(actions);
  }

  function renderPlayPanel() {
    const { opening, userSide, mistakes, complete, isMystery, nameAnswered, matchedOpening } = modeState;
    panelEl.innerHTML = "";

    const h = document.createElement("h2");
    h.textContent = isMystery ? "Play and identify" : "Play the opening";
    panelEl.appendChild(h);

    // Reveal target depends on mode: for "play", it's the pre-picked opening;
    // for mystery before identifying, hide everything and show the played
    // count; after identifying, show whatever the user landed on.
    const revealOpening = isMystery ? matchedOpening : opening;
    const playedCount = game.history().length;

    const meta = document.createElement("div");
    meta.className = "opening-meta";
    if (isMystery && !nameAnswered) {
      meta.innerHTML = `
        <div class="name">Mystery line — keep playing book moves; the app picks where to stop.</div>
      `;
    } else if (revealOpening) {
      meta.innerHTML = `
        <div class="name"><span class="eco">${revealOpening.eco}</span>${escapeHtml(revealOpening.name)}</div>
        ${complete && nameAnswered ? renderOpeningPillsHtml(revealOpening, { includeEval: true }) : ""}
        ${complete && nameAnswered ? `<div class="desc">${escapeHtml(revealOpening.description)}</div>` : ""}
        ${complete && nameAnswered && revealOpening.assessment ? `<div class="assessment">${escapeHtml(revealOpening.assessment)}</div>` : ""}
        ${complete && nameAnswered ? renderContinuationsHtml(revealOpening) : ""}
        ${!isMystery ? `<div class="progress"><div style="width:${(playedCount / opening.moves.length) * 100}%"></div></div>` : ""}
      `;
    }
    panelEl.appendChild(meta);
    if (complete && nameAnswered && revealOpening) {
      try { fetchAndShowEval(fenFromMoves(revealOpening.moves)); } catch (e) {}
    }

    const sub = document.createElement("div");
    sub.className = "subtitle";
    if (complete) {
      if (isMystery && !nameAnswered) sub.textContent = "Line complete. What opening did the app land on?";
      else if (mistakes === 0) sub.textContent = "Perfect — you played the book line cleanly.";
      else sub.textContent = "Completed (with mistakes / hints).";
    } else {
      const youSide = userSide === "white" ? "White" : "Black";
      const turn = game.turn() === "w" ? "White" : "Black";
      const yourTurn = turn === youSide;
      if (isMystery) {
        sub.textContent = yourTurn
          ? `You're playing as ${youSide}. Make any standard book move (${playedCount + 1}).`
          : `You're playing as ${youSide}. ${turn} (the app) is replying…`;
      } else {
        sub.textContent = yourTurn
          ? `You're playing as ${youSide}. Your move (${playedCount + 1} / ${opening.moves.length}).`
          : `You're playing as ${youSide}. ${turn} (the app) is replying…`;
      }
    }
    panelEl.appendChild(sub);

    // Mystery: identification choices once the line ends.
    if (isMystery && complete && !nameAnswered && matchedOpening) {
      const distractors = getRandomOpenings(5, matchedOpening, getFilteredOpeningPool());
      const choices = shuffle([matchedOpening, ...distractors]);
      const choicesDiv = document.createElement("div");
      choicesDiv.className = "choices";
      for (const c of choices) {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.dataset.name = c.name;
        btn.innerHTML = `<span class="eco">${c.eco}</span>${escapeHtml(c.name)}`;
        btn.addEventListener("click", () => answerPlayMystery(c, btn));
        choicesDiv.appendChild(btn);
      }
      panelEl.appendChild(choicesDiv);
    }

    // Show the move list once we're done. For mystery, show what the user
    // actually played (game.history()) — for named-play, the canonical line.
    if (complete && (!isMystery || nameAnswered)) {
      const movesToShow = isMystery ? game.history() : opening.moves;
      const ml = document.createElement("div");
      ml.className = "move-list";
      ml.innerHTML = renderMoveListHtml(movesToShow, movesToShow.length, true);
      panelEl.appendChild(ml);
    }

    const fb = document.createElement("div");
    fb.className = "feedback-slot";
    panelEl.appendChild(fb);

    const actions = document.createElement("div");
    actions.className = "actions";
    if (!complete) {
      const sol = document.createElement("button");
      sol.className = "btn";
      sol.textContent = "Show solution";
      sol.addEventListener("click", playShowSolution);
      actions.appendChild(sol);
    }
    appendPreviousButton(actions);
    const next = document.createElement("button");
    next.className = "btn primary";
    next.textContent = (complete && (!isMystery || nameAnswered)) ? "Next opening →" : "Skip";
    next.addEventListener("click", () => {
      if (!complete && modeState.opening) {
        const qt = isMystery ? "playmystery" : "play";
        recordResult(modeState.opening.name, qt, false);
      }
      nextPracticeQuestion();
    });
    actions.appendChild(next);
    panelEl.appendChild(actions);
  }

  function renderExplorePanel() {
    const { selected, query, freestyle } = modeState;
    panelEl.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "Explore openings";
    panelEl.appendChild(h);

    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = freestyle
      ? "Free play — make moves and the app names whatever opening the position matches. Reset to browse the list, or pick one below to load it."
      : "Browse the list, or just start moving pieces — the app will name openings as you play. Arrow keys: ←→ step, ↑↓ jump.";
    panelEl.appendChild(sub);

    // Detected opening + played moves panel (top): freestyle uses the live
    // game.history(); browse uses the selected opening's canonical line.
    if (freestyle) {
      const played = game.history();
      const div = document.createElement("div");
      div.style.marginTop = "12px";
      if (selected) {
        div.innerHTML = `
          <div class="opening-meta">
            <div class="name"><span class="eco">${selected.eco}</span>${escapeHtml(selected.name)}</div>
            ${renderOpeningPillsHtml(selected)}
            <div class="desc">${escapeHtml(selected.description)}</div>
            ${selected.assessment ? `<div class="assessment">${escapeHtml(selected.assessment)}</div>` : ""}
          </div>
        `;
      } else {
        div.innerHTML = `<div class="feedback info">No opening in the database matches the current position. Keep going — or hit Reset.</div>`;
      }
      if (played.length) {
        div.innerHTML += `<div class="move-list" style="margin-top:10px">${renderMoveListHtml(played, played.length, true)}</div>`;
      }
      div.innerHTML += `
        <div class="actions" style="margin-top:8px">
          <button class="btn" id="ex-back">◀ Undo</button>
          <button class="btn" id="ex-fwd">Redo ▶</button>
          <button class="btn" id="ex-reset-free">Reset & browse</button>
        </div>
      `;
      panelEl.appendChild(div);
      panelEl.querySelector("#ex-back").addEventListener("click", () => exploreStep(-1));
      panelEl.querySelector("#ex-fwd").addEventListener("click", () => exploreStep(1));
      panelEl.querySelector("#ex-reset-free").addEventListener("click", () => {
        game.reset();
        modeState.freestyle = false;
        modeState.exploreRedoStack = [];
        selectExplore(OPENINGS[0]);
      });
    }

    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search openings…";
    search.className = "search-input";
    search.style.marginTop = "12px";
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

    if (selected && !freestyle) {
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
      .filter(({ o }) =>
        tierFilter.has(o.tier || "C")
        && openingMatchesSide(o)
        && openingMatchesAudience(o)
        && openingMatchesElo(o))
      .filter(({ o }) => !q ||
        o.name.toLowerCase().includes(q) ||
        o.eco.toLowerCase().includes(q) ||
        (o.aliases || []).some(a => a.toLowerCase().includes(q)));
    if (items.length === 0) return '<div class="opening-item">No matches — relax a filter above or clear the search.</div>';
    return items.map(({ o, i }) => {
      const sel = state.selected && state.selected.name === o.name ? " selected" : "";
      const tier = o.tier || "C";
      return `<div class="opening-item${sel}" data-idx="${i}"><span class="eco">${o.eco}</span><span class="tier-pill tier-${tier}" title="Tier ${tier}">${tier}</span>${escapeHtml(o.name)}</div>`;
    }).join("");
  }


  function renderEval() {
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

    // Engine arrow: first move of the principal variation. Drawn whenever
    // the user has the engine toggle on, OR auto-on after question reveal.
    const drawArrow = showEngine || isQuestionRevealed();
    if (drawArrow && info.pv && info.pv[0] && info.pv[0].length >= 4) {
      board.setEngineArrow(info.pv[0].slice(0, 2), info.pv[0].slice(2, 4));
    } else {
      board.clearEngineArrow();
    }

    // Update the vertical eval bar that sits next to the board.
    updateVerticalEvalBar(pct, evalText, true);

    slot.innerHTML = `
      <div class="eval-readout">
        <span class="cp">${evalText}</span>
        <span class="depth">depth ${info.depth || "?"}${info.nodes ? " · " + (info.nodes/1000).toFixed(0) + "k nodes" : ""}</span>
      </div>
      <div class="bestline"><strong>Best line:</strong> ${escapeHtml(pvDisplay || "—")}</div>
    `;
  }

  function updateVerticalEvalBar(pct, evalText, visible) {
    // Horizontal eval bar below the board. Kept the original function name
    // to minimize churn at call sites.
    const bar = document.getElementById("eval-bar-horizontal");
    if (!bar) return;
    if (!visible) {
      bar.classList.add("hidden");
      return;
    }
    const fill = document.getElementById("eval-bar-fill");
    const label = document.getElementById("eval-bar-label");
    // White's share of the bar fills from the left; doesn't flip with the
    // board orientation (horizontal eval-bars are conventionally white-on-left).
    if (fill) fill.style.width = pct.toFixed(1) + "%";
    if (label) label.textContent = evalText;
    bar.classList.remove("hidden");
  }

  // ===== Helpers =====
  // Returns "White" or "Black" based on whose move ends the opening's main
  // line (odd-length sequences end on White's move, even-length on Black's).
  // This catches the usual convention — "Italian Game" is White's, "Sicilian
  // Najdorf" / "King's Indian Defense" are Black's responses.
  function openingSide(opening) {
    return (opening.moves.length % 2 === 1) ? "White" : "Black";
  }

  // Renders the row of small pills that goes under an opening's name:
  // side · tier · popularity stars · async engine eval slot.
  // Returns the HTML string so callers can drop it into innerHTML alongside
  // the rest of the meta block.
  function renderOpeningPillsHtml(opening, opts = {}) {
    const side = openingSide(opening);
    const tier = opening.tier || "C";
    const tierInfo = TIER_INFO[tier] || { label: tier, desc: "" };
    const pop = Math.max(1, Math.min(4, opening.popularity || 2));
    // Render filled/empty stars in separate spans so we can color them
    // differently — without that, ★ and ☆ in the same color blur into
    // an indistinguishable wash.
    const stars = `<span class="stars-on">${"★".repeat(pop)}</span><span class="stars-off">${"☆".repeat(4 - pop)}</span>`;
    const popDesc = POPULARITY_DESCS[pop] || "";
    const evalSlot = opts.includeEval
      ? `<span class="eval-pill" data-eval-pill data-tip="Stockfish evaluation of the resulting position at depth 14.\nPositive favors White, negative favors Black.">eval …</span>`
      : "";
    const begTag = opening.beginnerFriendly
      ? `<span class="audience-tag aud-beginner" data-tip="Beginner-friendly — clear plans, low risk of immediate disaster, easy to learn the typical structures.">Beginner</span>`
      : "";
    const intTag = opening.intermediateFriendly
      ? `<span class="audience-tag aud-intermediate" data-tip="Intermediate-friendly — sound theoretical foundations and manageable complexity for a player past the basics.">Intermediate</span>`
      : "";
    const gmTag = opening.gmFriendly
      ? `<span class="audience-tag aud-gm" data-tip="Played at the top level — regularly appears in modern grandmaster practice.">GM</span>`
      : "";
    return `
      <div class="opening-pills">
        <span class="side-tag side-${side.toLowerCase()}" data-tip="${escapeHtml(side)}'s opening — the main line ends on ${escapeHtml(side)}'s move.">${side}</span>
        <span class="tier-pill tier-${tier}" data-tip="${escapeHtml(tierInfo.label)} — ${escapeHtml(tierInfo.desc)}">${escapeHtml(tierInfo.label)}</span>
        <span class="popularity-pill" data-tip="${escapeHtml(popDesc)}">${stars}</span>
        ${begTag}
        ${intTag}
        ${gmTag}
        ${evalSlot}
      </div>
    `;
  }

  // Kick off engine analysis on `fen` and update the eval-pill inside the
  // currently-rendered panel when the engine answers. A token guards against
  // races: if the user moves on, the token mismatch makes us drop the result.
  let _evalRequestToken = 0;
  function fetchAndShowEval(fen) {
    if (!engine || !engine.ready) return;
    const myToken = ++_evalRequestToken;
    engine.analyze(fen, { depth: 14 }).then(({ info }) => {
      if (myToken !== _evalRequestToken) return; // user moved on
      const pill = panelEl.querySelector("[data-eval-pill]");
      if (!pill) return;
      const turn = (fen.split(" ")[1] || "w");
      let cp = info && info.cp;
      let mate = info && info.mate;
      // Normalize to White's POV (engine reports from side-to-move).
      if (turn === "b") {
        if (cp != null) cp = -cp;
        if (mate != null) mate = -mate;
      }
      let text, cls;
      if (mate != null) {
        text = "M" + Math.abs(mate);
        cls = mate > 0 ? "eval-good" : "eval-bad";
      } else if (cp != null) {
        const n = cp / 100;
        text = (n >= 0 ? "+" : "") + n.toFixed(2);
        if (Math.abs(cp) <= 30) cls = "eval-equal";
        else cls = (cp > 0) ? "eval-good" : "eval-bad";
      } else {
        text = "—";
        cls = "eval-equal";
      }
      pill.textContent = text;
      pill.classList.remove("eval-good","eval-bad","eval-equal");
      pill.classList.add(cls);
    }).catch(() => {});
  }

  // Find the longest known opening whose moves match a prefix of the played
  // game. Returns the opening object, or null if no match.
  function findMatchingOpening() {
    const played = game.history();
    if (played.length === 0) return null;
    let best = null;
    for (const op of OPENINGS) {
      if (op.moves.length > played.length) continue;
      let ok = true;
      for (let i = 0; i < op.moves.length; i++) {
        if (!sansEqual(op.moves[i], played[i])) { ok = false; break; }
      }
      if (ok && (!best || op.moves.length > best.moves.length)) best = op;
    }
    return best;
  }

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
    updateCurrentOpeningLabel();
    updateGameScoreLabel();
  }

  // Small text shown below the board with the current opening's name —
  // hidden while a question is mid-flight so it doesn't spoil the answer.
  function updateCurrentOpeningLabel() {
    const el = document.getElementById("current-opening");
    if (!el) return;
    const name = currentOpeningLabel();
    if (name) {
      el.textContent = name;
      el.classList.remove("hidden");
    } else {
      el.textContent = "";
      el.classList.add("hidden");
    }
  }

  // Move list (game score) below the board — short, scrollable, always
  // reflects the moves actually played in chess.js (so it tracks free
  // play in Explore, the played line in Practice/Play, and the auto-
  // played continuation in Tricks).
  function updateGameScoreLabel() {
    const el = document.getElementById("game-score");
    if (!el) return;
    const history = game.history();
    if (!history.length) {
      el.textContent = "";
      el.classList.add("hidden");
      return;
    }
    el.classList.remove("hidden");
    el.textContent = formatNumberedSan(history);
  }

  function currentOpeningLabel() {
    if (currentMode === "tricks") {
      if (modeState.trick && modeState.complete) return modeState.trick.name;
      return null;
    }
    if (currentMode === "explore") {
      if (modeState.selected) return modeState.selected.name;
      return null;
    }
    if (currentMode === "practice") {
      const t = modeState.questionType;
      if (t === "identify") {
        return modeState.answered && modeState.opening ? modeState.opening.name : null;
      }
      if (t === "setup") {
        return modeState.complete && modeState.opening ? modeState.opening.name : null;
      }
      if (t === "play") {
        return modeState.opening ? modeState.opening.name : null;
      }
      if (t === "playmystery") {
        if (modeState.complete && modeState.nameAnswered && modeState.matchedOpening) {
          return modeState.matchedOpening.name;
        }
        return null;
      }
    }
    return null;
  }

  function renderScore() {
    if (score.total === 0) {
      scoreEl.textContent = "0 / 0";
      scoreEl.className = "";
      return;
    }
    const pct = Math.round((score.correct / score.total) * 100);
    scoreEl.textContent = `${score.correct} / ${score.total} · ${pct}%`;
    scoreEl.className = pct >= SCORE_GOAL_PCT ? "score-met" : "score-below";
  }

  // Each graded question attempt counts as one tally in the score.
  // openingName / questionType are accepted for API symmetry but the
  // simple scoring doesn't need them — every call bumps the denominator
  // by 1, and the numerator by 1 if the answer was correct.
  function recordResult(openingName, questionType, isCorrect) {
    score.total++;
    if (isCorrect) score.correct++;
    renderScore();
  }

  function loadScore() {
    return { correct: 0, total: 0 };
  }

  function saveScore() {
    // No-op — score is session-only by design.
  }

  function loadShowEngine() {
    try {
      const raw = localStorage.getItem(SHOW_ENGINE_KEY);
      if (raw == null) return false; // default OFF — engine info is a hint
      return raw === "true";
    } catch (e) { return false; }
  }

  function saveShowEngine() {
    try { localStorage.setItem(SHOW_ENGINE_KEY, String(showEngine)); } catch (e) {}
    if (typeof autoSyncWriteDebounced === "function") autoSyncWriteDebounced();
    if (typeof localBackupWriteDebounced === "function") localBackupWriteDebounced();
  }

  function loadTierFilter() {
    try {
      const raw = localStorage.getItem(TIER_FILTER_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return new Set(arr);
      }
    } catch (e) {}
    return new Set(["S", "A", "B", "C", "D", "F"]); // default: all tiers
  }

  function saveTierFilter() {
    try { localStorage.setItem(TIER_FILTER_KEY, JSON.stringify([...tierFilter])); } catch (e) {}
    if (typeof autoSyncWriteDebounced === "function") autoSyncWriteDebounced();
    if (typeof localBackupWriteDebounced === "function") localBackupWriteDebounced();
  }

  function loadAudienceFilter() {
    try {
      const raw = localStorage.getItem(AUDIENCE_FILTER_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return new Set(arr);
      }
    } catch (e) {}
    return new Set(["beginner", "intermediate", "gm"]); // default: all audiences
  }

  function saveAudienceFilter() {
    try { localStorage.setItem(AUDIENCE_FILTER_KEY, JSON.stringify([...audienceFilter])); } catch (e) {}
    if (typeof autoSyncWriteDebounced === "function") autoSyncWriteDebounced();
    if (typeof localBackupWriteDebounced === "function") localBackupWriteDebounced();
  }

  function loadSideFilter() {
    try {
      const raw = localStorage.getItem(SIDE_FILTER_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) {
          const allowed = new Set(arr.filter(s => s === "white" || s === "black"));
          if (allowed.size) return allowed;
        }
      }
    } catch (e) {}
    return new Set(["white", "black"]);
  }

  function saveSideFilter() {
    try { localStorage.setItem(SIDE_FILTER_KEY, JSON.stringify([...sideFilter])); } catch (e) {}
    if (typeof autoSyncWriteDebounced === "function") autoSyncWriteDebounced();
    if (typeof localBackupWriteDebounced === "function") localBackupWriteDebounced();
  }

  function openingMatchesSide(o) {
    return sideFilter.has(openingSide(o).toLowerCase());
  }

  function loadEloFilter() {
    try {
      const raw = localStorage.getItem(ELO_FILTER_KEY);
      if (raw == null) return null;
      // Older builds stored a single number ("your rating"). Treat that
      // as a tight range around the number so the user's intent isn't
      // silently dropped on upgrade.
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && /^\s*\d+\s*$/.test(raw)) {
        return clampEloRange({ min: n - 200, max: n + 200 });
      }
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object" && Number.isFinite(obj.min) && Number.isFinite(obj.max)) {
        return clampEloRange(obj);
      }
    } catch (e) {}
    return null;
  }

  function saveEloFilter() {
    try {
      if (eloFilter == null) localStorage.removeItem(ELO_FILTER_KEY);
      else localStorage.setItem(ELO_FILTER_KEY, JSON.stringify(eloFilter));
    } catch (e) {}
    if (typeof autoSyncWriteDebounced === "function") autoSyncWriteDebounced();
    if (typeof localBackupWriteDebounced === "function") localBackupWriteDebounced();
  }

  function clampEloRange(r) {
    const min = Math.max(700, Math.min(2800, r.min | 0));
    const max = Math.max(700, Math.min(2800, r.max | 0));
    return { min: Math.min(min, max), max: Math.max(min, max) };
  }

  function openingMatchesAudience(o) {
    if (audienceFilter.size === 0) return true;
    if (audienceFilter.has("beginner") && o.beginnerFriendly) return true;
    if (audienceFilter.has("intermediate") && o.intermediateFriendly) return true;
    if (audienceFilter.has("gm") && o.gmFriendly) return true;
    return false;
  }

  // Each opening covers an Elo range derived from its audience flags.
  // Ranges overlap so a Beginner+Intermediate opening covers everyone
  // from a beginner through a strong club player. An opening with no
  // audience flag (rare — only dubious / very offbeat lines) is treated
  // as covering nothing, so the Elo filter excludes it.
  function openingEloRange(o) {
    let lo = Infinity, hi = -Infinity;
    if (o.beginnerFriendly) { lo = Math.min(lo, 700);  hi = Math.max(hi, 1700); }
    if (o.intermediateFriendly) { lo = Math.min(lo, 1300); hi = Math.max(hi, 2300); }
    if (o.gmFriendly) { lo = Math.min(lo, 2100); hi = Math.max(hi, 3000); }
    return lo <= hi ? [lo, hi] : null;
  }

  function openingMatchesElo(o) {
    if (eloFilter == null) return true;
    const range = openingEloRange(o);
    if (!range) return false;
    // Overlap test: the opening's level coverage must intersect the
    // user's chosen study range.
    return range[1] >= eloFilter.min && range[0] <= eloFilter.max;
  }

  function getFilteredOpeningPool() {
    const filtered = OPENINGS.filter(o =>
      tierFilter.has(o.tier || "C")
      && openingMatchesSide(o)
      && openingMatchesAudience(o)
      && openingMatchesElo(o)
    );
    // Defensive: if the combined filter ends up empty, fall back to all.
    return filtered.length ? filtered : OPENINGS;
  }

  // Sub-variations don't enter the rotation until the user has had at least
  // one successful review of their parent opening. Keeps a beginner from
  // getting blasted with "Najdorf English Attack" before they've seen the
  // Sicilian Defense.
  function openingPrereqsMet(opening) {
    const prereqs = (typeof PREREQUISITES !== "undefined" && PREREQUISITES[opening.name]) || [];
    for (const name of prereqs) {
      const card = SRS.getCard(name);
      if (!card || (card.successes || 0) === 0) return false;
    }
    return true;
  }

  function getEligibleOpeningPool() {
    const filtered = getFilteredOpeningPool();
    const eligible = filtered.filter(openingPrereqsMet);
    // Defensive: if every filtered opening has unmet prereqs (very early on,
    // or weird filter combos), fall back to the unrestricted filtered pool
    // so the rotation never starves.
    return eligible.length ? eligible : filtered;
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
    // Persist until the next attempt — a correct move triggers renderPanel
    // (which rebuilds the slot empty) and another wrong move overwrites it
    // via this same call. No timeout: messages used to vanish in 2.2s,
    // which often disappeared before the user finished reading them.
    slot.innerHTML = `<div class="feedback ${kind}">${escapeHtml(text)}</div>`;
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

    if (currentMode === "explore") {
      if (e.key === "ArrowLeft") { e.preventDefault(); exploreStep(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); exploreStep(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); exploreStep(-Infinity); }
      else if (e.key === "ArrowDown") { e.preventDefault(); exploreStep(Infinity); }
    } else if (currentMode === "practice") {
      if (isQuestionRevealed()) {
        if (e.key === "ArrowLeft") { e.preventDefault(); practiceStepBack(); }
        else if (e.key === "ArrowRight") { e.preventDefault(); practiceStepForward(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); practiceJumpToStart(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); practiceJumpToEnd(); }
      }
      if (e.key === "Enter") {
        // Click whichever button is acting as the primary nav (Skip /
        // Next → / Next opening →). Mystery before identification has no
        // primary, so Enter is a no-op there until the user picks.
        const primary = panelEl.querySelector(".actions .btn.primary");
        if (primary && !primary.disabled) {
          e.preventDefault();
          primary.click();
        }
      }
    } else if (currentMode === "tricks") {
      // Same arrow nav as Practice once the trick is complete. The
      // practiceStepBack/Forward functions just operate on game.history()
      // and modeState.practiceRedoStack, so they work for any mode.
      if (modeState.complete) {
        if (e.key === "ArrowLeft") { e.preventDefault(); practiceStepBack(); }
        else if (e.key === "ArrowRight") { e.preventDefault(); practiceStepForward(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); practiceJumpToStart(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); practiceJumpToEnd(); }
      }
      if (e.key === "Enter") {
        const primary = panelEl.querySelector(".actions .btn.primary");
        if (primary && !primary.disabled) {
          e.preventDefault();
          primary.click();
        }
      }
    }
  });

  // ===== Post-reveal history navigation in Practice =====
  // Mirrors the analysis-style nav we used to have on the Analysis tab.
  // Tracks undone moves on modeState.practiceRedoStack so → can replay.
  function practiceStepBack() {
    const m = game.undo();
    if (!m) return;
    modeState.practiceRedoStack = modeState.practiceRedoStack || [];
    modeState.practiceRedoStack.push(m);
    const top = game.history({ verbose: true }).slice(-1)[0];
    modeState.lastMove = top ? { from: top.from, to: top.to } : null;
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
  }

  function practiceStepForward() {
    const stack = modeState.practiceRedoStack;
    const m = stack && stack.pop();
    if (!m) return;
    game.move({ from: m.from, to: m.to, promotion: m.promotion });
    modeState.lastMove = { from: m.from, to: m.to };
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
  }

  function practiceJumpToStart() {
    modeState.practiceRedoStack = modeState.practiceRedoStack || [];
    let m;
    while ((m = game.undo())) modeState.practiceRedoStack.push(m);
    modeState.lastMove = null;
    board.setPosition(game.board(), null);
    updateTurnIndicator();
    triggerAnalysis();
  }

  function practiceJumpToEnd() {
    modeState.practiceRedoStack = modeState.practiceRedoStack || [];
    while (modeState.practiceRedoStack.length) {
      const m = modeState.practiceRedoStack.pop();
      game.move({ from: m.from, to: m.to, promotion: m.promotion });
      modeState.lastMove = { from: m.from, to: m.to };
    }
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
  }

  // Kick off
  setMode("practice");
})();
