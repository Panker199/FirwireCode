const { BrowserWindow, BrowserView, app, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;
let browserView = null;

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
      devTools: !app.isPackaged,
      webviewTag: true
    }
  });

  mainWindow = win;
  win.loadFile(path.join(__dirname, "../renderer/index.html"));

  win.on("closed", () => {
    mainWindow = null;
    if (browserView) {
      browserView.destroy();
      browserView = null;
    }
  });

  setupBrowserViewIPC();
}

function setupBrowserViewIPC() {
  ipcMain.handle("browser:create", (_, { url, bounds }) => {
    if (!mainWindow) return { ok: false, error: "No main window" };

    if (browserView) {
      browserView.destroy();
      browserView = null;
    }

    browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    mainWindow.setBrowserView(browserView);
    browserView.setBounds(bounds || { x: 0, y: 0, width: 800, height: 600 });
    browserView.webContents.loadURL(url || "about:blank");

    return { ok: true };
  });

  ipcMain.handle("browser:setBounds", (_, bounds) => {
    if (browserView) {
      browserView.setBounds(bounds);
      return { ok: true };
    }
    return { ok: false, error: "No browser view" };
  });

  ipcMain.handle("browser:navigate", (_, url) => {
    if (browserView) {
      browserView.webContents.loadURL(url);
      return { ok: true };
    }
    return { ok: false, error: "No browser view" };
  });

  ipcMain.handle("browser:goBack", () => {
    if (browserView && browserView.webContents.canGoBack()) {
      browserView.webContents.goBack();
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.handle("browser:goForward", () => {
    if (browserView && browserView.webContents.canGoForward()) {
      browserView.webContents.goForward();
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.handle("browser:reload", () => {
    if (browserView) {
      browserView.webContents.reload();
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.handle("browser:getURL", () => {
    if (browserView) {
      return { ok: true, url: browserView.webContents.getURL() };
    }
    return { ok: false, url: "" };
  });

  ipcMain.handle("browser:getTitle", () => {
    if (browserView) {
      return { ok: true, title: browserView.webContents.getTitle() };
    }
    return { ok: false, title: "" };
  });

  ipcMain.handle("browser:destroy", () => {
    if (browserView) {
      if (mainWindow) mainWindow.removeBrowserView(browserView);
      browserView.destroy();
      browserView = null;
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.handle("browser:canGoBack", () => {
    return browserView ? browserView.webContents.canGoBack() : false;
  });

  ipcMain.handle("browser:canGoForward", () => {
    return browserView ? browserView.webContents.canGoForward() : false;
  });

  ipcMain.on("browser:updateBounds", (_, bounds) => {
    if (browserView) {
      browserView.setBounds(bounds);
    }
  });
}

module.exports = { createWindow };
