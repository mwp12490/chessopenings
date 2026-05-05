// Anki-style spaced repetition for the openings deck.
// SM-2 with simplified grade mapping. Per-opening state persisted to localStorage.
// Exposes a small global: window.SRS = { pickNext, review }.

(() => {
  const SRS_KEY = "chess-openings-trainer.srs";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const NEW_PER_SESSION = 10;

  // Card shape: { reps, lapses, interval, ease, due, lastReview }
  let state = load();
  let newThisSession = 0;

  function load() {
    try {
      const raw = localStorage.getItem(SRS_KEY);
      if (raw) return JSON.parse(raw) || {};
    } catch (e) {}
    return {};
  }

  function save() {
    try { localStorage.setItem(SRS_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // Pick the opening to study next from `pool`.
  // Priority: overdue cards > new cards (capped per session) > soonest future.
  function pickNext(pool) {
    const now = Date.now();
    const annotated = pool.map(o => ({ opening: o, card: state[o.name] || null }));

    const due = annotated.filter(x => x.card && x.card.due <= now);
    if (due.length) {
      due.sort((a, b) => a.card.due - b.card.due);
      const top = due.slice(0, Math.min(5, due.length));
      return top[Math.floor(Math.random() * top.length)].opening;
    }

    const newCards = annotated.filter(x => !x.card);
    if (newCards.length && newThisSession < NEW_PER_SESSION) {
      newThisSession++;
      return newCards[Math.floor(Math.random() * newCards.length)].opening;
    }

    const future = annotated.filter(x => x.card);
    if (future.length) {
      future.sort((a, b) => a.card.due - b.card.due);
      return future[0].opening;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // grade: "again" (forgot/mistake) | "good" (correct) | "easy" (correct, easy)
  function review(name, grade) {
    const now = Date.now();
    let card = state[name] || {
      reps: 0, lapses: 0, interval: 0, ease: 2.5, due: now, lastReview: null
    };

    if (grade === "again") {
      card.lapses++;
      card.reps = 0;
      card.interval = 0;
      card.ease = Math.max(1.3, card.ease - 0.2);
      card.due = now + 60 * 1000; // 1 minute relearning step
    } else if (grade === "easy") {
      if (card.reps === 0) card.interval = 4;
      else if (card.reps === 1) card.interval = 7;
      else card.interval = Math.max(1, Math.round(card.interval * card.ease * 1.3));
      card.reps++;
      card.ease = Math.min(3.5, card.ease + 0.15);
      card.due = now + card.interval * DAY_MS;
    } else { // "good"
      if (card.reps === 0) card.interval = 1;
      else if (card.reps === 1) card.interval = 3;
      else card.interval = Math.max(1, Math.round(card.interval * card.ease));
      card.reps++;
      card.due = now + card.interval * DAY_MS;
    }

    card.lastReview = now;
    state[name] = card;
    save();
    return card;
  }

  // ===== Stats =====

  // Counts by mastery bucket. interval thresholds borrowed from Anki:
  // young = seen and graduated but interval < 21d, mature = >= 21d.
  function deckStats(pool) {
    const now = Date.now();
    let nNew = 0, nLearning = 0, nYoung = 0, nMature = 0, nDue = 0;
    for (const o of pool) {
      const c = state[o.name];
      if (!c) { nNew++; continue; }
      if (c.due <= now) nDue++;
      if (c.reps === 0) nLearning++;
      else if (c.interval < 21) nYoung++;
      else nMature++;
    }
    return { nNew, nLearning, nYoung, nMature, nDue, total: pool.length };
  }

  // Top N openings you struggle with: most lapses first, then lowest ease.
  // Excludes cards you've barely seen (reps + lapses < 2) so the list is signal.
  function hardest(pool, n) {
    return pool
      .map(o => ({ opening: o, card: state[o.name] }))
      .filter(x => x.card && (x.card.lapses + x.card.reps) >= 2 && x.card.lapses > 0)
      .sort((a, b) => (b.card.lapses - a.card.lapses) || (a.card.ease - b.card.ease))
      .slice(0, n || 5);
  }

  // Mastery breakdown by ECO family letter (A–E).
  // "known" = card exists and has at least one successful rep.
  function byEco(pool) {
    const groups = {};
    for (const fam of ["A", "B", "C", "D", "E"]) groups[fam] = { known: 0, total: 0 };
    for (const o of pool) {
      const fam = (o.eco || "")[0];
      if (!groups[fam]) continue;
      groups[fam].total++;
      const c = state[o.name];
      if (c && c.reps >= 1) groups[fam].known++;
    }
    return groups;
  }

  // Number of cards coming due in upcoming windows.
  // today = next 24h (includes already-overdue), tomorrow = 24–48h, week = 2–7d.
  function forecast(pool) {
    const now = Date.now();
    const tToday = now + DAY_MS;
    const tTomorrow = now + 2 * DAY_MS;
    const tWeek = now + 7 * DAY_MS;
    let today = 0, tomorrow = 0, week = 0;
    for (const o of pool) {
      const c = state[o.name];
      if (!c) continue;
      if (c.due <= tToday) today++;
      else if (c.due <= tTomorrow) tomorrow++;
      else if (c.due <= tWeek) week++;
    }
    return { today, tomorrow, week };
  }

  window.SRS = { pickNext, review, deckStats, hardest, byEco, forecast,
    getCard: (name) => state[name] || null };
})();
