const { contextBridge } = require('electron');

// Expose safe, selected desktop APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
