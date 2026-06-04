// Stockfish 16 (Linrock) NNUE — multi-threaded WASM via lila-stockfish-web.
// Lives in vendor/sf16/. The renderer needs SharedArrayBuffer for the
// pthread workers; main.js makes that available by serving the app under
// a custom "app://" scheme with COOP/COEP headers (cross-origin isolation).
//
// If anything in the new-engine path fails (SAB unavailable, NNUE missing,
// etc.) we fall back to the legacy single-threaded asm.js Stockfish 10
// in vendor/stockfish.js so the app stays usable.

const SF_LOADER_PATH = "../vendor/sf16/sf16-7.js"; // relative to this script
const SF_NNUE_URL    = "vendor/sf16/sf16-7.nnue";  // relative to document
const LEGACY_SF_URL  = "vendor/stockfish.js";

class Engine {
  constructor() {
    // New-engine handle (lila-stockfish-web instance) OR legacy worker.
    this.sf = null;
    this.worker = null;
    this.usingLegacy = false;
    this.engineLabel = "Stockfish";

    this.ready = false;
    this.thinking = false;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this._currentResolve = null;
    this._lastInfo = null;
    this._waitResolvers = [];
  }

  async init() {
    // Cheap pre-flight: SF 16 needs SharedArrayBuffer (multi-threaded
    // pthread workers). If the renderer isn't cross-origin isolated for
    // whatever reason, skip SF 16 entirely so we don't hang for 10s on
    // an init that can't possibly succeed.
    const sabAvailable = (typeof SharedArrayBuffer !== "undefined")
      && (typeof crossOriginIsolated === "undefined" || crossOriginIsolated === true);
    if (!sabAvailable) {
      this._setStatus("loading", "Loading Stockfish 10 (no SAB)…");
      try {
        await this._initLegacy();
        this.ready = true;
        this.usingLegacy = true;
        this.engineLabel = "Stockfish 10 (no SharedArrayBuffer)";
        this._setStatus("ready", this.engineLabel + " ready");
      } catch (err2) {
        this._setStatus("error", "Stockfish unavailable: " + (err2.message || err2));
        throw err2;
      }
      return;
    }
    this._setStatus("loading", "Loading Stockfish 16 NNUE…");
    try {
      await this._initLilaSf();
      this.ready = true;
      this._setStatus("ready", this.engineLabel + " ready");
    } catch (err) {
      // Fallback path: SF 10 asm.js worker, which works without SAB.
      const failureMsg = (err && err.message) ? err.message : String(err);
      console.warn("SF 16 init failed, falling back to SF 10:", err);
      try {
        await this._initLegacy();
        this.ready = true;
        this.usingLegacy = true;
        this.engineLabel = "Stockfish 10 (fallback: " + failureMsg + ")";
        this._setStatus("ready", "Stockfish 10 (fallback — SF 16 failed: " + failureMsg + ")");
      } catch (err2) {
        this._setStatus("error", "Stockfish unavailable: " + (err2.message || err2));
        throw err2;
      }
    }
  }

  async _initLilaSf() {
    // Dynamic ES-module import — the SF loader uses import.meta.url so it
    // must be loaded as a module. Path is relative to engine.js.
    const mod = await import(SF_LOADER_PATH);
    const Sf167Web = mod.default;
    this.sf = await Sf167Web({
      // SF's default locateFile would prepend its own scriptDirectory
      // (= the SF module URL's directory). We use the same — passing
      // (file, scriptDirectory) and concatenating ensures the .wasm load
      // resolves to vendor/sf16/sf16-7.wasm and not document-root.
      locateFile: (file, scriptDirectory) => scriptDirectory + file,
      listen: (line) => this._onMessage(line),
      onError: (msg) => console.error("SF error:", msg)
    });

    this._setStatus("loading", "Loading neural net…");
    const r = await fetch(SF_NNUE_URL);
    if (!r.ok) throw new Error("NNUE fetch failed: HTTP " + r.status);
    const buf = await r.arrayBuffer();
    this.sf.setNnueBuffer(new Uint8Array(buf));

    this.sf.uci("uci");
    await this._waitFor((line) => line === "uciok", 6000);
    this.sf.uci("isready");
    await this._waitFor((line) => line === "readyok", 6000);

    // Use most cores but keep one free for the renderer/UI.
    const threads = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 1) - 1));
    this.sf.uci("setoption name Threads value " + threads);
    this.sf.uci("setoption name Hash value 64"); // 64 MB transposition table
    this.engineLabel = "Stockfish 16 NNUE (" + threads + " thread" + (threads > 1 ? "s" : "") + ")";
  }

  async _initLegacy() {
    this._setStatus("loading", "Loading Stockfish 10 (legacy)…");
    this.worker = new Worker(LEGACY_SF_URL);
    this.worker.onmessage = (e) => this._onMessage(e.data);
    this.worker.onerror = (e) => {
      this._setStatus("error", "Stockfish error: " + (e.message || "unknown"));
    };
    this._sendLegacy("uci");
    await this._waitFor((line) => line === "uciok", 5000);
    this._sendLegacy("isready");
    await this._waitFor((line) => line === "readyok", 5000);
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
      this._setStatus("ready", this.engineLabel + " ready");
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
    if (this.usingLegacy) this._sendLegacy(cmd);
    else if (this.sf) this.sf.uci(cmd);
  }

  _sendLegacy(cmd) {
    if (this.worker) this.worker.postMessage(cmd);
  }

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
      this._setStatus("thinking", this.engineLabel + ": thinking (depth " + depth + ")…");
      this._send("stop");
      this._send("ucinewgame");
      this._send("position fen " + fen);
      this._send("go depth " + depth);
    });
  }

  stop() {
    this._send("stop");
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
