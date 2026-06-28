const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PROD_URL = 'https://loop-hole.vercel.app';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: 'Loop Chat',
    backgroundColor: '#09090b',
    autoHideMenuBar: true, // Hides standard file/edit menu bar
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b', // Match our Zinc-950 background
      symbolColor: '#f4f4f5', // Zinc-100 close/min/max symbols
      height: 36
    },
    icon: path.join(__dirname, 'public/favicon.ico'), // Fallback icon path
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Open Chrome DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(PROD_URL);
  }

  // Handle window titles dynamically
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });
}

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
