const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  listReports: () => ipcRenderer.invoke("list-reports"),
  readReport: (relPath) => ipcRenderer.invoke("read-report", relPath),
  writeReport: (payload) => ipcRenderer.invoke("write-report", payload),
  downloadReport: (payload) => ipcRenderer.invoke("download-report", payload),
  deleteReport: (payload) => ipcRenderer.invoke("delete-report", payload),
});
