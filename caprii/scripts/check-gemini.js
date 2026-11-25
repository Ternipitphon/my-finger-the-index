'use strict';
// Explicit, opt-in live check; may consume provider quota. Never prints credentials.
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const llm=require('../src/main/llm');
const {runChat}=require('../src/main/chat-runner');
const {runProjectAgent}=require('../src/main/project-agent');
const model=process.env.CAPRII_TEST_MODEL || 'models/gemini-3.5-flash-lite';
const request=(messages,signal)=>runChat({models:[model],signal,request:(model,delta,signal)=>llm.chat('gemini',{}, {model,messages},delta,signal)}).then(r=>r.text);
(async()=>{
 if(!process.env.GEMINI_API_KEY)throw Error('GEMINI_API_KEY is missing');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'caprii-live-coding-'));
 try{
  await fs.writeFile(path.join(root,'solution.js'),'exports.add = (a, b) => a - b;\n');
  await fs.writeFile(path.join(root,'verify.js'),"require('node:assert/strict').equal(require('./solution').add(2,3),5); console.log('1 assertion passed');\n");
  await fs.writeFile(path.join(root,'package.json'),JSON.stringify({scripts:{test:'node verify.js'}}));
  const result=await runProjectAgent({root,goal:'ตรวจและแก้บั๊กฟังก์ชัน add ใน solution.js ให้บวกเลขถูกต้อง รัน npm test เพื่อยืนยัน ห้ามแก้ verify.js หรือ package.json สรุปภาษาไทย',signal:AbortSignal.timeout(120000),ask:request,
   approve:async a=>['list','search'].includes(a.tool)||(a.tool==='read'&&['solution.js','verify.js','package.json'].includes(a.path))||(a.tool==='write'&&a.path==='solution.js')||(a.tool==='check'&&a.script==='test'),
   onProgress:e=>{if(e.status==='done'||e.status==='failed')console.log(JSON.stringify({step:e.step,tool:e.tool,status:e.status}));},
  });
  assert.equal(result.verified,true);assert.ok(result.audit.some(e=>e.tool==='write'&&e.status==='done'));assert.ok(result.checks.some(c=>c.passed));
  console.log(JSON.stringify({liveCodingAgent:'passed',model,summary:result.summary,checks:result.checks}));
 }finally{await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(JSON.stringify({error:e.name,code:e.code,status:e.status,message:/missing|assert/i.test(e.message)?e.message:'Live Gemini validation failed; see tool step outcomes'}));process.exitCode=1;});
