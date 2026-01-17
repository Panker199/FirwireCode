const { ipcMain, BrowserWindow } = require("electron");

ipcMain.on("win:min", e => {
  BrowserWindow.fromWebContents(e.sender).minimize();
});

ipcMain.on("win:close", e => {
  BrowserWindow.fromWebContents(e.sender).close();
});
