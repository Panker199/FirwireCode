const { ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const os = require("os");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { askGroq, testGroqKey, askOllama, testOllamaConnection, askGemini, testGeminiKey, detectGroqModels, detectGeminiModels, detectBestModel } = require("../../core/providers");
const { decrypt, encrypt } = require("../../core/crypto");
const { load, save } = require("../../core/storage");
const { trim } = require("../../core/trim");
const { getSkills, getSkill, getSkillByCommand, getSkillPrompt } = require("../../core/skills");

function stripThinkingTags(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

// ── System Info Collector ──

function getSystemInfo() {
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : "Unknown";
  const cpuCores = cpus.length;
  const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024 * 1024));
  const usedMem = totalMem - freeMem;
  const uptime = Math.round(os.uptime() / 3600);

  let gpuInfo = "Not detected";
  try {
    const gpuResult = execSync('wmic path win32_videocontroller get name', { timeout: 5000, windowsHide: true }).toString();
    const gpuLines = gpuResult.split('\n').filter(l => l.trim() && !l.includes('Name')).map(l => l.trim());
    if (gpuLines.length > 0) gpuInfo = gpuLines.join(', ');
  } catch {}

  let diskInfo = "Unknown";
  try {
    const diskResult = execSync('wmic logicaldisk get size,freespace,caption', { timeout: 5000, windowsHide: true }).toString();
    const diskLines = diskResult.split('\n').filter(l => l.trim() && !l.includes('Caption')).map(l => l.trim());
    const disks = [];
    for (const line of diskLines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 3) {
        const letter = parts[0];
        const free = Math.round(parseInt(parts[1] || "0") / (1024 * 1024 * 1024));
        const total = Math.round(parseInt(parts[2] || "0") / (1024 * 1024 * 1024));
        disks.push(`${letter} ${free}GB free / ${total}GB`);
      }
    }
    if (disks.length > 0) diskInfo = disks.join('; ');
  } catch {}

  let processCount = 0;
  try {
    const tasklist = execSync('tasklist /FO CSV /NH', { timeout: 5000, windowsHide: true }).toString();
    processCount = tasklist.split('\n').filter(l => l.trim()).length;
  } catch {}

  return {
    os: `${os.platform()} ${os.release()} (${os.arch()})`,
    hostname: os.hostname(),
    cpu: `${cpuModel} (${cpuCores} cores)`,
    ram: `${usedMem}GB used / ${totalMem}GB total (${freeMem}GB free)`,
    gpu: gpuInfo,
    disk: diskInfo,
    processes: processCount,
    uptime: `${uptime} hours`,
    nodeVersion: process.version,
    electronVersion: process.versions?.electron || "N/A"
  };
}

function formatSystemInfo(info) {
  return `SYSTEM INFORMATION:
OS: ${info.os}
Hostname: ${info.hostname}
CPU: ${info.cpu}
RAM: ${info.ram}
GPU: ${info.gpu}
Disk: ${info.disk}
Running Processes: ${info.processes}
Uptime: ${info.uptime}
Node: ${info.nodeVersion}, Electron: ${info.electronVersion}`;
}

const PC_KEYWORDS = /analyz|spec|system\s*info|hardware|cpu|ram|memory|gpu|disk|performance|benchmark|pc info|my computer|my pc|computer specs|system configuration|what.*(processor|gpu|ram|disk|drive)/i;

function isPcQuery(messages) {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return false;
  return PC_KEYWORDS.test(last.content);
}

function getKeyFilePaths() {
  const candidates = new Set([path.join(process.cwd(), "api.txt")]);
  if (app && app.getAppPath) {
    try { candidates.add(path.join(app.getAppPath(), "api.txt")); } catch {}
  }
  if (app && app.isPackaged && app.getPath) {
    try { candidates.add(path.join(path.dirname(app.getPath("exe")), "api.txt")); } catch {}
  }
  return Array.from(candidates);
}

function removeKeyFiles() {
  for (const candidate of getKeyFilePaths()) {
    if (!fs.existsSync(candidate)) continue;
    try { fs.unlinkSync(candidate); } catch {}
  }
}

