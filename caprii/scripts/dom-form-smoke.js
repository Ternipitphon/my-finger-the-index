'use strict';
// Local HTML fixtures only. Exercises both actual Electron worlds and broker transport.
const {app,BrowserWindow,session}=require('electron');
const http=require('node:http'),assert=require('node:assert/strict');
const {createBrowser}=require('../src/main/agent-browser');
const {createChromeBroker}=require('../src/main/chrome-broker');
const {createAgentTools}=require('../src/main/agent-tools');
const createDOM=require('../src/shared/browser-dom');
app.on('window-all-closed',()=>{}); // Keep the runner alive between the two adapters.
app.commandLine.appendSwitch('use-angle','swiftshader');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
let server,broker,isolated,extensionWindow,stopped=false,peer;
const deadline=setTimeout(()=>{console.error('DOM form smoke timed out');app.exit(1);},45000);
const fixture=`<!doctype html><meta charset="utf-8"><title>แบบฟอร์ม DOM</title><style>body{width:800px} #editor{width:300px;min-height:24px}</style>
<label>ชื่อ<input id="name"></label>
<label>ประเทศ<select id="country"><option value="">เลือก</option><option value="th">ไทย</option><optgroup label="disabled" disabled><option value="blocked">ห้าม</option></optgroup></select></label>
<label><input id="consent" type="checkbox">ยอมรับ</label>
<label><input id="radio" type="radio" name="choice">A</label>
<label>อ่านอย่างเดียว<input id="readonly" readonly value="locked"></label>
<fieldset disabled><input id="disabled" value="locked"></fieldset>
<input id="hidden" style="visibility:hidden"><input id="password" type="password" value="do-not-read">
<div id="editor" contenteditable="true" aria-label="หมายเหตุ">note</div>
<button id="submit">ส่งแบบฟอร์ม</button><output id="result">รอ</output><p id="decoy">Success from old unrelated content</p>
<script>
window.changes=0;document.getElementById('consent').addEventListener('change',()=>window.changes++);
document.getElementById('submit').onclick=()=>setTimeout(()=>document.getElementById('result').textContent=document.getElementById('name').value==='มาลี'&&document.getElementById('country').value==='th'&&document.getElementById('consent').checked?'ส่งสำเร็จ #1':'ผิด',350);
</script>`;
async function exercise(browser,wc,label){
 const signal=AbortSignal.timeout(15000),tools=createAgentTools({browser});
 const context={signal,permission:async()=>true};
 let snap=await browser.snapshot(signal);
 const page=code=>wc.executeJavaScript(code);
 const field=id=>{const target=snap.elements.find(e=>e.elementId===id);assert.ok(target,'missing '+id+' in '+JSON.stringify(snap.elements));return{id:target.id,generation:snap.generation};};
 const act=async(kind,id,extra={})=>{const r=await tools.execute({tool:'browser.'+kind,...field(id),...extra},context);snap=r.result.observed;return r.result;};
 assert.equal(snap.title,'แบบฟอร์ม DOM');assert.equal(snap.elements.some(e=>e.elementId==='hidden'),false);
 assert.equal(snap.elements.find(e=>e.elementId==='password').value,undefined);
 assert.equal(snap.elements.find(e=>e.elementId==='disabled').disabled,true);
 assert.equal(snap.elements.find(e=>e.elementId==='country').options.find(o=>o.value==='blocked').disabled,true);
 const old=field('name');await act('type','name',{value:'มาลี'});
 await assert.rejects(browser.interact({...old,kind:'type',value:'stale'},signal),/เปลี่ยน/);
 assert.equal((await act('expect_value','name',{value:'มาลี'})).passed,true);
 await act('select','country',{value:'th'});
 assert.equal((await act('expect_value','country',{value:'th'})).passed,true);
 await act('check','consent',{checked:true});assert.equal((await act('expect_value','consent',{checked:true})).passed,true);
 await act('check','consent',{checked:true});assert.equal(await page('window.changes'),1);
 await act('check','consent',{checked:false});assert.equal((await act('expect_value','consent',{checked:false})).passed,true);
 await act('check','consent',{checked:true});await act('check','radio',{checked:true});
 assert.equal((await act('expect_value','radio',{checked:true})).passed,true);
 await assert.rejects(act('check','radio',{checked:false}),/radio/);
 await act('type','editor',{value:'หมายเหตุใหม่'});assert.equal((await act('expect_value','editor',{value:'หมายเหตุใหม่'})).passed,true);
 await assert.rejects(act('type','readonly',{value:'bad'}),/read-only/);
 await assert.rejects(act('type','disabled',{value:'bad'}),/ใช้งานไม่ได้/);
 await assert.rejects(act('type','password',{value:'bad'}),/รหัสผ่าน/);
 await assert.rejects(act('select','country',{value:'blocked'}),/disabled/);
 await assert.rejects(act('select','country',{value:'unknown'}),/missing/);
 await page("document.body.insertAdjacentHTML('beforeend','<p id=late>preexisting late result</p>')");
 await act('click','submit',{intent:'submit'});
 assert.ok(context.submitBaseline.text.includes('preexisting late result'));
 const staleResult=await tools.execute({tool:'browser.expect',contains:'preexisting late result',selector:'#late',timeoutMs:0},context);snap=staleResult.result.observed;assert.equal(staleResult.result.passed,false);
 const verified=await tools.execute({tool:'browser.expect',contains:'ส่งสำเร็จ #1',selector:'#result',timeoutMs:1500},context);snap=verified.result.observed;assert.equal(verified.result.passed,true);
 const unrelated=await tools.execute({tool:'browser.expect',contains:'ส่งสำเร็จ #1',selector:'#decoy',timeoutMs:0},context);snap=unrelated.result.observed;assert.equal(unrelated.result.passed,false);
 const absent=await tools.execute({tool:'browser.expect',contains:'absent',selector:'#result',timeoutMs:50},context);snap=absent.result.observed;assert.equal(absent.result.passed,false);
 const oldResult=await tools.execute({tool:'browser.expect',contains:'Success',selector:'#decoy',timeoutMs:0},context);snap=oldResult.result.observed;assert.equal(oldResult.result.passed,false);
 await assert.rejects(browser.expectText({contains:'x',selector:'[',timeoutMs:0},signal));
 snap=await browser.snapshot(signal);const hidden=field('name');await page("document.getElementById('name').style.display='none'");
 await assert.rejects(browser.interact({...hidden,kind:'type',value:'bad'},signal),/ไม่พบ/);
 await page("document.getElementById('name').style.display=''");snap=await browser.snapshot(signal);
 const moved=field('name');await page("history.pushState({},'', '#changed')");await assert.rejects(browser.interact({...moved,kind:'type',value:'bad'},signal),/เปลี่ยน/);
 snap=await browser.snapshot(signal);const replaced=field('name');await page("document.getElementById('name').replaceWith(document.getElementById('name').cloneNode())");
 await assert.rejects(browser.interact({...replaced,kind:'type',value:'bad'},signal),/ไม่พบ/);
 snap=await browser.snapshot(signal);await page("document.getElementById('country').options[1].label='changed'");
 await assert.rejects(act('select','country',{value:'th'}),/ตัวเลือกเปลี่ยน/);
 snap=await browser.snapshot(signal);await page("document.getElementById('name').addEventListener('input',e=>setTimeout(()=>e.target.value='rollback',20))");
 await assert.rejects(act('type','name',{value:'rejected'}),/ไม่เก็บค่า/);
 console.log('PASS '+label+': visible DOM reading, text/select/checkbox/radio/contenteditable, readback, delayed scoped submit evidence, stale/hidden/replaced/changed controls, rejected input and old acknowledgment');
}
app.whenReady().then(async()=>{
 server=http.createServer((_req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 let agentWindow;
 isolated=createBrowser({BrowserWindow:class extends BrowserWindow{constructor(options){super(options);agentWindow=this;}},session});
 await isolated.navigate(url,AbortSignal.timeout(5000));await exercise(isolated,agentWindow.webContents,'isolated agent browser');await isolated.close();
 extensionWindow=new BrowserWindow({show:false,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}});await extensionWindow.loadURL(url);
 await extensionWindow.webContents.executeJavaScriptInIsolatedWorld(1004,[{code:`globalThis.bridge=(${createDOM.toString()})();true;`}]);
 const token='local-dom-fixture',extensionId='fixture-extension';broker=createChromeBroker({port:0,token,extensionId});const {port}=await broker.start();
 const post=(path,data)=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path,method:'POST',headers:{Authorization:'Bearer '+token,'X-Caprii-Extension':extensionId,Origin:'chrome-extension://'+extensionId,'Content-Type':'application/json'}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>res.statusCode===200?resolve(JSON.parse(text)):reject(Error('HTTP '+res.statusCode)));});req.on('error',reject);req.end(JSON.stringify(data));});
 const connected=await post('/connect',{url,title:'แบบฟอร์ม DOM'});
 peer=(async()=>{while(!stopped){const {command}=await post('/poll',{session:connected.session});if(command){let result,error;try{result=await extensionWindow.webContents.executeJavaScriptInIsolatedWorld(1004,[{code:`globalThis.bridge.execute(${JSON.stringify(command.op)},${JSON.stringify(command.args)})`}]);}catch(e){error=e.message;}await post('/reply',{session:connected.session,id:command.id,result,error});}await new Promise(r=>setTimeout(r,10));}})();
 await exercise(broker.browser(),extensionWindow.webContents,'authenticated selected-tab broker');
 stopped=true;await peer;await broker.close();extensionWindow.destroy();await new Promise(r=>server.close(r));clearTimeout(deadline);app.exit(0);
}).catch(err=>{console.error(err);stopped=true;clearTimeout(deadline);app.exit(1);});
