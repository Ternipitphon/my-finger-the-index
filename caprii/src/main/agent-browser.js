'use strict';
const { randomUUID } = require('node:crypto');

function browserUrl(value) {
  const url = new URL(value);
  if (url.username || url.password || !['https:', 'http:'].includes(url.protocol)) throw new Error('Only web URLs without credentials are supported');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol === 'http:' && !local) throw new Error('Use HTTPS, or HTTP on localhost for development');
  if (!local && (/^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname) || url.hostname.endsWith('.local') || url.hostname.startsWith('['))) throw new Error('Private network URLs are not supported');
  return url.href;
}

// Browser pages never receive Node, preload APIs, the app session, or permission grants.
function createBrowser({ BrowserWindow, session }) {
  let win = null, allowedOrigin = null, generation = 0, lastSnapshot = null;
  const partition = 'caprii-agent-' + randomUUID();
  const isolated = session.fromPartition(partition, { cache: false });
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const proxyReady = proxy ? isolated.setProxy({ proxyRules: proxy, proxyBypassRules: 'localhost;127.0.0.1;[::1]' }) : Promise.resolve();
  isolated.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  isolated.setPermissionCheckHandler(() => false);
  isolated.on('will-download', event => event.preventDefault());
  isolated.webRequest.onBeforeRequest((details, callback) => {
    try {
      const u = new URL(details.url);
      if (['data:', 'blob:'].includes(u.protocol) && details.resourceType !== 'mainFrame') return callback({ cancel: false });
      browserUrl(details.url);
      if (details.resourceType === 'mainFrame' && u.origin !== allowedOrigin) return callback({ cancel: true });
      callback({ cancel: false });
    } catch { callback({ cancel: true }); }
  });
  function current() {
    if (!win || win.isDestroyed()) throw new Error('Open an agent browser page first');
    return win.webContents;
  }
  function check(signal) { signal?.throwIfAborted(); }
  async function snapshot(signal) {
    check(signal);
    const wc = current();
    const token = String(++generation);
    const data = await wc.executeJavaScriptInIsolatedWorld(1004, [{ code: `(() => {
      const elements = Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"]'))
        .filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0).slice(0, 80);
      globalThis.__capriiElements = elements;
      globalThis.__capriiGeneration = ${JSON.stringify(token)};
      return { title: document.title, url: location.href, text: (document.body?.innerText || '').slice(0, 14000),
        elements: elements.map((el, id) => ({ id, tag: el.tagName.toLowerCase(), type: el.type || '',
          label: (el.getAttribute('aria-label') || el.innerText || el.placeholder || el.name || '').slice(0, 150),
          href: el.tagName === 'A' ? el.href : undefined, disabled: !!el.disabled })) };
    })()` }]);
    check(signal);
    lastSnapshot = { ...data, generation: token };
    return lastSnapshot;
  }
  async function navigate(url, signal) {
    url = browserUrl(url);
    await proxyReady;
    check(signal);
    allowedOrigin = new URL(url).origin;
    if (!win || win.isDestroyed()) {
      win = new BrowserWindow({ width: 1100, height: 760, title: 'Caprii Agent Browser', webPreferences: {
        partition, sandbox: true, nodeIntegration: false, contextIsolation: true, webSecurity: true,
      } });
      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      win.webContents.on('will-attach-webview', event => event.preventDefault());
      win.webContents.on('will-navigate', (event, target) => {
        try { if (new URL(browserUrl(target)).origin !== allowedOrigin) event.preventDefault(); }
        catch { event.preventDefault(); }
      });
    }
    const wc = current();
    const stop = () => wc.stop();
    signal?.addEventListener('abort', stop, { once: true });
    const timer = setTimeout(stop, 20000);
    try { check(signal); await wc.loadURL(url); return await snapshot(signal); }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', stop); }
  }
  function target(action) {
    current();
    if (!lastSnapshot || action.generation !== lastSnapshot.generation) throw new Error('Inspect the page again');
    const element = lastSnapshot.elements.find(e => e.id === action.id);
    if (!element) throw new Error('Unknown browser element');
    return { url: lastSnapshot.url, ...element };
  }
  async function interact(action, signal) {
    check(signal);
    const wc = current();
    // IDs are meaningful only for the latest inspection. A navigated page invalidates them.
    const payload = JSON.stringify({ id: action.id, generation: action.generation, kind: action.kind, value: action.value });
    const outcome = await wc.executeJavaScriptInIsolatedWorld(1004, [{ code: `(() => {
      const a = ${payload};
      if (globalThis.__capriiGeneration !== a.generation) throw new Error('Inspect the page again');
      const el = globalThis.__capriiElements?.[a.id];
      if (!el?.isConnected || el.disabled) throw new Error('Element is no longer available');
      if (a.kind === 'click') el.click();
      else {
        if (!['INPUT','TEXTAREA'].includes(el.tagName) || ['password','file','hidden'].includes(el.type)) throw new Error('This field cannot be filled by the agent');
        const descriptor = Object.getOwnPropertyDescriptor(el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value');
        descriptor.set.call(el, a.value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { performed: true };
    })()` }]);
    await new Promise(resolve => setTimeout(resolve, 300));
    check(signal);
    return { ...outcome, observed: await snapshot(signal) };
  }
  async function capture(signal) {
    check(signal); const image = await current().capturePage(); check(signal);
    return { text: 'Agent browser screenshot', image: image.resize({ width: 1280 }).toDataURL() };
  }
  async function close() {
    if (win && !win.isDestroyed()) win.destroy();
    win = null;
    await isolated.clearStorageData();
  }
  return { navigate, snapshot, target, interact, capture, close };
}
module.exports = { createBrowser, browserUrl };
