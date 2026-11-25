'use strict';
const { createHash } = require('node:crypto');
const volatile = new Set(['generation', 'timestamp', 'timeStamp', 'capturedAt', 'elapsedMs', 'durationMs', 'requestId']);
function fingerprint(value, depth = 0) {
  if (depth > 12) return '[depth limit]';
  if (typeof value === 'string') {
    if (value.length < 64000 && /^[\[{]/.test(value)) {
      try { return fingerprint(JSON.parse(value), depth + 1); } catch {}
    }
    return value.length > 8192 ? { textHash: createHash('sha256').update(value).digest('hex') } : value;
  }
  if (Array.isArray(value)) return value.map(item => fingerprint(item, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(key => !volatile.has(key)).map(key => [key, fingerprint(value[key], depth + 1)]));
  return value;
}
// Keep hashes only, never another copy of the user's page, files or screen.
function createProgressGuard() {
  const history = [];
  return {
    observe(action, result) {
      if (action.tool === 'task.wait' && Number.isInteger(result?.waitedMs) && result.waitedMs > 0 && result.waitedMs <= 5000) { history.length = 0; return null; }
      history.push(createHash('sha256').update(JSON.stringify(fingerprint({ action, result }))).digest('hex'));
      if (history.length > 12) history.shift();
      for (let period = 1; period <= 3; period++) {
        const length = period * Math.max(3, Math.ceil(6 / period));
        if (history.length < length) continue;
        const recent = history.slice(-length);
        if (recent.every((item, i) => item === recent[i % period])) return { reason: 'no-progress', cycleLength: period, summary: 'หยุดงานเพราะทำขั้นตอนเดิมวนซ้ำโดยผลที่อ่านได้ไม่เปลี่ยน กรุณาตรวจจุดที่ติดขัดก่อนเริ่มงานใหม่' };
      }
      return null;
    },
  };
}
function pendingSubmission(action, observation, waitingForReceipt) {
  if (!waitingForReceipt || action.tool !== 'browser.click') return false;
  if (action.intent === 'submit') return true;
  const target = observation?.elements?.find(item => item.id === action.id);
  return !!target && /^(?:ส่ง|ยืนยัน|submit\b|confirm\b|send\b)/iu.test((target.label || '').trim());
}
function registerTaskWait(registry) {
  if (registry.tools.has('task.wait')) return registry;
  registry.add('task.wait', {
    description: { milliseconds:'integer 1..5000', purpose:'Wait briefly when a page or application is still loading, then inspect its actual state. Waiting alone is never proof of success.' },
    validate: action => { if (!Number.isInteger(action.milliseconds) || action.milliseconds < 1 || action.milliseconds > 5000) throw Error('Wait must be 1..5000 milliseconds'); },
    run: async (action, context) => { await require('node:timers/promises').setTimeout(action.milliseconds, undefined, {signal:context.signal}); return {waitedMs:action.milliseconds,verified:false}; },
  });
  return registry;
}
module.exports = { createProgressGuard, pendingSubmission, registerTaskWait };
