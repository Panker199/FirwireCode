const { ipcMain, BrowserWindow } = require("electron");

ipcMain.on("win:min", e => {
  BrowserWindow.fromWebContents(e.sender).minimize();
});

ipcMain.on("win:max", e => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on("win:close", e => {
  BrowserWindow.fromWebContents(e.sender).close();
});
