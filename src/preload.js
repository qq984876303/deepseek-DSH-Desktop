const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dshDesktop', {
  saveKey: (key) => ipcRenderer.send('setup:save-key', key),
});