function resolveApiKey(forProvider) {
  const data = load();
  const provider = forProvider || data.provider || "groq";

  if (provider === "gemini") {
    const encKey = data.geminiApiKey;
    if (encKey) {
      try { return decrypt(encKey); } catch {}
    }
    return process.env.GEMINI_API_KEY || null;
  }

  const encKey = data.apiKey;
  if (encKey) {
    try { return decrypt(encKey); } catch {}
  }
  return process.env.GROQ_API_KEY || null;
}

// ── Chat ──

const CMD_PREFIX = /^\/(?:cmd|exec|run|term)\s+/i;
const DIRECT_CMD = /^(dir|ls|cd|pwd|echo|type|cat|whoami|hostname|ipconfig|ifconfig|ping|curl|wget|tasklist|netstat|systeminfo|date|time|ver|cls|clear|mkdir|rmdir|del|rm|cp|mv|copy|move|ren|rename|grep|find|tree|set|env|path|where|which|uptime|df|du|free|ps|top|chmod|chown|sudo|apt|npm|node|python|pip|git|docker|java|javac|gcc|g\+\+|make|cargo|go|ruby|php|perl|lua|powershell|cmd|sfc|dism|chkdsk|defrag|wbadmin|bcdedit|diskpart|format|icacls|takeown|reg|netsh|powercfg|wevtutil|certutil|bitsadmin|msconfig|gpresult|dxdiag|msinfo32|resmon|perfmon)\b/i;

function isCommand(text) {
  const trimmed = text.trim();
  if (CMD_PREFIX.test(trimmed)) return { isCmd: true, command: trimmed.replace(CMD_PREFIX, "") };
  if (DIRECT_CMD.test(trimmed)) return { isCmd: true, command: trimmed };
  return { isCmd: false };
}

function runCommand(command) {
  const isWin = process.platform === "win32";
  const shell = isWin ? "cmd.exe" : "/bin/bash";
  const args = isWin ? ["/c", command] : ["-c", command];

  return new Promise((resolve) => {
    const proc = spawn(shell, args, {
      cwd: process.env.USERPROFILE || process.env.HOME || "",
      env: { ...process.env, FORCE_COLOR: "0" },
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      killed = true;
      proc.kill();
    }, 15000);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (killed) {
        resolve(`[timeout after 15s]\n${stdout}${stderr}`);
      } else {
        const output = stdout + (stderr ? "\n" + stderr : "");
        resolve(output.trim() || "(no output)");
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      resolve(`Error: ${err.message}`);
    });
  });
}

