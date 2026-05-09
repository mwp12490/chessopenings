// Electron main process: opens a BrowserWindow that loads the static app.
const { app, BrowserWindow, Menu, shell, ipcMain, dialog, protocol } = require("electron");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const https = require("https");
const { spawn, exec } = require("child_process");

let mainWindow = null;

// We serve the app under a custom "app://" scheme so the renderer is
// cross-origin isolated (COOP/COEP), which lets the multi-threaded
// Stockfish 16 NNUE WASM use SharedArrayBuffer for its pthread workers.
// The same scheme also acts like a normal HTTP origin for fetch() and
// dynamic imports — file:// has restrictions that break both.
protocol.registerSchemesAsPrivileged([{
  scheme: "app",
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
    bypassCSP: false
  }
}]);

const APP_ROOT = path.join(__dirname, "..");
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".nnue": "application/octet-stream",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

async function migrateLegacyLocalStorage() {
  const userData = app.getPath("userData");
  const marker = path.join(userData, "legacy-storage-migrated.flag");
  const dump = path.join(userData, "legacy-storage.json");
  try { await fsp.access(marker); return; } catch (_) { /* not yet migrated */ }
  await fsp.mkdir(userData, { recursive: true });

  const indexPath = path.join(APP_ROOT, "index.html");
  try { await fsp.access(indexPath); } catch (_) {
    await fsp.writeFile(marker, "no-index");
    return;
  }

  const hidden = new BrowserWindow({
    show: false,
    width: 100,
    height: 100,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
      offscreen: true
    }
  });

  // Don't let a misbehaving page hang first launch — cap the migration at
  // 10 seconds. We still write the marker afterwards so we don't retry.
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Legacy migration timeout")), 10000)
  );
  const work = (async () => {
    // ?migration=1 lets app.js know it's just being loaded for a one-shot
    // localStorage capture and shouldn't run its full init.
    await hidden.loadFile(indexPath, { search: "migration=1" });
    const data = await hidden.webContents.executeJavaScript(`
      (() => {
        const out = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          out[k] = localStorage.getItem(k);
        }
        return out;
      })()
    `, true);
    if (data && Object.keys(data).length > 0) {
      await fsp.writeFile(dump, JSON.stringify(data));
    }
  })();

  try {
    await Promise.race([work, timeout]);
  } finally {
    if (!hidden.isDestroyed()) hidden.destroy();
    await fsp.writeFile(marker, "done").catch(() => {});
  }
}

ipcMain.handle("legacy:read", async () => {
  const dump = path.join(app.getPath("userData"), "legacy-storage.json");
  try {
    const raw = await fsp.readFile(dump, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
});

ipcMain.handle("legacy:clear", async () => {
  const dump = path.join(app.getPath("userData"), "legacy-storage.json");
  await fsp.unlink(dump).catch(() => {});
});

// Local-disk backup of the user's progress JSON. Written on every state
// change as a belt-and-suspenders backup against browser-storage loss
// (e.g. origin changes between app versions). Lives in userData so it
// survives app updates regardless of installation path.
const PROGRESS_BACKUP_FILE = "progress-backup.json";

ipcMain.handle("progress:read", async () => {
  const f = path.join(app.getPath("userData"), PROGRESS_BACKUP_FILE);
  try {
    return await fsp.readFile(f, "utf8");
  } catch (e) {
    return null;
  }
});

ipcMain.handle("progress:write", async (_event, json) => {
  if (typeof json !== "string") return false;
  const dir = app.getPath("userData");
  await fsp.mkdir(dir, { recursive: true });
  const f = path.join(dir, PROGRESS_BACKUP_FILE);
  // Atomic write: write to a temp file, then rename. Avoids leaving a
  // half-written file if the process is killed mid-write.
  const tmp = f + ".tmp";
  await fsp.writeFile(tmp, json, "utf8");
  await fsp.rename(tmp, f);
  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 560,
    minHeight: 600,
    title: "Chess Openings Trainer",
    backgroundColor: "#16181d",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js")
    }
  });

  win.loadURL("app://./index.html");

  // Open external links in the system browser instead of inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow = win;
}

