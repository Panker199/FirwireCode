const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const baseDir = app && app.getPath ? app.getPath("userData") : process.cwd();
const fileName = "wormgpt-data.json";
const file = path.join(baseDir, fileName);

function resolveFile() {
  return file;
}

exports.load = () => {
  const target = resolveFile();
  if (!fs.existsSync(target)) return {};
  try {
    return JSON.parse(fs.readFileSync(target, "utf8"));
  } catch (err) {
    return {};
  }
};

exports.save = (data) => {
  const target = resolveFile();
  fs.writeFileSync(target, JSON.stringify(data, null, 2));
};
