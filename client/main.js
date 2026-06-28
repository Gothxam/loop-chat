const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PROD_URL = 'https://loop-hole.vercel.app';

let mainWindow = null;
let tray = null;

function createWindow(showOnCreate = true) {
  mainWindow = new BrowserWindow({
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
    show: showOnCreate,
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

  // Intercept window close event to hide it instead of quitting
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Handle window titles dynamically
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, 'public', 'icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Exit', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Loop Chat');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  // Set Application User Model ID for Windows Notifications
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.gothxam.loopchat');
  }

  // IPC main handlers
  ipcMain.on('window:show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.on('app:toggle-autostart', (event, enable) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath('exe'),
      args: ['--hidden']
    });
  });

  ipcMain.handle('app:get-autostart', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  const startHidden = process.argv.includes('--hidden');
  createWindow(!startHidden);
  createTray();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  // Auto-Updater Logging and Handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Auto-Updater: Checking for update...');
  });
  autoUpdater.on('update-available', (info) => {
    console.log('Auto-Updater: Update available! Version:', info.version);
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log('Auto-Updater: Update not available.');
  });
  autoUpdater.on('error', (err) => {
    console.error('Auto-Updater: Error in auto-updater:', err);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Auto-Updater: Downloaded ${Math.round(progressObj.percent)}%`);
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Auto-Updater: Update downloaded. Prompting user to apply...');
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'A new version of Loop Chat has been downloaded. Restart the app to apply the update?',
      buttons: ['Restart Now', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