app.whenReady().then(async () => {
  // Serve files from APP_ROOT with COOP/COEP headers so the renderer is
  // cross-origin isolated — required for SharedArrayBuffer / threaded WASM.
  // COEP=credentialless lets the page still fetch external no-credentials
  // resources (e.g. the GitHub API for update checks) without needing each
  // server to opt in via Cross-Origin-Resource-Policy.
  protocol.handle("app", async (request) => {
    try {
      const u = new URL(request.url);
      const rel = decodeURIComponent(u.pathname.replace(/^\//, "")) || "index.html";
      const filePath = path.normalize(path.join(APP_ROOT, rel));
      if (!filePath.startsWith(APP_ROOT)) {
        return new Response("Forbidden", { status: 403 });
      }
      const data = await fsp.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const headers = {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Cache-Control": "no-cache"
      };
      return new Response(data, { status: 200, headers });
    } catch (e) {
      return new Response("Not found", { status: 404 });
    }
  });

  // One-time migration: previous versions loaded the app via file://, which
  // gave it a different origin from the new app:// scheme — so localStorage
  // (SRS state, sync folder, filters) would otherwise be inaccessible. We
  // briefly load the same index.html under file:// in a hidden window,
  // copy its localStorage to disk, and have the renderer pull it on first
  // launch. Skipped on subsequent runs via a marker file.
  await migrateLegacyLocalStorage().catch((e) => {
    console.warn("Legacy localStorage migration skipped:", e);
  });

  createWindow();

  // macOS: re-create a window when the dock icon is clicked and no windows are open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Minimal menu so Cmd+Q, Cmd+W, Cmd+R, devtools, etc. work as expected on macOS.
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    { role: "windowMenu" }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ===== In-app updater (macOS only) =====
// Triggered by the renderer when the user clicks "Install & Restart" on the
// update banner. Downloads the DMG, mounts it, copies the .app to a staging
// path, then spawns a detached shell script that — after our app quits —
// swaps the new bundle into /Applications, strips quarantine, and reopens.

ipcMain.handle("updater:install", async (_event, url) => {
  if (process.platform !== "darwin" && process.platform !== "win32") {
    throw new Error("In-app update is implemented only on macOS and Windows.");
  }
  if (!url || !/^https:\/\//.test(url)) {
    throw new Error("Invalid update URL.");
  }

  const send = (msg) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("updater:progress", msg);
    }
  };

  const tmp = os.tmpdir();
  const stamp = Date.now();

  // Throttled progress reporter so we don't spam the renderer.
  let lastPctSent = -1;
  const onDlProgress = (received, total) => {
    if (!total) {
      const mb = (received / (1024 * 1024)).toFixed(1);
      send(`Downloading… ${mb} MB`);
      return;
    }
    const pct = Math.floor((received / total) * 100);
    if (pct !== lastPctSent) {
      lastPctSent = pct;
      const mb = (received / (1024 * 1024)).toFixed(1);
      const totalMb = (total / (1024 * 1024)).toFixed(1);
      send(`Downloading… ${pct}% (${mb} / ${totalMb} MB)`);
    }
  };

  if (process.platform === "win32") {
    // Windows: download the NSIS installer and launch it. The user steps
    // through the (small) installer dialog; NSIS handles upgrading the
    // existing installation in place. We exit so the installer can replace
    // our running binary.
    const exePath = path.join(tmp, `cot-update-${stamp}.exe`);
    send("Downloading… 0%");
    await downloadHttps(url, exePath, onDlProgress);
    send("Launching installer…");
    shell.openPath(exePath).catch(() => {});
    setTimeout(() => app.quit(), 500);
    return { ok: true };
  }

  // macOS path
  const dmgPath = path.join(tmp, `cot-update-${stamp}.dmg`);
  const mountPoint = path.join(tmp, `cot-mount-${stamp}`);
  const stagedApp = path.join(tmp, `cot-staged-${stamp}.app`);
  const installerSh = path.join(tmp, `cot-install-${stamp}.sh`);

  // 1. Download.
  send("Downloading… 0%");
  await downloadHttps(url, dmgPath, onDlProgress);

  // 2. Mount.
  send("Mounting installer…");
  await execp(`/usr/bin/hdiutil attach ${shq(dmgPath)} -nobrowse -mountpoint ${shq(mountPoint)}`);

  try {
    // 3. Copy the .app from the mounted DMG to a staging location in /tmp.
    send("Extracting…");
    const innerApp = path.join(mountPoint, "Chess Openings Trainer.app");
    await execp(`/bin/cp -R ${shq(innerApp)} ${shq(stagedApp)}`);
  } finally {
    // 4. Always detach the DMG.
    await execp(`/usr/bin/hdiutil detach ${shq(mountPoint)} -quiet || true`).catch(() => {});
  }

  // 5. Best-effort cleanup of the downloaded DMG.
  await fsp.unlink(dmgPath).catch(() => {});

  // 6. Write a small installer script that runs after we quit. It moves the
  //    staged .app into /Applications, removes the quarantine attr, and
  //    relaunches.
  const installerBody = [
    "#!/bin/bash",
    "set -e",
    "sleep 2",
    'TARGET="/Applications/Chess Openings Trainer.app"',
    `STAGED=${shq(stagedApp)}`,
    'rm -rf "$TARGET"',
    'mv "$STAGED" "$TARGET"',
    'xattr -cr "$TARGET" 2>/dev/null || true',
    'open "$TARGET"',
    ""
  ].join("\n");
  await fsp.writeFile(installerSh, installerBody, { mode: 0o755 });

  // 7. Spawn the installer detached so it survives our quit, then quit.
  send("Restarting…");
  const child = spawn("/bin/bash", [installerSh], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();

  setTimeout(() => app.quit(), 200);
  return { ok: true };
});

// Follows redirects (GitHub release asset URLs redirect to S3-hosted URLs).
// onProgress(receivedBytes, totalBytes) is called as data streams in. totalBytes
// may be 0 if the server didn't send Content-Length.
function downloadHttps(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    let redirectsLeft = 5;
    const visit = (currentUrl) => {
      https.get(currentUrl, { headers: { "User-Agent": "chess-openings-trainer-updater" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectsLeft-- <= 0) return reject(new Error("Too many redirects"));
          res.resume();
          return visit(res.headers.location);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error("Download failed: HTTP " + res.statusCode));
        }
        const total = parseInt(res.headers["content-length"] || "0", 10) || 0;
        let received = 0;
        if (typeof onProgress === "function") {
          res.on("data", (chunk) => {
            received += chunk.length;
            try { onProgress(received, total); } catch (e) {}
          });
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close((err) => err ? reject(err) : resolve()));
        file.on("error", reject);
      }).on("error", reject);
    };
    visit(url);
  });
}

function execp(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

// Single-quote-quote a path for a shell command.
function shq(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

// ===== Cloud-folder sync =====
// The renderer asks the user to pick a folder once (typically inside their
// Google Drive / iCloud / OneDrive / Dropbox install on this machine), and
// from then on the app writes a progress.json there on every state change
// and reads it on launch. The cloud client syncs the file device-to-device.

const SYNC_FILENAME = "chess-openings-progress.json";

ipcMain.handle("sync:pickFolder", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose sync folder (e.g. inside Google Drive)",
    message: "Pick a folder that's synced by your cloud client. The app will write progress.json there.",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || !result.filePaths || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle("sync:read", async (_event, folder) => {
  if (!folder) return null;
  const filePath = path.join(folder, SYNC_FILENAME);
  try {
    return await fsp.readFile(filePath, "utf8");
  } catch (e) {
    return null;
  }
});

ipcMain.handle("sync:write", async (_event, folder, content) => {
  if (!folder) throw new Error("No sync folder configured");
  const filePath = path.join(folder, SYNC_FILENAME);
  await fsp.writeFile(filePath, content, "utf8");
  return filePath;
});
