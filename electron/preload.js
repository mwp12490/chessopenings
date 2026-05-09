// Sandboxed preload — exposes a tiny, audited surface for the renderer
// to ask the main process to install an update.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("updater", {
  install: (url) => ipcRenderer.invoke("updater:install", url),
  onProgress: (cb) => {
    const handler = (_e, msg) => cb(msg);
    ipcRenderer.on("updater:progress", handler);
    return () => ipcRenderer.removeListener("updater:progress", handler);
  }
});

// Sync: write/read a JSON file in a folder the user picked (typically a
// folder inside iCloud Drive, OneDrive, Dropbox, or Google Drive — the
// cloud provider does the device-to-device transfer).
contextBridge.exposeInMainWorld("syncFs", {
  pickFolder: () => ipcRenderer.invoke("sync:pickFolder"),
  read: (folder) => ipcRenderer.invoke("sync:read", folder),
  write: (folder, content) => ipcRenderer.invoke("sync:write", folder, content)
});

// One-time migration of localStorage from the old file:// origin to the
// new app:// origin. The renderer reads the dump and applies it locally
// on first launch.
contextBridge.exposeInMainWorld("legacyMigration", {
  read: () => ipcRenderer.invoke("legacy:read"),
  clear: () => ipcRenderer.invoke("legacy:clear")
});
