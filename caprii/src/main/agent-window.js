'use strict';
const path = require('node:path');
const views = new Map();
function registerAgentWindowIpc(ipcMain) {
  ipcMain.on('agent:stop-task', (event) => views.get(event.sender.id)?.stop());
  ipcMain.handle('agent:task-state', event => views.get(event.sender.id)?.snapshot() || null);
  ipcMain.handle('agent:export-report', async event => {
    const view = views.get(event.sender.id);
    if (!view) return { ok: false };
    const { dialog, BrowserWindow } = require('electron');
    const picked = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), { defaultPath: 'Caprii-report.json', filters: [{ name: 'JSON report', extensions: ['json'] }] });
    if (picked.canceled) return { ok: false };
    await require('node:fs/promises').writeFile(picked.filePath, JSON.stringify({ exportedAt: new Date().toISOString(), ...view.snapshot() }, null, 2));
    return { ok: true };
  });
}
function createAgentWindow({ BrowserWindow, goal, stop }) {
  let finished = false;
  let state = { state: 'running', goal, plan: [], events: [], summary: '' };
  const window = new BrowserWindow({ width: 720, height: 650, title: 'Caprii — งานที่กำลังทำ', backgroundColor: '#101622',
    webPreferences: { preload: path.join(__dirname, '..', 'agent-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  const key = window.webContents.id;
  const send = () => { if (!window.isDestroyed()) window.webContents.send('agent:task-update', state); };
  views.set(key, { stop, snapshot: () => state });
  window.on('closed', () => { views.delete(key); if (!finished) stop(); });
  window.webContents.on('did-finish-load', send);
  window.loadURL('capri://app/src/renderer/agent.html');
  return {
    window,
    hide: () => { if (!window.isDestroyed()) window.minimize(); },
    update(event) {
      if (event.plan) state.plan = event.plan;
      state.events = [...state.events, { step: event.step, tool: event.tool, status: event.status || 'running', path: event.path, action: event.action, error: event.error }].slice(-100);
      send();
    },
    finish(result) {
      finished = true;
      state = { ...state, state: result.state, summary: result.summary, checks: result.checks || [], audit: result.audit || [] };
      send();
      if (!window.isDestroyed()) window.show();
    },
  };
}
module.exports = { registerAgentWindowIpc, createAgentWindow };