ipcMain.handle("chat:send", async (_, messages) => {
  const data = load();
  const provider = data.provider || "groq";

  const lastMsg = messages[messages.length - 1];
  if (lastMsg && lastMsg.role === "user") {
    const cmdCheck = isCommand(lastMsg.content);
    if (cmdCheck.isCmd) {
      const output = await runCommand(cmdCheck.command);

      if (/^ipconfig|^ifconfig|^netstat|^route|^arp/i.test(cmdCheck.command)) {
        return `**$ ${cmdCheck.command}**\n\n\`\`\`\n${output}\n\`\`\``;
      }

      if (/^tasklist|^ps /i.test(cmdCheck.command)) {
        const lines = output.split("\n").filter(l => l.trim());
        if (lines.length > 20) {
          return `**$ ${cmdCheck.command}**\n\n${lines.slice(0, 20).join("\n")}\n\n*... ${lines.length - 20} more rows*`;
        }
        return `**$ ${cmdCheck.command}**\n\n\`\`\`\n${output}\n\`\`\``;
      }

      if (/^dir\b|^ls\b|^tree/i.test(cmdCheck.command)) {
        return `**$ ${cmdCheck.command}**\n\n\`\`\`\n${output}\n\`\`\``;
      }

      return `**$ ${cmdCheck.command}**\n\n\`\`\`\n${output}\n\`\`\``;
    }
  }

  let finalMessages = [...messages];

  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg && lastUserMsg.role === "user") {
    const skillMatch = getSkillByCommand(lastUserMsg.content);
    if (skillMatch) {
      const systemMsg = { role: "system", content: skillMatch.skill.systemPrompt };
      const userMsg = { role: "user", content: skillMatch.input || lastUserMsg.content };
      finalMessages = [systemMsg, ...finalMessages.slice(0, -1), userMsg];
    }
  }

  if (isPcQuery(messages)) {
    const results = {};

    const cpuRaw = await runCommand("wmic cpu get name,numberofcores,numberoflogicalprocessors /format:list");
    const memRaw = await runCommand("wmic memorychip get capacity,speed,manufacturer /format:list");
    const diskRaw = await runCommand("wmic diskdrive get model,size,status /format:list");

    function parseWmic(raw) {
      const items = [];
      let current = {};
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (Object.keys(current).length > 0) { items.push(current); current = {}; }
          continue;
        }
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (key && val) current[key] = val;
        }
      }
      if (Object.keys(current).length > 0) items.push(current);
      return items;
    }

    const cpus = parseWmic(cpuRaw);
    const mems = parseWmic(memRaw);
    const disks = parseWmic(diskRaw);

    let formatted = "";

    formatted += "## System Overview\n\n";
    formatted += `| Property | Value |\n|----------|-------|\n`;
    formatted += `| Host | ${"N/A"} |\n`;

    const sysRaw = await runCommand("hostname");
    formatted += `| Hostname | ${sysRaw.trim()} |\n`;

    const osRaw = await runCommand("ver");
    formatted += `| OS | ${osRaw.replace(/\n/g, " ").trim()} |\n`;

    const bootRaw = await runCommand("wmic os get lastbootuptime /value");
    const bootMatch = /LastBootUpTime=(.+)/.exec(bootRaw);
    if (bootMatch) {
      const raw = bootMatch[1].trim();
      formatted += `| Boot Time | ${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)} ${raw.slice(8,10)}:${raw.slice(10,12)}:${raw.slice(12,14)} |\n`;
    }

    formatted += "\n## CPU\n\n";
    if (cpus.length > 0) {
      formatted += `| Property | Value |\n|----------|-------|\n`;
      formatted += `| Model | ${cpus[0].Name || "N/A"} |\n`;
      formatted += `| Cores | ${cpus[0].NumberOfCores || "N/A"} |\n`;
      formatted += `| Threads | ${cpus[0].NumberOfLogicalProcessors || "N/A"} |\n`;
    }

    formatted += "\n## Memory (RAM)\n\n";
    if (mems.length > 0) {
      formatted += `| Slot | Size | Speed | Manufacturer |\n|------|------|-------|-------------|\n`;
      mems.forEach((m, i) => {
        const gb = m.Capacity ? (parseInt(m.Capacity) / (1024**3)).toFixed(0) : "?";
        formatted += `| ${i + 1} | ${gb} GB | ${m.Speed || "?"} MHz | ${m.Manufacturer || "?"} |\n`;
      });
      const totalGB = mems.reduce((s, m) => s + (m.Capacity ? parseInt(m.Capacity) / (1024**3) : 0), 0);
      formatted += `\n**Total: ${totalGB.toFixed(0)} GB**\n`;
    }

    formatted += "\n## Storage\n\n";
    if (disks.length > 0) {
      formatted += `| Drive | Size | Status |\n|-------|------|--------|\n`;
      disks.forEach(d => {
        const gb = d.Size ? (parseInt(d.Size) / (1024**3)).toFixed(0) : "?";
        formatted += `| ${d.Model || "?"} | ${gb} GB | ${d.Status || "?"} |\n`;
      });
    }

    formatted += "\n## Top Processes (by memory)\n\n";
    const taskRaw = await runCommand("tasklist /fo csv /nh");
    const procs = taskRaw.split("\n").filter(l => l.trim()).map(l => {
      const parts = l.split(",").map(p => p.replace(/"/g, "").trim());
      const mem = parseInt((parts[4] || "0").replace(/[^\d]/g, "")) || 0;
      return { name: parts[0], pid: parts[1], mem };
    }).sort((a, b) => b.mem - a.mem).slice(0, 15);

    if (procs.length > 0) {
      formatted += `| Process | PID | Memory |\n|---------|-----|--------|\n`;
      procs.forEach(p => {
        const mb = (p.mem / 1024).toFixed(0);
        formatted += `| ${p.name} | ${p.pid} | ${mb} MB |\n`;
      });
    }

    return formatted;
  }

  if (provider === "ollama") {
    const baseUrl = data.ollamaUrl || "http://localhost:11434";
    const model = data.ollamaModel || "llama3.2";
    try {
      const reply = await askOllama(trim(finalMessages), baseUrl, model);
      return stripThinkingTags(reply);
    } catch (err) {
      throw new Error(`Ollama connection failed: ${err.message}. Make sure Ollama is running at ${baseUrl}`);
    }
  }

  if (provider === "gemini") {
    const apiKey = resolveApiKey();
    if (!apiKey) throw new Error("API key not set. Go to Settings > API Key and save your Gemini API key.");
    const model = data.geminiModel || "gemini-3.6-flash";
    try {
      const reply = await askGemini(trim(finalMessages), apiKey, model);
      return stripThinkingTags(reply);
    } catch (err) {
      if (err.message?.includes("ENOTFOUND")) {
        throw new Error(`Network error: Cannot reach Gemini API. Check your internet connection.`);
      }
      throw err;
    }
  }

  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error("API key not set. Go to Settings > API Key and save your Groq API key.");
  const model = data.groqModel || "qwen/qwen3.6-27b";
  try {
    const reply = await askGroq(trim(finalMessages), apiKey, model);
    return stripThinkingTags(reply);
  } catch (err) {
    if (err.message?.includes("fetch failed") || err.message?.includes("ECONNREFUSED") || err.message?.includes("ENOTFOUND")) {
      throw new Error(`Network error: Cannot reach Groq API. Check your internet connection. (${err.message})`);
    }
    throw err;
  }
});

