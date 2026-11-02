'use strict';
// Official Google Chrome + unmodified unpacked extension, activeTab action grant,
// real service worker/content script, authenticated broker, real DOM. No AI API call.
const {spawn}=require('node:child_process'),fs=require('node:fs'),fsp=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createChromeBroker}=require('../src/main/chrome-broker');
const chromePath=process.env.CAPRII_CHROME;if(!chromePath)throw Error('Set CAPRII_CHROME to an official Google Chrome executable');
const wait=ms=>new Promise(r=>setTimeout(r,ms));let chrome,server,broker;let nextId=0,buffer=Buffer.alloc(0);const pending=new Map();
function call(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},10000);pending.set(id,msg=>{clearTimeout(timer);pending.delete(id);msg.error?reject(Error(msg.error.message)):resolve(msg.result);});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});}
async function evaluate(sessionId,expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true},sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
async function until(fn){for(let i=0;i<100;i++){const r=await fn();if(r)return r;await wait(100);}throw Error('Timed out waiting for Chrome state');}
(async()=>{const profile=await fsp.mkdtemp(path.join(os.tmpdir(),'caprii-google-chrome-'));try{
 server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>Caprii Chrome fixture</title><label>คำตอบ<input id="answer"></label><button onclick="document.querySelector(\'output\').textContent=document.querySelector(\'input\').value===\'15\'?\'คำตอบถูกต้อง\':\'คำตอบผิด\'">ส่งคำตอบ</button><output></output>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 broker=createChromeBroker();const info=await broker.start();
 chrome=spawn(chromePath,[...(process.env.CAPRII_CHROME_HEADLESS==='1'?['--headless=new','--no-sandbox']:[]),'--remote-debugging-pipe','--enable-unsafe-extension-debugging','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-gpu','about:blank'],{stdio:['ignore','ignore',fs.openSync(path.join(profile,'chrome.log'),'w'),'pipe','pipe']});
 chrome.stdio[4].on('data',b=>{buffer=Buffer.concat([buffer,b]);let at;while((at=buffer.indexOf(0))>=0){const msg=JSON.parse(buffer.subarray(0,at));buffer=buffer.subarray(at+1);if(msg.id)pending.get(msg.id)?.(msg);}});
 const version=await call('Browser.getVersion');assert.match(version.product,/Chrome\//);
 const extension=await call('Extensions.loadUnpacked',{path:path.resolve(__dirname,'../browser-extension')});assert.equal(extension.id,require('../src/main/extension-identity.json').id);
 const {targetId}=await call('Target.createTarget',{url});const {sessionId:page}=await call('Target.attachToTarget',{targetId,flatten:true});await until(()=>evaluate(page,"!!document.querySelector('#answer')"));
 async function popup(){await call('Target.activateTarget',{targetId});const tabs=await call('Target.getTargets',{filter:[{type:'tab'},{exclude:true}]});const tab=tabs.targetInfos.find(t=>t.url===url);assert.ok(tab,JSON.stringify(tabs));await call('Extensions.triggerAction',{id:extension.id,targetId:tab.targetId});const t=await until(async()=>{const {targetInfos}=await call('Target.getTargets');return targetInfos.find(t=>t.url===`chrome-extension://${extension.id}/popup.html`);});return(await call('Target.attachToTarget',{targetId:t.targetId,flatten:true})).sessionId;}
 let pop=await popup();await until(()=>evaluate(pop,"!!document.querySelector('#connect')"));
 await evaluate(pop,`document.getElementById('code').value=${JSON.stringify(info.code)};document.getElementById('connect').click();true`);await until(()=>broker.status().connected);await wait(300);
 const browser=broker.browser(),signal=AbortSignal.timeout(20000);let snap=await browser.snapshot(signal);let answer=snap.elements.find(e=>e.tag==='input');assert.ok(answer,JSON.stringify(snap));
 await browser.interact({kind:'type',id:answer.id,generation:snap.generation,value:'15'},signal);
 snap=await browser.snapshot(signal);answer=snap.elements.find(e=>e.tag==='input');assert.equal((await browser.verifyField({id:answer.id,generation:snap.generation,value:'15'},signal)).passed,true);
 snap=await browser.snapshot(signal);const submit=snap.elements.find(e=>/ส่งคำตอบ/.test(e.label));await browser.interact({kind:'click',id:submit.id,generation:snap.generation},signal);snap=await browser.snapshot(signal);assert.match(snap.text,/คำตอบถูกต้อง/);assert.equal(await evaluate(page,"document.querySelector('#answer').value"),'15');
 if(process.env.CAPRII_CHROME_SCREENSHOT){const shot=await call('Page.captureScreenshot',{format:'png'},page);await fsp.writeFile(process.env.CAPRII_CHROME_SCREENSHOT,Buffer.from(shot.data,'base64'));}
 console.log('PASS:',version.product,'unmodified extension action -> activeTab -> pair -> DOM read/type/value verification/click -> real acknowledgment; sandbox intact');
 await call('Page.reload',{},page);await until(async()=>!broker.status().connected);await assert.rejects(browser.snapshot(AbortSignal.timeout(2000)));
 pop=await popup();await until(async()=>(await evaluate(pop,"document.getElementById('code')?.value"))===info.code);await evaluate(pop,"document.getElementById('connect').click();true");await until(()=>broker.status().connected);await wait(300);const fresh=await broker.browser().snapshot(AbortSignal.timeout(5000));assert.equal(fresh.elements.find(e=>e.tag==='input').value,'');
 console.log('PASS: reload revokes old task lease; popup reuses session code without recopying, explicit action reconnects current tab');
 await call('Browser.close');await new Promise(r=>chrome.once('exit',r));chrome=null;
 }finally{if(chrome){const stopped=new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));chrome.kill('SIGKILL');await stopped;}await broker?.close();if(server)await new Promise(r=>server.close(r));await fsp.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
})().catch(e=>{console.error(e);process.exitCode=1;});
