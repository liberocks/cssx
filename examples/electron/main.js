import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

let mainWindow;
const smokeTimeout =
  process.env.CSSX_ELECTRON_SMOKE === '1'
    ? setTimeout(() => {
        console.error('Electron CSSX smoke test timed out');
        app.exit(1);
      }, 15_000)
    : undefined;

async function createWindow() {
  const smoke = process.env.CSSX_ELECTRON_SMOKE === '1';
  mainWindow = new BrowserWindow({
    height: 760,
    show: !smoke,
    width: 1100,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(import.meta.dirname, 'preload.cjs'),
      sandbox: true,
    },
  });
  const developmentUrl = process.env.CSSX_ELECTRON_URL;
  if (developmentUrl) {
    await mainWindow.loadURL(developmentUrl);
  } else {
    await mainWindow.loadFile(join(import.meta.dirname, 'dist/index.html'));
  }
  if (smoke) {
    const result = await mainWindow.webContents.executeJavaScript(`({
      heading: document.querySelector('h1')?.textContent,
      platform: window.cssxExample?.platform,
      styled: getComputedStyle(document.querySelector('main')).display,
    })`);
    if (result.heading !== 'CSSX desktop styles' || !result.platform || result.styled !== 'flex') {
      console.error('Electron CSSX smoke test failed', result);
      app.exit(1);
      return;
    }
    clearTimeout(smokeTimeout);
    console.log('Electron CSSX smoke test passed');
    app.quit();
  }
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

app
  .whenReady()
  .then(createWindow)
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
