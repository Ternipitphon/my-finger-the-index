'use strict';
const { setTimeout: delay } = require('node:timers/promises');

function withAbort(request, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const aborted = () => reject(signal.reason);
    signal.addEventListener('abort', aborted, { once: true });
    Promise.resolve().then(request).then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted));
  });
}

// One budget covers requests, streaming, fallback and backoff. A partial answer is never retried.
async function runChat({ models, request, onDelta = () => {}, signal, timeoutMs = 30000, maxAttempts = 3, retryMs = 750 }) {
  const deadline = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  let partial = false;
  let selected = 0;
  const candidates = [...new Set(models.filter(Boolean))];
  if (!candidates.length) throw Object.assign(new Error('No chat model selected'), { code: 'nomodel' });
  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      combined.throwIfAborted();
      try {
        const text = await withAbort(() => request(candidates[selected], (piece) => {
          combined.throwIfAborted();
          if (piece) { partial = true; onDelta(piece); }
        }, combined), combined);
        combined.throwIfAborted();
        if (!text.trim()) throw Object.assign(new Error('The model returned no text'), { code: 'empty' });
        return { text, model: candidates[selected] };
      } catch (err) {
        combined.throwIfAborted();
        if (partial || !['busy', 'gone', 'signin'].includes(err.code) || attempt + 1 >= maxAttempts) throw err;
        if (selected + 1 < candidates.length) selected++;
        else if (err.code !== 'busy') throw err;
        await delay(retryMs, undefined, { signal: combined });
      }
    }
  } catch (err) {
    if (combined.aborted) {
      const cancelled = signal?.aborted;
      throw Object.assign(new Error(cancelled ? 'stopped' : 'Chat timed out. Please try again.'), { code: cancelled ? 'cancelled' : 'timeout' });
    }
    throw err;
  }
}
module.exports = { runChat };
