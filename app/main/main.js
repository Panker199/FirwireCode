const { app } = require("electron");
const { createWindow } = require("./window");

require("./ipc");
require("./controls");

const disableGpu =
  process.argv.includes("--disable-wormgpt-gpu") ||
  process.argv.includes("--disable-gpu") ||
  /^1|true$/i.test(process.env.WORMGPT_DISABLE_GPU || "");

if (disableGpu) {
  app.disableHardwareAcceleration();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
