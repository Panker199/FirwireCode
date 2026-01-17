const { ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");
const { askGroq, testGroqKey } = require("../../core/groq");
const { decrypt, encrypt } = require("../../core/crypto");
const { load, save } = require("../../core/storage");
const { trim } = require("../../core/trim");

const IDENTITY_RESPONSE =
  "I was developed and I'm maintained by Lahiru Sanjika (Cyber Security Researcher). Official GitHub: https://github.com/lahirusanjika";
const IDENTITY_DETAILS =
  "You can view the developer's public tools and projects on that GitHub profile.";
const DATA_OWNERSHIP_RESPONSE =
  "I can't determine legal ownership of data. For ownership, licensing, or privacy questions, refer to the tool's terms or the developer's documentation.";
const REVERSE_ENGINEERING_RESPONSE =
  "I can't help with reverse engineering, decompiling, cracking, or bypassing protections for this tool.";

function getKeyFilePaths() {
  const candidates = new Set([path.join(process.cwd(), "api.txt")]);

  if (app && app.getAppPath) {
    try {
      candidates.add(path.join(app.getAppPath(), "api.txt"));
    } catch (err) {
      // Ignore app path lookup failures.
    }
  }

  if (app && app.isPackaged && app.getPath) {
    try {
      const exeDir = path.dirname(app.getPath("exe"));
      candidates.add(path.join(exeDir, "api.txt"));
    } catch (err) {
      // Ignore exe path lookup failures.
    }
  }

  return Array.from(candidates);
}

function removeKeyFiles() {
  for (const candidate of getKeyFilePaths()) {
    if (!fs.existsSync(candidate)) continue;
    try {
      fs.unlinkSync(candidate);
    } catch (err) {
      // Ignore key file cleanup failures.
    }
  }
}

function normalizeQuery(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLastUserText(messages) {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (item && item.role === "user" && typeof item.content === "string") {
      return item.content;
    }
  }
  return "";
}

function isIdentityQuery(text) {
  const normalized = normalizeQuery(text);
  if (!normalized) return false;

  if (/are you lahiru'?s ai\b/.test(normalized)) return true;
  if (/\blahiru\b/.test(normalized) && /\b(ai|assistant|tool|app)\b/.test(normalized)) {
    return true;
  }

  const shortMatches = [
    "who made you",
    "who created you",
    "who built you",
    "who developed you",
    "who is your owner",
    "who is your developer",
    "who is your creator",
    "who maintains you",
    "who is the developer",
    "who is the owner",
    "who made this",
    "who created this",
    "who built this"
  ];
  if (shortMatches.some(phrase => normalized === phrase || normalized.startsWith(`${phrase} `))) {
    return true;
  }

  const hasWho = /\bwho\b/.test(normalized);
  const maker = /\b(made|created|built|developed|developer|creator|owner|maintainer|maintains)\b/;
  const target = /\b(you|your|this|ai|assistant|tool|app)\b/;
  return hasWho && maker.test(normalized) && target.test(normalized);
}

function isLegalQuery(text) {
  const normalized = normalizeQuery(text);
  if (!normalized) return false;
  if (/\b(privacy|compliance|gdpr|legal|licensing|license)\b/.test(normalized)) {
    return true;
  }
  if (/\bwho owns (my|the|user) data\b/.test(normalized)) return true;
  if (/\bdata ownership\b/.test(normalized)) return true;
  return /\bowns (my|the|user) data\b/.test(normalized);
}

function wantsMoreDetails(text) {
  const normalized = normalizeQuery(text);
  return /\b(more details|more info|more information|tell me more|more about)\b/.test(
    normalized
  );
}

function isReverseEngineeringQuery(text) {
  const normalized = normalizeQuery(text);
  if (!normalized) return false;
  if (/\breverse engineer(?:ing)?\b/.test(normalized)) return true;
  if (/\bdecompile(?:r|d)?\b/.test(normalized)) return true;
  if (/\bdisassemble(?:r|d)?\b/.test(normalized)) return true;
  if (/\bunpack(?:er|ed)?\b/.test(normalized)) return true;
  if (/\bextract (source|code)\b/.test(normalized)) return true;
  if (/\b(crack|keygen|serial|pirate|bypass)\b/.test(normalized)) return true;
  if (/\bpatch (license|activation)\b/.test(normalized)) return true;
  if (/\bcircumvent\b/.test(normalized)) {
    return /\b(protection|license|activation|security)\b/.test(normalized);
  }
  return false;
}

function getStaticResponse(messages) {
  const lastUserText = getLastUserText(messages);
  if (!lastUserText) return null;

  if (isReverseEngineeringQuery(lastUserText)) {
    return REVERSE_ENGINEERING_RESPONSE;
  }

  if (isLegalQuery(lastUserText)) {
    return DATA_OWNERSHIP_RESPONSE;
  }

  if (isIdentityQuery(lastUserText)) {
    if (wantsMoreDetails(lastUserText)) {
      return `${IDENTITY_RESPONSE}\n${IDENTITY_DETAILS}`;
    }
    return IDENTITY_RESPONSE;
  }

  return null;
}

function resolveApiKey() {
  const data = load();
  let storedKey = null;

  if (data.apiKey) {
    try {
      storedKey = decrypt(data.apiKey);
    } catch (err) {
      storedKey = null;
    }
  }

  removeKeyFiles();
  return storedKey;
}

ipcMain.handle("chat:send", async (_, messages) => {
  const staticReply = getStaticResponse(messages);
  if (staticReply) return staticReply;
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error("API key not set");
  return askGroq(trim(messages), apiKey);
});

ipcMain.handle("key:save", (_, key) => {
  const data = load();
  data.apiKey = encrypt(key);
  save(data);
  removeKeyFiles();
  return true;
});

ipcMain.handle("key:revoke", () => {
  const data = load();
  if (data.apiKey) {
    delete data.apiKey;
    save(data);
  }
  removeKeyFiles();
  return true;
});

ipcMain.handle("key:test", async (_, key) => {
  const candidate = typeof key === "string" ? key.trim() : "";
  const apiKey = candidate || resolveApiKey();
  if (!apiKey) {
    return { ok: false, status: 0, message: "API key not set" };
  }

  return testGroqKey(apiKey);
});

ipcMain.handle("key:status", () => {
  return Boolean(resolveApiKey());
});

ipcMain.handle("chat:load", () => {
  const data = load();
  return data.chats || null;
});

ipcMain.handle("chat:save", (_, chats) => {
  const data = load();
  data.chats = chats;
  save(data);
  return true;
});