// ── Key Management ──

ipcMain.handle("key:save", (_, provider, key) => {
  const data = load();
  if (provider === "gemini") {
    data.geminiApiKey = encrypt(key);
  } else {
    data.apiKey = encrypt(key);
  }
  save(data);
  removeKeyFiles();
  return true;
});

ipcMain.handle("key:revoke", () => {
  const data = load();
  delete data.apiKey;
  delete data.geminiApiKey;
  save(data);
  removeKeyFiles();
  return true;
});

ipcMain.handle("key:test", async (_, provider, key) => {
  const candidate = typeof key === "string" ? key.trim() : "";
  if (candidate) {
    if (provider === "gemini") return testGeminiKey(candidate);
    if (provider === "groq") return testGroqKey(candidate);
  }
  const apiKey = resolveApiKey(provider);
  if (!apiKey) return { ok: false, status: 0, message: "API key not set" };
  if (provider === "gemini") return testGeminiKey(apiKey);
  return testGroqKey(apiKey);
});

ipcMain.handle("key:status", () => {
  const data = load();
  if (data.provider === "ollama") return true;
  const hasGroq = Boolean(data.apiKey) || Boolean(process.env.GROQ_API_KEY);
  const hasGemini = Boolean(data.geminiApiKey) || Boolean(process.env.GEMINI_API_KEY);
  return { groq: hasGroq, gemini: hasGemini };
});

// ── Provider Settings ──

ipcMain.handle("provider:set", (_, provider) => {
  const data = load();
  data.provider = provider;
  save(data);
  return true;
});

ipcMain.handle("provider:get", () => {
  const data = load();
  return {
    provider: data.provider || process.env.DEFAULT_PROVIDER || "groq",
    groqModel: data.groqModel || process.env.DEFAULT_GROQ_MODEL || "qwen/qwen3.6-27b",
    ollamaUrl: data.ollamaUrl || "http://localhost:11434",
    ollamaModel: data.ollamaModel || "llama3.2",
    geminiModel: data.geminiModel || process.env.DEFAULT_GEMINI_MODEL || "gemini-3.6-flash"
  };
});

ipcMain.handle("provider:setOllama", (_, { url, model }) => {
  const data = load();
  if (url) data.ollamaUrl = url;
  if (model) data.ollamaModel = model;
  save(data);
  return true;
});

ipcMain.handle("provider:setOllamaUrl", (_, url) => {
  const data = load();
  data.ollamaUrl = url;
  save(data);
  return true;
});

