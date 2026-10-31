'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runProjectAgent, projectPath } = require('../src/main/project-agent');
async function fixture(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'capri-agent-')); t.after(() => fs.rm(dir, { recursive: true, force: true })); return fs.realpath(dir); }
test('rejects traversal, secrets, and symlink escape', async t => {
  const root = await fixture(t); const other = await fixture(t);
  await fs.symlink(other, path.join(root, 'link'));
  for (const file of ['../escape', '.env', '.env.local', '.git/config', 'key.pem', 'link/file']) await assert.rejects(projectPath(root, file));
});
test('edits approved files, backs up, and actually runs verification', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, 'answer.txt'), 'old');
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "if(require(\'fs\').readFileSync(\'answer.txt\',\'utf8\')!==\'new\')process.exit(1)"' } }));
  const actions = [{tool:'read',path:'answer.txt'}, {tool:'write',path:'answer.txt',content:'new'}, {tool:'check',script:'test'}, {tool:'finish',summary:'แก้ไขแล้ว'}];
  const permissions = [];
  const result = await runProjectAgent({ root, goal:'fix', signal: AbortSignal.timeout(10000), ask: async () => JSON.stringify(actions.shift()), approve: async a => { permissions.push(a); return true; } });
  assert.equal(result.verified, true); assert.equal(permissions.length, 3);
  const [session] = await fs.readdir(path.join(root,'.capri-backups'));
  assert.equal(await fs.readFile(path.join(root,'.capri-backups',session,'answer.txt'),'utf8'),'old');
});
test('denied write leaves original unchanged', async t => {
  const root = await fixture(t); await fs.writeFile(path.join(root,'file'),'old');
  await assert.rejects(runProjectAgent({root, goal:'fix',signal:AbortSignal.timeout(1000),ask:async()=>JSON.stringify({tool:'write',path:'file',content:'new'}),approve:async()=>false}),{code:'denied'});
  assert.equal(await fs.readFile(path.join(root,'file'),'utf8'),'old');
});
test('finish without checks never claims verified', async t => {
  const root=await fixture(t);
  const result=await runProjectAgent({root,goal:'fix',signal:AbortSignal.timeout(1000),ask:async()=>JSON.stringify({tool:'finish',summary:'done'}),approve:async()=>true});
  assert.equal(result.verified,false);
});
test('repeated writes retain the original backup', async t => {
  const root=await fixture(t); await fs.writeFile(path.join(root,'file'),'original');
  const actions=[{tool:'write',path:'file',content:'first'},{tool:'write',path:'file',content:'second'},{tool:'finish',summary:'done'}];
  const result=await runProjectAgent({root,goal:'edit',signal:AbortSignal.timeout(1000),ask:async()=>JSON.stringify(actions.shift()),approve:async()=>true});
  assert.equal(await fs.readFile(path.join(root,'file'),'utf8'),'second');
  const [session]=await fs.readdir(path.join(root,'.capri-backups'));
  assert.equal(await fs.readFile(path.join(root,'.capri-backups',session,'file'),'utf8'),'original');
  assert.equal(result.verified,false);
});
test('rejects Windows device paths and alternate streams on every platform', async t => {
 const root=await fixture(t);
 for(const p of ['NUL','dir/CON.txt','file:stream','C:\\escape','dir/file.','dir/file ']) await assert.rejects(projectPath(root,p));
});
test('browser verification cannot verify untested code changes',async t=>{
 const root=await fixture(t);
 const {ToolRegistry}=require('../src/main/agent-registry');
 const tools=new ToolRegistry().add('browser.expect',{description:{},validate:()=>{},run:async()=>({passed:true})});
 const actions=[{tool:'write',path:'new.txt',content:'new'},{tool:'browser.expect',contains:'anything'},{tool:'finish',summary:'done'}];
 const r=await runProjectAgent({root,goal:'fix',tools,signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async()=>JSON.stringify(actions.shift())});
 assert.equal(r.verified,false);
});
test('script changes after permission are not executed',async t=>{
 const root=await fixture(t);const manifest=path.join(root,'package.json');
 await fs.writeFile(manifest,JSON.stringify({scripts:{test:'node -e "process.exit(0)"'}}));
 const actions=[{tool:'check',script:'test'},{tool:'finish',summary:'done'}];
 const r=await runProjectAgent({root,goal:'test',signal:AbortSignal.timeout(1000),ask:async()=>JSON.stringify(actions.shift()),approve:async()=>{await fs.writeFile(manifest,JSON.stringify({scripts:{test:'node -e "process.exit(5)"'}}));return true;}});
 assert.match(r.audit[0].error,/changed/);assert.equal(r.checks.length,0);assert.equal(r.verified,false);
});
test('malformed JSON is repaired within the same bounded task',async t=>{
 const root=await fixture(t); const replies=['not json',JSON.stringify({tool:'finish',summary:'stopped'})];
 const r=await runProjectAgent({root,goal:'inspect',signal:AbortSignal.timeout(1000),ask:async()=>replies.shift(),approve:async()=>true});
 assert.equal(r.verified,false);assert.match(r.summary,/stopped/);
});
test('search excludes secret names; move backs up and does not overwrite',async t=>{
 const root=await fixture(t);await fs.writeFile(path.join(root,'note.txt'),'original');await fs.writeFile(path.join(root,'.env'),'secret');
 const actions=[{tool:'search',query:'env'},{tool:'move',from:'note.txt',to:'nested/new.txt'},{tool:'finish',summary:'moved'}];
 let turn=0;
 const r=await runProjectAgent({root,goal:'move',signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async messages=>{if(turn===1)assert.deepEqual(JSON.parse(messages.at(-1).content).toolResult.matches,[]);return JSON.stringify(actions[turn++]);}});
 assert.equal(await fs.readFile(path.join(root,'nested/new.txt'),'utf8'),'original');await assert.rejects(fs.stat(path.join(root,'note.txt')),{code:'ENOENT'});
 const [session]=await fs.readdir(path.join(root,'.capri-backups'));assert.equal(await fs.readFile(path.join(root,'.capri-backups',session,'note.txt'),'utf8'),'original');assert.equal(r.verified,false);
});
test('an unrelated passing check does not hide an unresolved tool failure',async t=>{
 const root=await fixture(t);const {ToolRegistry}=require('../src/main/agent-registry');
 const tools=new ToolRegistry().add('browser.expect',{description:{},validate:()=>{},run:async()=>({passed:true})});
 const actions=[{tool:'read',path:'missing.txt'},{tool:'browser.expect',contains:'ok'},{tool:'finish',summary:'done'}];
 const r=await runProjectAgent({root,goal:'read and verify',tools,signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async()=>JSON.stringify(actions.shift())});assert.equal(r.verified,false);assert.ok(r.audit[0].error);
});
test('desktop-only mode exposes no project file or script tools',async t=>{
 const root=await fixture(t);let prompt;
 const r=await runProjectAgent({root,allowProjectFiles:false,goal:'เปิดเว็บ',signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async messages=>{prompt=messages[0].content;return JSON.stringify({tool:'finish',summary:'not run'});}});
 assert.ok(!prompt.includes('"tool":"write"'));assert.ok(!prompt.includes('"tool":"check"'));assert.ok(prompt.includes('math.solve'));assert.equal(r.verified,false);
});
test('number puzzle failure is reported from actual solver evidence and cannot claim verified success',async t=>{
 const root=await fixture(t);const actions=[{tool:'math.solve',numbers:[3,1,7,1],target:82},{tool:'finish',summary:'จบการตรวจ'}];
 const r=await runProjectAgent({root,goal:'แก้โจทย์นี้',allowProjectFiles:false,signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async()=>JSON.stringify(actions.shift())});
 assert.equal(r.verified,false);assert.match(r.summary,/ไม่พบคำตอบ/);assert.equal(r.checks[0].passed,false);
});

