'use strict';
// Optional live check: only public arithmetic, no desktop/browser/file tools.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const llm = require('../src/main/llm');
const { runProjectAgent } = require('../src/main/project-agent');
(async () => {
  if (!process.env.GEMINI_API_KEY) throw Error('Set GEMINI_API_KEY privately before this optional live check.');
  const models = await llm.models('gemini', {});
  const model = models.find(id => /gemini-3\.1-flash-lite$/.test(id)) || models.find(id => /flash-lite$/.test(id));
  if (!model) throw Error('No stable Flash Lite model is available; no paid chat request was sent.');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'caprii-agent-live-'));
  const seen = [];
  try {
    const result = await runProjectAgent({ root, goal:'ช่วยคำนวณ 18 คูณ 7 แล้วบอกผลสั้น ๆ เป็นภาษาไทย ห้ามเปิดเว็บ ห้ามแก้ไฟล์',
      allowProjectFiles:false, maxSteps:8, timeoutMs:90000, signal:AbortSignal.timeout(90000),
      approve:async()=>{ throw Error('This check may not approve external actions'); },
      ask:(messages,signal)=>llm.chat('gemini', {}, {model,messages,jsonMode:llm.isTaskActionRequest(messages,true)},()=>{},signal),
      onProgress:event=>{if(event.tool)seen.push(event.tool);},
    });
    assert.equal(result.verified,true);
    assert.ok(result.checks.some(check=>check.tool.startsWith('math.')&&check.passed));
    assert.match(result.summary,/126/);
    console.log(JSON.stringify({model,verified:result.verified,summary:result.summary,tools:[...new Set(seen)],desktopOrBrowserActions:0}));
  } finally { await fs.rm(root,{recursive:true,force:true}); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
