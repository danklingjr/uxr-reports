const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs/promises");

function reportsBase() {
  return path.join(app.getAppPath(), "reports");
}

async function ensureReportsBase() {
  await fs.mkdir(reportsBase(), { recursive: true });
}

function safeJoin(base, target) {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(base)) {
    throw new Error("Invalid path");
  }
  return resolved;
}

async function listReports() {
  await ensureReportsBase();
  const base = reportsBase();
  const entries = await fs.readdir(base, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const category = entry.name;
    const categoryPath = path.join(base, category);
    const files = await fs.readdir(categoryPath, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) continue;
      if (!file.name.toLowerCase().endsWith(".md")) continue;
      const full = path.join(categoryPath, file.name);
      const stat = await fs.stat(full);
      results.push({
        name: file.name,
        category,
        relPath: path.join(category, file.name),
        lastModified: stat.mtimeMs,
      });
    }
  }

  return results.sort((a, b) => b.lastModified - a.lastModified).slice(0, 50);
}

async function readReport(relPath) {
  await ensureReportsBase();
  const base = reportsBase();
  const fullPath = safeJoin(base, relPath);
  return await fs.readFile(fullPath, "utf-8");
}

async function writeReport({ category, filename, content, currentRelPath }) {
  await ensureReportsBase();
  const base = reportsBase();
  const categoryPath = safeJoin(base, category);
  await fs.mkdir(categoryPath, { recursive: true });

  let targetRelPath = path.join(category, filename);
  if (currentRelPath && currentRelPath === targetRelPath) {
    // Update in place
  } else if (currentRelPath && currentRelPath.startsWith(category + path.sep)) {
    // Same category; preserve existing filename if unchanged
    targetRelPath = currentRelPath;
  }

  const fullPath = safeJoin(base, targetRelPath);
  await fs.writeFile(fullPath, content, "utf-8");
  return targetRelPath;
}

async function downloadReport({ relPath, suggestedName }) {
  try {
    await ensureReportsBase();
    const base = reportsBase();
    const fullPath = safeJoin(base, relPath);
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: suggestedName || path.basename(relPath),
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    const content = await fs.readFile(fullPath);
    await fs.writeFile(filePath, content);
    return { ok: true };
  } catch (err) {
    console.error("downloadReport error", err);
    return { ok: false, error: err.message || "Unknown error" };
  }
}

async function deleteReport({ relPath }) {
  try {
    await ensureReportsBase();
    const base = reportsBase();
    const fullPath = safeJoin(base, relPath);
    await fs.rm(fullPath, { force: true });
    return { ok: true };
  } catch (err) {
    console.error("deleteReport error", err);
    return { ok: false, error: err.message || "Unknown error" };
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 10 },
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("list-reports", async () => listReports());
  ipcMain.handle("read-report", async (_event, relPath) => readReport(relPath));
  ipcMain.handle("write-report", async (_event, payload) => writeReport(payload));
  ipcMain.handle("download-report", async (_event, payload) => downloadReport(payload));
  ipcMain.handle("delete-report", async (_event, payload) => deleteReport(payload));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
