'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createReach,registerReach,publicUrl,isYouTube}=require('../src/main/agent-reach');
const {ToolRegistry}=require('../src/main/agent-registry');
test('Agent Reach accepts only public URL shapes and exact YouTube hosts',()=>{
 for(const url of ['file:///etc/passwd','http://localhost/','http://127.1/','http://0x7f000001/','http://10.1.2.3/','http://192.168.1.1/','http://foo.internal/','https://user:pass@example.com/','http://169.254.169.254/'])assert.throws(()=>publicUrl(url),url);
 assert.equal(isYouTube('https://youtube.com.evil.example/watch?v=x'),false);assert.equal(isYouTube('https://www.youtube.com/watch?v=x'),true);
});
test('Agent Reach runs fixed bundled bridge with JSON, isolated Python, stripped secrets and cancellation',async()=>{
 const controller=new AbortController();let observed;const reach=createReach({platform:'win32',run:async(file,args,opts)=>{observed={file,args,opts};return{passed:true,stdout:JSON.stringify({ok:true,result:{items:[{text:'fixture'}]}})};}});
 await reach.read('https://www.youtube.com/watch?v=0MeXKrFAoME',controller.signal);
 assert.match(observed.file,/python.exe$/);assert.deepEqual(observed.args.slice(0,4),['-I','-B','-X','utf8']);assert.match(observed.args[4],/caprii_bridge.py$/);assert.equal(observed.opts.signal,controller.signal);assert.equal(observed.opts.timeoutMs,45000);assert.equal(JSON.parse(observed.opts.input).channel,'youtube');assert.ok(!Object.keys(observed.opts.env).some(k=>/API_?KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTHORIZATION/i.test(k)));
});
test('Agent Reach failures and malformed output never become invented evidence',async()=>{
 for(const stdout of ['not json',JSON.stringify({ok:false,error:{code:'PLATFORM_BLOCKED',message:'403'}})]){
 let calls=0;const reach=createReach({run:async()=>{calls++;return{passed:true,stdout};}});await assert.rejects(reach.read('https://example.com/',AbortSignal.timeout(1000)));assert.equal(calls,1);
 }
});
test('Agent Reach offers no install/login/cookie/transcription commands and checks permission before network',async()=>{
 let calls=0;const tools=registerReach(new ToolRegistry(),{read:async()=>{calls++;}});assert.deepEqual([...tools.tools.keys()],['reach.status','reach.read','reach.subtitles','reach.search']);
 await assert.rejects(tools.execute({tool:'reach.read',url:'https://example.com/'},{signal:AbortSignal.timeout(1000),permission:async()=>{throw Error('denied');}}),/denied/);assert.equal(calls,0);
 await assert.rejects(tools.execute({tool:'reach.search',query:'x',channel:'shell',limit:5},{signal:AbortSignal.timeout(1000)}),/Unsupported/);
});
test('public link and search requests route to evidence tools while refusal stays in chat',async()=>{
 const fs=require('node:fs'),path=require('node:path');const src=fs.readFileSync(path.join(__dirname,'../src/renderer/js/reach-intent.js'));const {reachIntent}=await import('data:text/javascript;base64,'+src.toString('base64'));
 assert.match(reachIntent('https://www.youtube.com/watch?v=0MeXKrFAoME'),/คำบรรยาย/);assert.match(reachIntent('สรุป https://example.com/'),/Agent Reach/);assert.match(reachIntent('ค้นหาในเว็บเรื่อง Electron'),/reach.search/);assert.equal(reachIntent('ไม่ต้องอ่าน https://example.com/'),null);assert.equal(reachIntent('สวัสดี'),null);
});
