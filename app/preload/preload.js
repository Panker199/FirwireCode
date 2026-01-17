const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wormgpt", {
  chat: (messages) => ipcRenderer.invoke("chat:send", messages),
  saveKey: (key) => ipcRenderer.invoke("key:save", key),
  revokeKey: () => ipcRenderer.invoke("key:revoke"),
  testKey: (key) => ipcRenderer.invoke("key:test", key),
  keyStatus: () => ipcRenderer.invoke("key:status"),
  loadChats: () => ipcRenderer.invoke("chat:load"),
  saveChats: (chats) => ipcRenderer.invoke("chat:save", chats),
  minimize: () => ipcRenderer.send("win:min"),
  close: () => ipcRenderer.send("win:close")
});
