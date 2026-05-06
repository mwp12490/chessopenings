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