ipcMain.handle("provider:setOllamaModel", (_, model) => {
  const data = load();
  data.ollamaModel = model;
  save(data);
  return true;
});

ipcMain.handle("provider:setGroqModel", (_, model) => {
  const data = load();
  data.groqModel = model;
  save(data);
  return true;
});

ipcMain.handle("provider:setGeminiModel", (_, model) => {
  const data = load();
  data.geminiModel = model;
  save(data);
  return true;
});

ipcMain.handle("ollama:test", async (_, baseUrl) => {
  return testOllamaConnection(baseUrl);
});

ipcMain.handle("ollama:models", async (_, baseUrl) => {
  const result = await testOllamaConnection(baseUrl);
  return result.ok ? result.models : [];
});

// ── Auto Model Detection ──

ipcMain.handle("detect:groq", async (_, apiKey) => {
  return detectGroqModels(apiKey);
});

ipcMain.handle("detect:gemini", async (_, apiKey) => {
  return detectGeminiModels(apiKey);
});

ipcMain.handle("detect:best", async () => {
  const data = load();
  const providers = {};

  const groqKey = resolveApiKey("groq");
  const geminiKey = resolveApiKey("gemini");

  if (groqKey) providers.groq = groqKey;
  if (geminiKey) providers.gemini = geminiKey;

  return detectBestModel(providers);
});

// ── System Info ──

ipcMain.handle("system:getInfo", () => {
  return getSystemInfo();
});

// ── Skills ──

ipcMain.handle("skill:list", () => {
  return getSkills();
});

ipcMain.handle("skill:get", (_, id) => {
  return getSkill(id);
});

ipcMain.handle("skill:execute", async (_, { skillId, input, messages }) => {
  const skill = getSkill(skillId);
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);

  const data = load();
  const provider = data.provider || "groq";

  const systemMsg = { role: "system", content: skill.systemPrompt };
  const userMsg = { role: "user", content: input };
  const finalMessages = [systemMsg, ...messages.slice(0, -1), userMsg];

  if (provider === "ollama") {
    const baseUrl = data.ollamaUrl || "http://localhost:11434";
    const model = data.ollamaModel || "llama3.2";
    const reply = await askOllama(trim(finalMessages), baseUrl, model);
    return stripThinkingTags(reply);
  }

  if (provider === "gemini") {
    const apiKey = resolveApiKey();
    if (!apiKey) throw new Error("API key not set. Go to Settings > API Key.");
    const model = data.geminiModel || "gemini-3.6-flash";
    const reply = await askGemini(trim(finalMessages), apiKey, model);
    return stripThinkingTags(reply);
  }

  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error("API key not set. Go to Settings > API Key.");
  const model = data.groqModel || "qwen/qwen3.6-27b";
  const reply = await askGroq(trim(finalMessages), apiKey, model);
  return stripThinkingTags(reply);
});

// ── Chat Persistence ──

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

ipcMain.handle("chat:delete", (_, threadId) => {
  const data = load();
  if (data.chats && data.chats.threads) {
    data.chats.threads = data.chats.threads.filter(t => t.id !== threadId);
    if (data.chats.activeId === threadId) {
      data.chats.activeId = data.chats.threads[0]?.id || null;
    }
    save(data);
  }
  return true;
});

// ── Code Execution ──

const LANG_COMMANDS = {
  javascript: { cmd: "node", args: ["-e"], ext: ".js" },
  typescript: { cmd: "npx", args: ["tsx", "-e"], ext: ".ts" },
  python: { cmd: "python", args: ["-c"], ext: ".py" },
  ruby: { cmd: "ruby", args: ["-e"], ext: ".rb" },
  shell: { cmd: "bash", args: ["-c"], ext: ".sh" },
  powershell: { cmd: "powershell", args: ["-Command"], ext: ".ps1" },
  php: { cmd: "php", args: ["-r"], ext: ".php" },
  lua: { cmd: "lua", args: ["-e"], ext: ".lua" }
};

