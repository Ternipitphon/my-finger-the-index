'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { runProcess } = require('./agent-process');
const { number, text } = require('./agent-registry');
const KEYS = ['enter', 'escape', 'tab', 'backspace', 'ctrl+a', 'ctrl+s', 'ctrl+c', 'ctrl+v', 'alt+tab', 'ctrl+z', 'ctrl+l', 'ctrl+f', 'ctrl+w', 'ctrl+tab', 'ctrl+shift+tab', 'alt+f4', 'up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown', 'delete', 'space'];
function validateDesktop(action, displays) {
  if (!['state', 'focus', 'release'].includes(action.kind) && !/^\d{1,18}$/.test(String(action.targetHandle))) throw new Error('Select an observed target window handle before input');
  if (action.allowOutsideWindow !== undefined && typeof action.allowOutsideWindow !== 'boolean') throw new Error('allowOutsideWindow must be boolean');
  if (['move', 'click', 'doubleclick', 'rightclick', 'drag'].includes(action.kind)) {
    number(action.x, 'x', -100000, 100000); number(action.y, 'y', -100000, 100000);
    if (!displays.some(d => action.x >= d.bounds.x && action.y >= d.bounds.y && action.x < d.bounds.x + d.bounds.width && action.y < d.bounds.y + d.bounds.height)) throw new Error('Click is outside the desktop');
    if (action.kind === 'drag') {
      number(action.toX, 'drag x', -100000, 100000); number(action.toY, 'drag y', -100000, 100000);
      if (!displays.some(d => action.toX >= d.bounds.x && action.toY >= d.bounds.y && action.toX < d.bounds.x+d.bounds.width && action.toY < d.bounds.y+d.bounds.height)) throw new Error('Drag destination is outside the desktop');
    }
  } else if (action.kind === 'type') text(action.text, 'text', 2000);
  else if (action.kind === 'key') { if (!KEYS.includes(action.key)) throw new Error('Unsupported key'); }
  else if (action.kind === 'focus') { if (!/^\d{1,18}$/.test(String(action.handle))) throw new Error('Invalid window handle'); }
  else if (action.kind === 'scroll') number(action.amount, 'scroll amount', -10, 10);
  else if (!['state','release'].includes(action.kind)) throw new Error('Unknown desktop command');
}
function createDesktop({ desktopCapturer, screen, platform = process.platform, run = runProcess, beforeCapture = () => {} }) {
  let lastState = null, lastCaptureAt = 0;
  async function state(action = { kind: 'state' }, signal) {
    if (platform !== 'win32') throw new Error('Desktop input requires Windows; browser and project tools work on this platform');
    validateDesktop(action, screen.getAllDisplays());
    // Load only our shipped helper as command text; JSON stays separate on stdin.
    // This avoids relying on the user's policy for running unsigned .ps1 files.
    const helper = await fs.readFile(path.join(__dirname, 'agent-desktop.ps1'), 'utf8');
    const result = await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', helper], {
      input: JSON.stringify(['move','click','doubleclick','rightclick','drag'].includes(action.kind) && screen.dipToScreenPoint ? {
        ...action, ...screen.dipToScreenPoint({ x: action.x, y: action.y }),
        ...(action.kind === 'drag' ? (() => { const p=screen.dipToScreenPoint({x:action.toX,y:action.toY});return {toX:p.x,toY:p.y}; })() : {}),
      } : action), signal, timeoutMs: 10000,
    });
    if (!result.passed) throw new Error('Windows desktop helper failed: ' + result.stderr.slice(0, 300));
    lastState = JSON.parse(result.stdout.replace(/^\uFEFF/, '').trim());
    if (screen.screenToDipRect) lastState.windows = lastState.windows.map(window => ({ ...window, ...screen.screenToDipRect(null, { x: window.x, y: window.y, width: window.width, height: window.height }) }));
    if (screen.screenToDipPoint) lastState.cursor = screen.screenToDipPoint(lastState.cursor);
    return lastState;
  }
  function selectedDisplay(displayId) {
    const displays=screen.getAllDisplays();
    const d=displayId==null?(screen.getDisplayNearestPoint?.(screen.getCursorScreenPoint?.()||{x:0,y:0})||screen.getPrimaryDisplay()):displays.find(d=>String(d.id)===String(displayId));
    if(!d)throw Error('Display not found');return d;
  }
  function displayForAction(a,w){
    return screen.getAllDisplays().find(d=>{const x=a.x??w.x,y=a.y??w.y;return x>=d.bounds.x&&y>=d.bounds.y&&x<d.bounds.x+d.bounds.width&&y<d.bounds.y+d.bounds.height;})||screen.getPrimaryDisplay();
  }
  async function capture(displayId, signal) {
    signal.throwIfAborted();
    await beforeCapture();
    const displays = screen.getAllDisplays();
    const display = displayId == null ? (screen.getDisplayNearestPoint?.(screen.getCursorScreenPoint?.() || { x: 0, y: 0 }) || screen.getPrimaryDisplay()) : displays.find(d => String(d.id) === String(displayId));
    if (!display) throw new Error('Display not found');
    const factor = display.scaleFactor || 1;
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: {
      width: Math.min(1920, Math.round(display.bounds.width * factor)), height: Math.min(1200, Math.round(display.bounds.height * factor)),
    } });
    signal.throwIfAborted();
    const src = sources.find(s => s.display_id === String(display.id)) || (displays.length === 1 ? sources[0] : null);
    if (!src || src.thumbnail.isEmpty()) throw new Error('No screen image available');
    const size = src.thumbnail.getSize();
    lastCaptureAt = Date.now();
    return { text: { displayId: String(display.id), desktopBounds: display.bounds, imageSize: size, availableDisplays: displays.map(d => ({ id: String(d.id), bounds: d.bounds })),
      coordinates: 'Click uses desktop logical coordinates, not screenshot pixels. x=bounds.x+imageX*bounds.width/imageSize.width; same for y.' }, image: src.thumbnail.toDataURL() };
  }
  function target(action) {
    if (action.kind !== 'focus' && (!lastCaptureAt || Date.now()-lastCaptureAt > 120000)) throw new Error('Inspect desktop.look before sending input; the last screen image is missing or stale');
    const handle = action.kind === 'focus' ? action.handle : action.targetHandle;
    const window = lastState?.windows.find(w => w.handle === String(handle));
    if (!window) throw new Error('Inspect desktop.windows and choose a current window first');
    if (['move','click','doubleclick','rightclick','drag'].includes(action.kind) && !action.allowOutsideWindow && !(action.x >= window.x && action.y >= window.y && action.x < window.x + window.width && action.y < window.y + window.height)) throw new Error('Click is outside the selected window');
    if (action.kind === 'drag' && !action.allowOutsideWindow && !(action.toX >= window.x && action.toY >= window.y && action.toX < window.x+window.width && action.toY < window.y+window.height)) throw new Error('Drag destination is outside the selected window; explicit confirmation is required');
    return window;
  }
  async function act(action, signal, permission = {}) {
    const w=target(action);
    action={...action,expectedProcessId:w.processId,expectedProcessStart:w.processStart,expectedTitle:w.title};
    await beforeCapture();
    let observed;
    try { observed = await state(action, signal); } catch (err) {
      if (action.kind === 'drag') await state({kind:'release'}, AbortSignal.timeout(4000)).catch(()=>{});
      throw err;
    }
    // Input was delivered, not necessarily successful: send a fresh screenshot back to the model.
    const displays = screen.getAllDisplays();
    const currentWindow=observed.windows.find(item=>item.handle===w.handle)||w;
    const display = displayForAction(action,currentWindow);
    const actual=selectedDisplay(display?.id);
    if(permission.approvedDisplayId!==undefined && String(actual.id)!==String(permission.approvedDisplayId))await permission.authorizeDisplay(actual.id);
    const picture = await capture(actual.id, signal);
    return { text: { inputDelivered: true, observed, ...picture.text, requiresVisualVerification: true }, image: picture.image };
  }
  async function openApp(name, root, signal) {
    if (platform !== 'win32') throw new Error('Opening Windows apps requires Windows');
    let executable, args;
    if (name === 'notepad') { executable = 'notepad.exe'; args = []; }
    else if (name === 'explorer') { executable = 'explorer.exe'; args = root ? [root] : []; }
    else if (name === 'vscode') {
      const candidates = [path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'Code.exe'), path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft VS Code', 'Code.exe')];
      for (const candidate of candidates) { try { await fs.access(candidate); executable = candidate; break; } catch {} }
      if (!executable) throw new Error('VS Code was not found in its standard installation locations');
      args = root ? [root] : [];
    } else throw new Error('Supported apps: vscode, notepad, explorer');
    signal.throwIfAborted();
    await new Promise((resolve, reject) => {
      const child = spawn(executable, args, { detached: true, stdio: 'ignore', windowsHide: false });
      child.once('error', reject);
      child.once('spawn', () => { child.unref(); resolve(); });
    });
    await delay(500, undefined, { signal });
    return { requested: name, observed: await state({ kind: 'state' }, signal), verified: false };

  }
  return { state, capture, target, act, selectedDisplay, displayForAction, openApp, supportedInput: platform === 'win32' };
}
module.exports = { createDesktop, validateDesktop, KEYS };
