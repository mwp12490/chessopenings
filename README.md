# Chess Openings Trainer

A self-contained web app that helps you learn chess openings by name and by
move-order. Built with [chess.js](https://github.com/jhlywa/chess.js) for move
validation and [Stockfish](https://stockfishchess.org/) (loaded as a Web
Worker) for engine analysis.

## Features

- **Identify Opening** — see a position on the board, pick its name from four
  choices.
- **Set Up Opening** — see the opening's name, play the moves on the board to
  reproduce the canonical line. Hint and "show solution" available.
- **Explore** — browse 60+ named openings with searchable list, step through
  each move, and see ECO codes plus descriptions.
- **Engine Analysis** — free-play board with continuous Stockfish evaluation,
  best-line preview, and FEN load/undo.
- **Score tracking** — running correct/total ratio persisted in localStorage.
- **Drag-and-drop & click-to-move** with last-move highlights, legal-square
  dots, and a flippable board.

## Database

The app currently ships with these opening families:

- King's-pawn classics: Italian Game, Giuoco Piano, Evans Gambit, Two Knights,
  Ruy Lopez (incl. Berlin), Scotch, Four Knights, Vienna, King's Gambit,
  Bishop's Opening, Center Game, Danish Gambit, Petrov, Philidor, Latvian.
- Sicilian: main Sicilian plus Najdorf, Dragon, Sveshnikov, Scheveningen,
  Taimanov, Kan, Accelerated Dragon, Alapin, Closed, Smith-Morra, Grand Prix.
- 1.e4 alternatives: French (Advance/Winawer/Tarrasch/Exchange), Caro-Kann
  (Classical/Advance/Panov), Scandinavian, Pirc, Modern, Alekhine,
  Nimzowitsch.
- Queen's-pawn: Queen's Gambit (Accepted/Declined), Slav, Semi-Slav, Albin,
  King's Indian, Grünfeld, Nimzo-/Queen's-/Bogo-Indian, Catalan, Benoni,
  Modern Benoni, Benko, Dutch, London, Trompowsky, Torre, Colle, Veresov.
- Flank: English, Réti, King's Indian Attack, Bird, Larsen, Sokolsky, Grob.

You can extend the list by editing [`js/openings.js`](js/openings.js). The
startup pass calls `validateOpenings()` which logs any opening whose move
sequence chess.js can't parse — so typos surface immediately in the console.

## Running locally

The app is plain static HTML/JS, but it must be served over HTTP(S) (not
opened with `file://`) because:

1. The Stockfish engine is fetched from a CDN and wrapped in a Blob Web
   Worker, which fails under the `file://` origin.
2. localStorage persistence is per-origin.

Pick any static server. Examples:

```bash
# Python 3
python3 -m http.server 8000

# Node (no install)
npx --yes serve .

# PHP
php -S localhost:8000
```

Then open http://localhost:8000/.

## Stockfish version

The app loads `stockfish.js@10.0.2` from jsDelivr — a pure-JS build that runs
in any modern browser without needing `SharedArrayBuffer` or special HTTP
headers. To swap in a newer NNUE build, change `STOCKFISH_URL` in
[`js/engine.js`](js/engine.js) and configure your host with the required
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` headers if the build needs
threads/SharedArrayBuffer.

## Project layout

```
index.html           # Page shell + script load order
css/styles.css       # Dark theme, board, panel, status bar
js/openings.js       # Openings database + helpers (FEN-from-moves, validate)
js/board.js          # Visual chess board (click + drag)
js/engine.js         # Stockfish Web Worker wrapper
js/app.js            # Mode dispatcher and UI rendering
```

## Notes

- Setup mode enforces the canonical move order. Some openings transpose; if
  you want loose matching, swap the SAN compare in `handleSetupMoveAttempt`
  for a position-based check (compare FEN of resulting position to the
  opening's expected FEN at that ply).
- The score counts a setup attempt as correct only if you reach the final
  position with no rejected moves.
