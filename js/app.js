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

  const SCORE_GOAL_PCT = 80;
  const SHOW_ENGINE_KEY = "chess-openings-trainer.show-engine";
  // Score is per-session — not persisted across launches.
  let score = { correct: 0, total: 0 };
  let showEngine = loadShowEngine();
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
    const opening = SRS.pickNext(OPENINGS);
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
    const fen = fenFromMoves(opening.moves);
    game.load(fen);
    // Random board orientation per card so the user sees positions from
    // both sides over time. Stored on the history entry so re-visits keep
    // the same view.
    const orientation = (historyEntry && historyEntry.orientation)
      || (Math.random() < 0.5 ? "white" : "black");
    if (historyEntry) historyEntry.orientation = orientation;
    if (board.orientation !== orientation) board.setOrientation(orientation);
    board.setPosition(game.board(), null);
    updateTurnIndicator();

    const distractors = getRandomOpenings(5, opening);
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
      score.total++;
      if (correct) score.correct++;
      SRS.review(modeState.opening.name, correct ? "good" : "again");
      saveScore();
      renderScore();
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
          score.total++;
          if (modeState.mistakes === 0) score.correct++;
          SRS.review(modeState.opening.name, modeState.mistakes === 0 ? "good" : "again");
          saveScore();
          renderScore();
          if (modeState.historyEntry) modeState.historyEntry.graded = true;
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
        || pickWeightedRandomOpening(OPENINGS);
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
      // Open-ended: any move that's a prefix of some opening in the database.
      const playedSans = game.history();
      const newSeq = [...playedSans, move.san];
      const candidates = findCandidateOpenings(newSeq);
      if (candidates.length === 0) {
        flashFeedback(panelEl.querySelector(".feedback-slot"),
          "Not a standard book move from here — try a more common one.", "bad");
        return false;
      }
      const real = game.move({ from, to, promotion: "q" });
      modeState.moveIndex++;
      modeState.matchedOpening = findMatchingOpening();
      board.setPosition(game.board(), { from: real.from, to: real.to });
      updateTurnIndicator();
      // If the user just deviated from the app's target line, pivot the
      // target so the app's next reply leads them somewhere coherent.
      const target = modeState.mysteryTarget;
      if (!target || !isPrefixOf(newSeq, target.moves)) {
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
    flashFeedback(panelEl.querySelector(".feedback-slot"),
      "Not the book move for this opening — try again.", "bad");
    return false;
  }

  function playAutoMove() {
    if (modeState.complete) return;

    let responseSan;
    if (modeState.isMystery) {
      const playedSans = game.history();
      const target = modeState.mysteryTarget;
      // If we're not on a continuing target (e.g. the very first auto-move
      // when user is Black), pick one fresh.
      if (!target || !isPrefixOf(playedSans, target.moves) || playedSans.length >= target.moves.length) {
        const candidates = findCandidateOpenings(playedSans).filter(op => op.moves.length > playedSans.length);
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
      score.total++;
      if (modeState.mistakes === 0) score.correct++;
      SRS.review(modeState.opening.name, modeState.mistakes === 0 ? "good" : "again");
      saveScore();
      renderScore();
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
      score.total++;
      if (nameCorrect) score.correct++;
      SRS.review(target.name, nameCorrect ? "good" : "again");
      saveScore();
      renderScore();
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
      <div class="key-row"><span class="popularity-pill">★★★★</span> ${escapeHtml(POPULARITY_DESCS[4])}</div>
      <div class="key-row"><span class="popularity-pill">★★★☆</span> ${escapeHtml(POPULARITY_DESCS[3])}</div>
      <div class="key-row"><span class="popularity-pill">★★☆☆</span> ${escapeHtml(POPULARITY_DESCS[2])}</div>
      <div class="key-row"><span class="popularity-pill">★☆☆☆</span> ${escapeHtml(POPULARITY_DESCS[1])}</div>
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
    if (currentMode === "explore") return handleExploreMoveAttempt(move);
    return false;
  }

  // Post-completion free play: any legal move is accepted so the user can
  // explore continuations from the resulting position. Triggers engine
  // analysis immediately (eval section is already auto-rendered post-reveal).
  function handleFreeMoveAttempt({ from, to }) {
    const m = game.move({ from, to, promotion: "q" });
    if (!m) return false;
    modeState.lastMove = { from: m.from, to: m.to };
    board.setPosition(game.board(), modeState.lastMove);
    updateTurnIndicator();
    triggerAnalysis();
    return true;
  }

  // ===== UI rendering =====
  function renderPanel(isAfterAnswer) {
    if (currentMode === "practice") {
      if (modeState.questionType === "setup") renderSetupPanel();
      else if (modeState.questionType === "play" || modeState.questionType === "playmystery") renderPlayPanel();
      else renderIdentifyPanel(isAfterAnswer);
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
      // Otherwise clear any leftover arrow.
      if (showEngine || isQuestionRevealed()) triggerAnalysis();
      else board.clearEngineArrow();
      return;
    }
    if (currentMode === "explore") return renderExplorePanel();
  }

  // Renders the "Engine analysis" toggle plus, when on, an eval-slot div
  // for triggerAnalysis to populate. Appended at the bottom of the Practice
  // panel content (before stats).
  // Auto-enables once the current question is fully revealed (Identify
  // answered / Setup complete / Mystery identified) so the user sees the
  // engine's read of the resulting position without having to click.
  function appendEngineAnalysisSection() {
    const wrap = document.createElement("div");
    wrap.className = "engine-section";

    const revealed = isQuestionRevealed();
    const effectiveShow = showEngine || revealed;

    const btn = document.createElement("button");
    btn.className = "engine-toggle" + (effectiveShow ? " active" : "");
    btn.textContent = effectiveShow
      ? (revealed && !showEngine
          ? "Engine analysis (auto-on after completion)"
          : "Engine analysis: ON — click to hide")
      : "Show engine analysis (eval bar + best move arrow)";
    btn.addEventListener("click", () => {
      showEngine = !showEngine;
      saveShowEngine();
      renderPanel();
    });
    wrap.appendChild(btn);

    if (effectiveShow) {
      const slot = document.createElement("div");
      slot.className = "eval-slot";
      wrap.appendChild(slot);
    }
    panelEl.appendChild(wrap);
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
    panelEl.appendChild(renderDeckSummary(deck));
    panelEl.appendChild(renderForecast(fc));
    panelEl.appendChild(renderEcoBreakdown(eco));
    panelEl.appendChild(renderHardest(hardest));
    panelEl.appendChild(renderPillKey());
    panelEl.appendChild(renderEcoKey());
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
      fb.innerHTML = `<strong>${escapeHtml(opening.name)}</strong> (${opening.eco})${renderOpeningPillsHtml(opening, { includeEval: true })}${escapeHtml(opening.description)}${opening.assessment ? `<div class="assessment">${escapeHtml(opening.assessment)}</div>` : ""}<div class="moves-line">Moves: ${formatNumberedSan(opening.moves)}</div>`;
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
      const distractors = getRandomOpenings(5, matchedOpening);
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
    const stars = "★".repeat(pop) + "☆".repeat(4 - pop);
    const popDesc = POPULARITY_DESCS[pop] || "";
    const evalSlot = opts.includeEval
      ? `<span class="eval-pill" data-eval-pill data-tip="Stockfish evaluation of the resulting position at depth 14.\nPositive favors White, negative favors Black.">eval …</span>`
      : "";
    return `
      <div class="opening-pills">
        <span class="side-tag side-${side.toLowerCase()}" data-tip="${escapeHtml(side)}'s opening — the main line ends on ${escapeHtml(side)}'s move.">${side}</span>
        <span class="tier-pill tier-${tier}" data-tip="${escapeHtml(tierInfo.label)} — ${escapeHtml(tierInfo.desc)}">${escapeHtml(tierInfo.label)}</span>
        <span class="popularity-pill" data-tip="${escapeHtml(popDesc)}">${stars}</span>
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

    if (currentMode === "explore") {
      if (e.key === "ArrowLeft") { e.preventDefault(); exploreStep(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); exploreStep(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); exploreStep(-Infinity); }
      else if (e.key === "ArrowDown") { e.preventDefault(); exploreStep(Infinity); }
    }
  });

  // Kick off
  setMode("practice");
})();
