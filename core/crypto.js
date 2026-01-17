const crypto = require("crypto");

const CURRENT_SEED = "wormgpt";
const LEGACY_SEED = String.fromCharCode(110, 101, 120, 117, 115, 45, 97, 105);

function deriveKey(seed) {
  return crypto.scryptSync(seed, "salt", 32);
}

const CURRENT_KEY = deriveKey(CURRENT_SEED);
const LEGACY_KEY = deriveKey(LEGACY_SEED);

function decryptWithKey(key, ivHex, encHex) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(ivHex, "hex")
  );
  return decipher.update(encHex, "hex", "utf8") + decipher.final("utf8");
}

exports.encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", CURRENT_KEY, iv);
  return (
    iv.toString("hex") +
    ":" +
    cipher.update(text, "utf8", "hex") +
    cipher.final("hex")
  );
};

exports.decrypt = (data) => {
  const [ivHex, encHex] = String(data || "").split(":");
  if (!ivHex || !encHex) throw new Error("Invalid encrypted payload");
  try {
    return decryptWithKey(CURRENT_KEY, ivHex, encHex);
  } catch (err) {
    return decryptWithKey(LEGACY_KEY, ivHex, encHex);
  }
};
