# Chess Openings Trainer (Mac App)

A native-feeling Mac desktop app that trains you on chess openings, powered
by the Stockfish engine.

## Run it on your MacBook

You need [Node.js](https://nodejs.org/) installed (any recent LTS, e.g. 20+).
Check by running `node -v` in Terminal — if it prints a version, you're good.

Then, in Terminal:

```bash
git clone <this-repo-url> chess-openings-trainer
cd chess-openings-trainer
npm install
npm start
```

That opens the trainer in its own window. Quit with **⌘Q**.

> The first `npm install` downloads Electron (~100 MB). After that, `npm
> start` launches instantly.

## Build a `.app` bundle / `.dmg` installer

If you want a permanent app you can drag into `/Applications`:

```bash
npm run dist:mac
```

This produces (in `dist/`):

- `Chess Openings Trainer-1.0.0-arm64.dmg` — drag-to-install image (Apple Silicon)
- `Chess Openings Trainer-1.0.0.dmg` — Intel Mac version
- `mac-arm64/Chess Openings Trainer.app` — the bare app bundle

Open the `.dmg` and drag the app into Applications. macOS Gatekeeper will
warn the first time because the app isn't code-signed (only matters if you
distribute it). To open it anyway: right-click → **Open**, then confirm.

## What's inside

Four modes, switchable via the tabs at the top:

| Mode | What you do |
|------|-------------|
| **Identify Opening** | Look at the board, pick the opening's name from four choices. |
| **Set Up Opening** | Read the opening's name, drag pieces to reproduce its main line. Hint and "Show solution" available. |
| **Explore** | Browse 70 named openings with search, descriptions, and step-through. |
| **Engine Analysis** | Free-play board with live Stockfish evaluation, eval bar, and best-line preview. |

Score (correct/total) is saved between sessions.

## Tech

- **Electron** — desktop window
- **chess.js** — move legality and SAN parsing (vendored at `vendor/chess.min.js`)
- **Stockfish.js 10** — engine, runs as a Web Worker (vendored at `vendor/stockfish.js`)
- Plain HTML/CSS/JS for the UI — no build step

Everything runs locally; no internet needed after `npm install`.

## Project layout

```
electron/main.js     # Electron main process — creates the window
index.html           # The page Electron loads
css/styles.css       # Dark theme, board, panels
vendor/chess.min.js  # chess.js move logic
vendor/stockfish.js  # Stockfish engine (Web Worker)
js/openings.js       # 70-opening database + helpers
js/board.js          # Visual chess board (drag + click)
js/engine.js         # Stockfish wrapper
js/app.js            # Mode dispatcher and UI rendering
```

## Adding more openings

Edit `js/openings.js`. Each entry is:

```js
{
  name: "Opening Name",
  eco: "A00",
  moves: ["e4", "e5", "Nf3"],     // SAN moves in order
  description: "Short blurb.",
  aliases: ["Other Name"]          // optional
}
```

The app validates every opening's move sequence against chess.js at startup;
typos are logged to the DevTools console (View → Toggle Developer Tools).
