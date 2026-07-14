const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function getUrl() {
  const locations = [path.join(path.dirname(process.execPath), 'desktop-config.json'), path.join(__dirname, 'desktop-config.json')];
  for (const file of locations) {
    try { const config = JSON.parse(fs.readFileSync(file, 'utf8')); if (config.appUrl) return config.appUrl; } catch {}
  }
  return 'http://localhost:8080';
}

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1440, height: 920, minWidth: 1100, minHeight: 700, title: 'CONSTRUCT-OS ERP', autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.loadURL(getUrl()).catch(() => dialog.showErrorBox('Không kết nối được', 'Không mở được CONSTRUCT-OS. Hãy kiểm tra địa chỉ webapp trong desktop-config.json và kết nối mạng.'));
  win.webContents.setWindowOpenHandler(({ url }) => { require('electron').shell.openExternal(url); return { action: 'deny' }; });
});
app.on('window-all-closed', () => app.quit());
