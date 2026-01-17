const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const baseDir = app && app.getPath ? app.getPath("userData") : process.cwd();
const fileName = "wormgpt-data.json";
const legacyFileName = String.fromCharCode(
  110,
  101,
  120,
  117,
  115,
  45,
  100,
  97,
  116,
  97,
  46,
  106,
  115,
  111,
  110
);
const file = path.join(baseDir, fileName);
const legacyFile = path.join(baseDir, legacyFileName);

function resolveFile() {
  if (fs.existsSync(file)) return file;
  if (fs.existsSync(legacyFile)) {
    try {
      fs.renameSync(legacyFile, file);
      return file;
    } catch (err) {
      return legacyFile;
    }
  }
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
