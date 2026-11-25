'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { runChat } = require('../src/main/chat-runner');
const busy = () => Object.assign(new Error('busy'), { code: 'busy' });
test('falls back and returns the model that actually answered Thai', async () => {
  const calls = [];
  const result = await runChat({ models: ['busy', 'working'], retryMs: 1, request: async (model, delta) => {
    calls.push(model); if (model === 'busy') throw busy(); delta('สวัสดี'); return 'สวัสดี';
  } });
  assert.deepEqual(calls, ['busy', 'working']); assert.equal(result.model, 'working');
});
test('caps attempts across all models', async () => {
  let calls = 0;
  await assert.rejects(runChat({ models: ['a','b','c','d'], retryMs: 1, request: async () => { calls++; throw busy(); } }), { code: 'busy' });
  assert.equal(calls, 3);
});
test('cancel stops backoff before another request', async () => {
  const controller = new AbortController(); let calls = 0;
  const result = runChat({ models: ['a'], signal: controller.signal, request: async () => { calls++; setTimeout(() => controller.abort(), 5); throw busy(); } });
  await assert.rejects(result, { code: 'cancelled' }); assert.equal(calls, 1);
});
test('total deadline aborts a stalled provider', async () => {
  await assert.rejects(runChat({ models: ['a'], timeoutMs: 20, request: async (_, delta, signal) => { await delay(1000, undefined, { signal }); return 'late'; } }), { code: 'timeout' });
});
test('never retries partial streamed answers', async () => {
  let calls = 0;
  await assert.rejects(runChat({ models: ['a','b'], request: async (_, delta) => { calls++; delta('partial'); throw busy(); } }), { code: 'busy' });
  assert.equal(calls, 1);
});
test('auth errors and empty replies fail without fallback', async () => {
  let calls = 0;
  await assert.rejects(runChat({ models: ['a','b'], request: async () => { calls++; throw Object.assign(new Error('unauthorized'), { status: 401 }); } }), { status: 401 });
  assert.equal(calls, 1);
  await assert.rejects(runChat({ models: ['a'], request: async () => '' }), { code: 'empty' });
});
test('deadline rejects even a provider that ignores its abort signal', async () => {
 const hold=setTimeout(()=>{},200);
 try{await assert.rejects(runChat({models:['a'],timeoutMs:20,request:()=>new Promise(()=>{})}),{code:'timeout'});}finally{clearTimeout(hold);}
});