function runInline(code, lang, timeout) {
  const config = LANG_COMMANDS[lang];
  if (!config) return Promise.resolve({ ok: false, output: `Execution of "${lang}" is not supported.` });

  return new Promise((resolve) => {
    const proc = spawn(config.cmd, [...config.args, code], { timeout, windowsHide: true });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => { stdout += d; });
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.on("close", (code) => {
      const output = stdout + (stderr ? "\n[stderr]\n" + stderr : "");
      resolve({ ok: code === 0, exitCode: code, output: output.trim() || "(no output)" });
    });
    proc.on("error", (err) => {
      resolve({ ok: false, output: `Failed to run "${config.cmd}": ${err.message}` });
    });
  });
}

ipcMain.handle("code:execute", async (_, { code, language }) => {
  const lang = (language || "javascript").toLowerCase();
  const normalized = LANG_COMMANDS[lang] ? lang : "javascript";

  try {
    if (normalized === "javascript") {
      const lines = [];
      const fakeConsole = {
        log: (...a) => lines.push(a.map(String).join(" ")),
        error: (...a) => lines.push("[error] " + a.map(String).join(" ")),
        warn: (...a) => lines.push("[warn] " + a.map(String).join(" "))
      };
      const fn = new Function("console", "require", code);
      fn(fakeConsole, (m) => `{ module: "${m}" }`);
      return { ok: true, output: lines.join("\n") || "(no output)" };
    }
    return await runInline(code, normalized, 10000);
  } catch (err) {
    return { ok: false, output: err.message || "Execution failed" };
  }
});

// ── Copilot Code Completion ──

ipcMain.handle("copilot:complete", async (_, { code, language, context }) => {
  const data = load();
  const provider = data.provider || "groq";

  const prompt = [
    { role: "system", content: "You are a code completion engine. Given the following code and context, provide a concise continuation or suggestion. Return ONLY the code completion, no explanations, no markdown fences. If the code looks complete, return an empty string." },
    { role: "user", content: `Language: ${language || "plaintext"}\n\nCode:\n${code}\n\n${context ? "Context: " + context : ""}\n\nComplete the code:` }
  ];

  try {
    let reply = "";
    if (provider === "ollama") {
      const baseUrl = data.ollamaUrl || "http://localhost:11434";
      const model = data.ollamaModel || "llama3.2";
      reply = await askOllama(trim(prompt), baseUrl, model);
    } else if (provider === "gemini") {
      const apiKey = resolveApiKey();
      if (!apiKey) return { ok: false, suggestion: "", error: "API key not set" };
      const model = data.geminiModel || "gemini-3.6-flash";
      reply = await askGemini(trim(prompt), apiKey, model);
    } else {
      const apiKey = resolveApiKey();
      if (!apiKey) return { ok: false, suggestion: "", error: "API key not set" };
      const model = data.groqModel || "qwen/qwen3.6-27b";
      reply = await askGroq(trim(prompt), apiKey, model);
    }
    reply = stripThinkingTags(reply);
    reply = reply.replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();
    return { ok: true, suggestion: reply };
  } catch (err) {
    return { ok: false, suggestion: "", error: err.message || "Completion failed" };
  }
});

// ── Terminal / CMD Access ──

const termSessions = new Map();

ipcMain.handle("term:exec", async (_, { id, command }) => {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : "/bin/bash";
    const shellArgs = isWin ? ["/c", command] : ["-c", command];

    const proc = spawn(shell, shellArgs, {
      cwd: process.env.USERPROFILE || process.env.HOME || "",
      env: { ...process.env, FORCE_COLOR: "0" },
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      killed = true;
      proc.kill();
    }, 30000);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (killed) {
        resolve({ ok: false, output: stdout + stderr + "\n[timeout after 30s]", exitCode: -1 });
      } else {
        const output = stdout + (stderr ? "\n" + stderr : "");
        resolve({ ok: code === 0, output: output.trim() || "(no output)", exitCode: code });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      resolve({ ok: false, output: `Failed: ${err.message}`, exitCode: -1 });
    });

    termSessions.set(id, proc);
  });
});

ipcMain.handle("term:kill", (_, { id }) => {
  const proc = termSessions.get(id);
  if (proc) {
    try { proc.kill(); } catch {}
    termSessions.delete(id);
  }
  return true;
});

// ── File Operations ──

