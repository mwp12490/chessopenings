# Chess Openings Trainer (Mac App)

A native-feeling Mac desktop app that trains you on chess openings, powered
by the Stockfish engine.

## Install on your MacBook (no setup, no Terminal)

Every push to this repo triggers a GitHub Actions build that produces a
ready-to-install `.dmg`. To get it:

1. Open the repo's **Actions** tab on GitHub.
2. Click the most recent **Build Mac App** run that has a green check.
3. Scroll to the **Artifacts** section at the bottom and download
   `chess-openings-trainer-mac` — it's a `.zip`.
4. Unzip it. You'll see two `.dmg` files:
   - `Chess Openings Trainer-1.0.0-arm64.dmg` — for Apple Silicon Macs (M1/M2/M3/M4).
   - `Chess Openings Trainer-1.0.0.dmg` — for Intel Macs.
   Not sure which? Click the Apple menu → **About This Mac**. If it says
   "Apple M…", use the `arm64` one.
5. Double-click the `.dmg`, then drag **Chess Openings Trainer** into the
   **Applications** folder.
6. Open Applications and double-click the app. The first time, macOS will say
   it can't be opened because it's from an unidentified developer (the app
   isn't code-signed). Bypass it: **right-click the app → Open → Open**.
   You only have to do this once.

Quit with **⌘Q**.

## Run from source (for developers)

This path requires Node.js. If `npm install` gives you `command not found: npm`,
you don't have Node.js yet — install it from
[nodejs.org](https://nodejs.org/en/download) (download the macOS installer,
double-click, follow the prompts). Then close and reopen Terminal.

Verify with `node -v` — it should print something like `v20.x.x`.

Then:

```bash
git clone <this-repo-url> chess-openings-trainer
cd chess-openings-trainer
npm install
npm start
```

That opens the trainer in its own window. The first `npm install` downloads
Electron (~100 MB); after that, `npm start` launches instantly.

To build the `.dmg` yourself instead of using the GitHub Actions build:

```bash
npm run dist:mac
```

Output lands in `dist/`.

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
