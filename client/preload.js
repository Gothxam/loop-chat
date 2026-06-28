const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, selected desktop APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  showWindow: () => ipcRenderer.send('window:show'),
  toggleAutoStart: (enable) => ipcRenderer.send('app:toggle-autostart', enable),
  getAutoStart: () => ipcRenderer.invoke('app:get-autostart'),
});
