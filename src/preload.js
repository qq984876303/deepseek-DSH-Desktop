const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dshDesktop', {
  getInitial: () => ipcRenderer.invoke('setup:initial'),
  submit: (payload) => ipcRenderer.invoke('setup:submit', payload),
});
