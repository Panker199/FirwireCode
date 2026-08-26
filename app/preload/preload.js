const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wormgpt", {
  // Chat
  chat: (messages) => ipcRenderer.invoke("chat:send", messages),

  // Keys
  saveKey: (provider, key) => ipcRenderer.invoke("key:save", provider, key),
  revokeKey: () => ipcRenderer.invoke("key:revoke"),
  testKey: (provider, key) => ipcRenderer.invoke("key:test", provider, key),
  keyStatus: () => ipcRenderer.invoke("key:status"),

  // Provider
  setProvider: (provider) => ipcRenderer.invoke("provider:set", provider),
  getProvider: () => ipcRenderer.invoke("provider:get"),
  setGroqModel: (model) => ipcRenderer.invoke("provider:setGroqModel", model),
  setGeminiModel: (model) => ipcRenderer.invoke("provider:setGeminiModel", model),

  // Chats
  loadChats: () => ipcRenderer.invoke("chat:load"),
  saveChats: (chats) => ipcRenderer.invoke("chat:save", chats),
  deleteThread: (id) => ipcRenderer.invoke("chat:delete", id),

  // Code Execution
  executeCode: (code, language) => ipcRenderer.invoke("code:execute", { code, language }),
  completeCode: (code, language, context) => ipcRenderer.invoke("copilot:complete", { code, language, context }),

  // File System
  readFile: (p) => ipcRenderer.invoke("file:read", p),
  writeFile: (p, c) => ipcRenderer.invoke("file:write", { filePath: p, content: c }),
  fileExists: (p) => ipcRenderer.invoke("file:exists", p),
  deleteFile: (p) => ipcRenderer.invoke("file:delete", p),
  listFiles: (p) => ipcRenderer.invoke("file:list", p),
  fileTree: (p, d) => ipcRenderer.invoke("file:tree", p, d),
  renameFile: (o, n) => ipcRenderer.invoke("file:rename", { oldPath: o, newPath: n }),
  moveFile: (s, d) => ipcRenderer.invoke("file:move", { src: s, dest: d }),
  copyFile: (s, d) => ipcRenderer.invoke("file:copy", { src: s, dest: d }),
  searchFiles: (d, p) => ipcRenderer.invoke("file:search", { dirPath: d, pattern: p }),
  mkdir: (d) => ipcRenderer.invoke("file:mkdir", d),
  rmdir: (d) => ipcRenderer.invoke("file:rmdir", d),

  // Git
  gitExec: (args, cwd) => ipcRenderer.invoke("git:exec", { args, cwd }),
  gitInit: (cwd) => ipcRenderer.invoke("git:init", cwd),
  gitStatus: (cwd) => ipcRenderer.invoke("git:status", cwd),
  gitAdd: (files, cwd) => ipcRenderer.invoke("git:add", { files, cwd }),
  gitCommit: (message, cwd) => ipcRenderer.invoke("git:commit", { message, cwd }),
  gitPush: (remote, branch, cwd) => ipcRenderer.invoke("git:push", { remote, branch, cwd }),
  gitPull: (remote, branch, cwd) => ipcRenderer.invoke("git:pull", { remote, branch, cwd }),
  gitLog: (count, cwd) => ipcRenderer.invoke("git:log", { count, cwd }),
  gitDiff: (cwd) => ipcRenderer.invoke("git:diff", cwd),
  gitBranch: (cwd) => ipcRenderer.invoke("git:branch", cwd),
  gitCheckout: (branch, cwd) => ipcRenderer.invoke("git:checkout", { branch, cwd }),
  gitStash: (cwd) => ipcRenderer.invoke("git:stash", cwd),
  gitMerge: (branch, cwd) => ipcRenderer.invoke("git:merge", { branch, cwd }),
  gitRebase: (branch, cwd) => ipcRenderer.invoke("git:rebase", { branch, cwd }),
  gitClone: (url, dest) => ipcRenderer.invoke("git:clone", { url, dest }),

  // Build & Run
  buildRun: (command, cwd) => ipcRenderer.invoke("build:run", { command, cwd }),

  // Package Management
  pkgInstall: (pkg, manager, cwd) => ipcRenderer.invoke("pkg:install", { package: pkg, manager, cwd }),
  pkgUninstall: (pkg, manager, cwd) => ipcRenderer.invoke("pkg:uninstall", { package: pkg, manager, cwd }),
  pkgList: (cwd) => ipcRenderer.invoke("pkg:list", cwd),

  // System
  getSystemInfo: () => ipcRenderer.invoke("system:getInfo"),
  webSearch: (q) => ipcRenderer.invoke("web:search", q),

  // Skills
  listSkills: () => ipcRenderer.invoke("skill:list"),
  getSkill: (id) => ipcRenderer.invoke("skill:get", id),
  executeSkill: (skillId, input, messages) => ipcRenderer.invoke("skill:execute", { skillId, input, messages }),

  // Detect
  detectBest: () => ipcRenderer.invoke("detect:best"),

  // Window
  minimize: () => ipcRenderer.send("win:min"),
  maximize: () => ipcRenderer.send("win:max"),
  close: () => ipcRenderer.send("win:close")
});
