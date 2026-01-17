const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const inputPath = path.join(__dirname, "..", "app", "renderer", "bundle.js");

if (!fs.existsSync(inputPath)) {
  console.error("Renderer bundle not found:", inputPath);
  process.exit(1);
}

const source = fs.readFileSync(inputPath, "utf8");
const options = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.2,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.1,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: true
};

const result = JavaScriptObfuscator.obfuscate(source, options);
fs.writeFileSync(inputPath, result.getObfuscatedCode());