test('informal screen puzzle request retains the verified-math guard',async t=>{
 const root=await fixture(t);const {ToolRegistry}=require('../src/main/agent-registry');const {allowMathText}=require('../src/main/agent-math');
 for(const goal of ['ทำโจทที่อยู่บนหน้าให้หน่อย','ช่วยทำข้อที่อยู่บนหน้านี้ให้หน่อย']){
  let checked=false;const tools=new ToolRegistry().add('probe',{description:{},validate(){},run:async(a,c)=>{assert.equal(c.mathTask,true);assert.throws(()=>allowMathText(c,'15'));checked=true;return{};}});
  const actions=[{tool:'probe'},{tool:'finish',summary:'ไม่ได้กรอกคำตอบ'}];
  await runProjectAgent({root,goal,tools,allowProjectFiles:false,signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async()=>JSON.stringify(actions.shift())});assert.equal(checked,true);
 }
});
test('calculator-only finish is rejected and cannot claim requested typing/submission',async t=>{
 const root=await fixture(t);const {ToolRegistry}=require('../src/main/agent-registry');let calls=0;
 const tools=new ToolRegistry().add('desktop.input',{description:{},validate(){},run:async()=>{throw Error('must not be called by test fixture');}});
 const r=await runProjectAgent({root,goal:'คำนวณแล้วกรอกคำตอบบนหน้าจอและกดส่ง',tools,allowProjectFiles:false,signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async()=>JSON.stringify(++calls===1?{tool:'math.evaluate',expression:'2*7+9/9'}:{tool:'finish',summary:'กรอกและส่งสำเร็จ'})});
 assert.equal(calls,4);assert.equal(r.verified,false);assert.match(r.summary,/ยังไม่ได้ทำตามคำสั่ง/);assert.match(r.summary,/ยังไม่ได้ส่งคำสั่ง/);
});
test('early finish continues into requested native actions; title checks do not prove form submission',async t=>{
 const root=await fixture(t);const {ToolRegistry}=require('../src/main/agent-registry');let delivered=0;
 const tools=new ToolRegistry().add('desktop.input',{description:{},validate(){},run:async()=>{delivered++;return{text:{inputDelivered:true}};}}).add('desktop.expect',{description:{},validate(){},run:async()=>({passed:true})});
 const actions=[{tool:'math.evaluate',expression:'2*7+9/9'},{tool:'finish',summary:'15'},{tool:'desktop.input',kind:'type',text:'15',targetHandle:'1'},{tool:'desktop.input',kind:'key',key:'enter',targetHandle:'1'},{tool:'desktop.expect'},{tool:'finish',summary:'ส่งคำสั่งแล้ว'}];
 const r=await runProjectAgent({root,goal:'กรอกคำตอบบนหน้าจอแล้วกดส่ง',tools,allowProjectFiles:false,signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async()=>JSON.stringify(actions.shift())});
 assert.equal(delivered,2);assert.equal(r.verified,false);assert.doesNotMatch(r.summary,/ยังไม่ได้ทำตามคำสั่ง/);assert.match(r.summary,/กดส่ง ส่งคำสั่งแล้ว/);
});
