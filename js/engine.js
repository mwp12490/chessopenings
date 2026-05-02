// Stockfish integration via Web Worker. We fetch the engine from a CDN as text
// and wrap it in a Blob worker so cross-origin classic worker rules apply
// uniformly across hosts.

const STOCKFISH_URL =
  "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js";

class Engine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.thinking = false;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this._currentResolve = null;
    this._lastInfo = null;
  }

  async init() {
    this._setStatus("loading", "Loading Stockfish…");
    try {
      const res = await fetch(STOCKFISH_URL);
      if (!res.ok) throw new Error("Failed to fetch Stockfish: " + res.status);
      const code = await res.text();
      const blob = new Blob([code], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url);
      this.worker.onmessage = (e) => this._onMessage(e.data);
      this.worker.onerror = (e) => {
        this._setStatus("error", "Stockfish error: " + (e.message || "unknown"));
      };
      this._send("uci");
      await this._waitFor((line) => line === "uciok", 5000);
      this._send("isready");
      await this._waitFor((line) => line === "readyok", 5000);
      this.ready = true;
      this._setStatus("ready", "Stockfish ready");
    } catch (err) {
      this._setStatus("error", "Stockfish unavailable: " + err.message);
      throw err;
    }
  }

  _onMessage(line) {
    if (typeof line !== "string") return;
    if (line.startsWith("info ")) {
      const info = parseInfo(line);
      if (info) {
        this._lastInfo = info;
        for (const l of this.listeners) l(info);
      }
    } else if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const best = parts[1];
      this.thinking = false;
      this._setStatus("ready", "Stockfish ready");
      if (this._currentResolve) {
        const fn = this._currentResolve;
        this._currentResolve = null;
        fn({ bestmove: best, info: this._lastInfo });
      }
    }
    if (this._waitResolvers.length) {
      for (let i = this._waitResolvers.length - 1; i >= 0; i--) {
        const w = this._waitResolvers[i];
        if (w.test(line)) {
          this._waitResolvers.splice(i, 1);
          w.resolve(line);
        }
      }
    }
  }

  _send(cmd) {
    if (this.worker) this.worker.postMessage(cmd);
  }

  _waitResolvers = [];
  _waitFor(test, timeoutMs) {
    return new Promise((resolve, reject) => {
      const w = { test, resolve };
      this._waitResolvers.push(w);
      if (timeoutMs) {
        setTimeout(() => {
          const i = this._waitResolvers.indexOf(w);
          if (i >= 0) {
            this._waitResolvers.splice(i, 1);
            reject(new Error("Engine timeout"));
          }
        }, timeoutMs);
      }
    });
  }

  onInfo(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onStatus(fn) { this.statusListeners.add(fn); return () => this.statusListeners.delete(fn); }

  _setStatus(state, msg) {
    for (const l of this.statusListeners) l({ state, msg });
  }

  // Analyze a FEN to a fixed depth. Resolves with {bestmove, info}.
  analyze(fen, opts = {}) {
    if (!this.ready) return Promise.reject(new Error("Engine not ready"));
    const depth = opts.depth || 14;
    return new Promise((resolve) => {
      this._currentResolve = resolve;
      this._lastInfo = null;
      this.thinking = true;
      this._setStatus("thinking", "Stockfish: thinking (depth " + depth + ")…");
      this._send("stop");
      this._send("ucinewgame");
      this._send("position fen " + fen);
      this._send("go depth " + depth);
    });
  }

  stop() {
    if (this.worker) this._send("stop");
  }
}

function parseInfo(line) {
  // Parse selected fields from a UCI "info" line
  const out = {};
  const tokens = line.split(" ");
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "depth") out.depth = parseInt(tokens[++i], 10);
    else if (t === "seldepth") out.seldepth = parseInt(tokens[++i], 10);
    else if (t === "nodes") out.nodes = parseInt(tokens[++i], 10);
    else if (t === "nps") out.nps = parseInt(tokens[++i], 10);
    else if (t === "time") out.time = parseInt(tokens[++i], 10);
    else if (t === "score") {
      const kind = tokens[++i];
      const v = parseInt(tokens[++i], 10);
      if (kind === "cp") out.cp = v;
      else if (kind === "mate") out.mate = v;
    } else if (t === "pv") {
      out.pv = tokens.slice(i + 1);
      break;
    }
  }
  return out;
}
