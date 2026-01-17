const { BrowserWindow, app } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: "#070204",
    icon: path.join(__dirname, "../../assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      devTools: !app.isPackaged
    }
  });

  win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

module.exports = { createWindow };