ipcMain.handle("file:read", async (_, filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("file:write", async (_, { filePath, content }) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("file:exists", async (_, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle("file:delete", async (_, filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("file:list", async (_, dirPath) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    return items.map(i => ({
      name: i.name,
      isDirectory: i.isDirectory(),
      path: path.join(dirPath, i.name)
    }));
  } catch (err) {
    return [];
  }
});

ipcMain.handle("file:tree", async (_, dirPath, maxDepth) => {
  const depth = maxDepth || 3;
  function buildTree(dir, currentDepth) {
    if (currentDepth >= depth) return [];
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      return items.filter(i => !i.name.startsWith(".") && i.name !== "node_modules").map(i => {
        const itemPath = path.join(dir, i.name);
        const item = { name: i.name, path: itemPath, type: i.isDirectory() ? "dir" : "file" };
        if (i.isDirectory()) {
          item.children = buildTree(itemPath, currentDepth + 1);
        }
        return item;
      });
    } catch { return []; }
  }
  return buildTree(dirPath, 0);
});

ipcMain.handle("file:rename", async (_, { oldPath, newPath }) => {
  try {
    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("file:move", async (_, { src, dest }) => {
  try {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(src)) fs.renameSync(src, dest);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("file:copy", async (_, { src, dest }) => {
  try {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("file:search", async (_, { dirPath, pattern }) => {
  const results = [];
  function searchDir(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && !item.name.startsWith(".") && item.name !== "node_modules") {
          searchDir(fullPath);
        } else if (item.isFile()) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const lines = content.split("\n");
            lines.forEach((line, i) => {
              if (line.toLowerCase().includes(pattern.toLowerCase())) {
                results.push({ file: fullPath, line: i + 1, content: line.trim() });
              }
            });
          } catch {}
        }
      }
    } catch {}
  }
  searchDir(dirPath || process.cwd());
  return results;
});

ipcMain.handle("file:mkdir", async (_, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("file:rmdir", async (_, dirPath) => {
  try {
    if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Git Operations ──

function runGit(args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn("git", args, { cwd: cwd || process.cwd(), windowsHide: true });
    let stdout = "", stderr = "";
    proc.stdout.on("data", d => { stdout += d.toString(); });
    proc.stderr.on("data", d => { stderr += d.toString(); });
    proc.on("close", code => resolve({ ok: code === 0, output: stdout.trim() || stderr.trim(), exitCode: code }));
    proc.on("error", err => resolve({ ok: false, output: err.message, exitCode: -1 }));
  });
}

ipcMain.handle("git:exec", async (_, { args, cwd }) => {
  return runGit(args, cwd);
});

ipcMain.handle("git:init", async (_, cwd) => {
  return runGit(["init"], cwd);
});

ipcMain.handle("git:status", async (_, cwd) => {
  return runGit(["status"], cwd);
});

ipcMain.handle("git:add", async (_, { files, cwd }) => {
  return runGit(["add", ...(files || ["."])], cwd);
});

ipcMain.handle("git:commit", async (_, { message, cwd }) => {
  return runGit(["commit", "-m", message], cwd);
});

ipcMain.handle("git:push", async (_, { remote, branch, cwd }) => {
  return runGit(["push", remote || "origin", branch || "HEAD"], cwd);
});

ipcMain.handle("git:pull", async (_, { remote, branch, cwd }) => {
  return runGit(["pull", remote || "origin", branch || ""].filter(Boolean), cwd);
});

ipcMain.handle("git:log", async (_, { count, cwd }) => {
  return runGit(["log", `--oneline`, `-n`, String(count || 20)], cwd);
});

ipcMain.handle("git:diff", async (_, { cwd }) => {
  return runGit(["diff"], cwd);
});

ipcMain.handle("git:branch", async (_, { cwd }) => {
  return runGit(["branch", "-a"], cwd);
});

ipcMain.handle("git:checkout", async (_, { branch, cwd }) => {
  return runGit(["checkout", branch], cwd);
});

ipcMain.handle("git:stash", async (_, { cwd }) => {
  return runGit(["stash"], cwd);
});

ipcMain.handle("git:merge", async (_, { branch, cwd }) => {
  return runGit(["merge", branch], cwd);
});

ipcMain.handle("git:rebase", async (_, { branch, cwd }) => {
  return runGit(["rebase", branch], cwd);
});

ipcMain.handle("git:clone", async (_, { url, dest }) => {
  return runGit(["clone", url, dest || "."]);
});

// ── Build & Run ──

ipcMain.handle("build:run", async (_, { command, cwd }) => {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : "/bin/bash";
    const args = isWin ? ["/c", command] : ["-c", command];
    const proc = spawn(shell, args, { cwd: cwd || process.cwd(), env: { ...process.env, FORCE_COLOR: "0" }, windowsHide: true });
    let stdout = "", stderr = "";
    proc.stdout.on("data", d => { stdout += d.toString(); });
    proc.stderr.on("data", d => { stderr += d.toString(); });
    const timeout = setTimeout(() => { proc.kill(); resolve({ ok: false, output: stdout + stderr + "\n[timeout]" }); }, 60000);
    proc.on("close", code => { clearTimeout(timeout); resolve({ ok: code === 0, output: (stdout + (stderr ? "\n" + stderr : "")).trim() || "(no output)", exitCode: code }); });
    proc.on("error", err => { clearTimeout(timeout); resolve({ ok: false, output: err.message, exitCode: -1 }); });
  });
});

// ── Package Management ──

ipcMain.handle("pkg:install", async (_, { package: pkg, manager, cwd }) => {
  const mgr = manager || "npm";
  const cmds = { npm: `npm install ${pkg}`, yarn: `yarn add ${pkg}`, pnpm: `pnpm add ${pkg}`, pip: `pip install ${pkg}`, go: `go get ${pkg}`, cargo: `cargo add ${pkg}` };
  return runGit(["-c", cmds[mgr] || cmds.npm], cwd);
});

ipcMain.handle("pkg:uninstall", async (_, { package: pkg, manager, cwd }) => {
  const mgr = manager || "npm";
  const cmds = { npm: `npm uninstall ${pkg}`, yarn: `yarn remove ${pkg}`, pnpm: `pnpm remove ${pkg}`, pip: `pip uninstall ${pkg}` };
  return runGit(["-c", cmds[mgr] || cmds.npm], cwd);
});

ipcMain.handle("pkg:list", async (_, { cwd }) => {
  try {
    const pkgPath = path.join(cwd || process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return { ok: true, dependencies: pkg.dependencies || {}, devDependencies: pkg.devDependencies || {} };
    }
    return { ok: false, error: "No package.json found" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── System Info ──

ipcMain.handle("system:getInfo", () => {
  return getSystemInfo();
});

// ── Skills ──

ipcMain.handle("skill:list", () => {
  return getSkills();
});

ipcMain.handle("skill:get", (_, id) => {
  return getSkill(id);
});

ipcMain.handle("skill:execute", async (_, { skillId, input, messages }) => {
  const skill = getSkill(skillId);
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);

  const data = load();
  const provider = data.provider || "groq";

  const systemMsg = { role: "system", content: skill.systemPrompt };
  const userMsg = { role: "user", content: input };
  const finalMessages = [systemMsg, ...messages.slice(0, -1), userMsg];

  if (provider === "ollama") {
    const baseUrl = data.ollamaUrl || "http://localhost:11434";
    const model = data.ollamaModel || "llama3.2";
    const reply = await askOllama(trim(finalMessages), baseUrl, model);
    return stripThinkingTags(reply);
  }

  if (provider === "gemini") {
    const apiKey = resolveApiKey();
    if (!apiKey) throw new Error("API key not set.");
    const model = data.geminiModel || "gemini-3.6-flash";
    const reply = await askGemini(trim(finalMessages), apiKey, model);
    return stripThinkingTags(reply);
  }

  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error("API key not set.");
  const model = data.groqModel || "qwen/qwen3.6-27b";
  const reply = await askGroq(trim(finalMessages), apiKey, model);
  return stripThinkingTags(reply);
});

// ── Web Search (stub for browser) ──

ipcMain.handle("web:search", async (_, query) => {
  return { results: [], note: "Web search available in browser mode only" };
});
