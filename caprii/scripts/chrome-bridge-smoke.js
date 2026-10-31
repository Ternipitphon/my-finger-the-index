'use strict';
const {app,BrowserWindow}=require('electron'),http=require('node:http'),assert=require('node:assert/strict'),os=require('node:os');
const {createChromeBroker}=require('../src/main/chrome-broker'),createDOM=require('../src/shared/browser-dom');
const {createAgentTools}=require('../src/main/agent-tools'),{runProjectAgent}=require('../src/main/project-agent');
app.commandLine.appendSwitch('use-angle','swiftshader');app.commandLine.appendSwitch('enable-unsafe-swiftshader');
let win,server,broker,stopped=false;const timeout=setTimeout(()=>{console.error('Selected-tab bridge smoke timed out');app.exit(1);},45000);
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>โจทย์ทดสอบ</title><label>คำตอบ<input id="answer"></label><button onclick="document.querySelector(\'output\').textContent=document.querySelector(\'input\').value===\'15\'?\'คำตอบถูกต้อง\':\'คำตอบผิด\'">ส่งคำตอบ</button><output></output>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 win=new BrowserWindow({width:700,height:500,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}});await win.loadURL(url);
 await win.webContents.executeJavaScriptInIsolatedWorld(1004,[{code:`globalThis.bridge=(${createDOM.toString()})();true;`}]);
 const token='only-local-test-token',extensionId='test-extension';broker=createChromeBroker({port:0,token,extensionId});const {port}=await broker.start();
 const post=(path,data)=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path,method:'POST',headers:{Authorization:'Bearer '+token,'X-Caprii-Extension':extensionId,Origin:'chrome-extension://'+extensionId,'Content-Type':'application/json'}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{if(res.statusCode!==200)return reject(Error('bridge status '+res.statusCode));resolve(JSON.parse(Buffer.concat(chunks)));});});req.on('error',reject);req.end(JSON.stringify(data));});
 const {session}=await post('/connect',{url,title:'โจทย์ทดสอบ'});
 const peer=(async()=>{while(!stopped){const {command}=await post('/poll',{session});if(command){let result,error;try{result=await win.webContents.executeJavaScriptInIsolatedWorld(1004,[{code:`globalThis.bridge.execute(${JSON.stringify(command.op)},${JSON.stringify(command.args)})`}]);}catch(e){error=e.message;}await post('/reply',{session,id:command.id,result,error});}await new Promise(r=>setTimeout(r,20));}})();
 const browser=broker.browser();let turn=0;const permissions=[];
 const result=await runProjectAgent({root:os.tmpdir(),goal:'คำนวณแล้วกรอกคำตอบและกดส่ง',allowProjectFiles:false,browserContext:browser.description(),tools:createAgentTools({browser}),signal:AbortSignal.timeout(20000),approve:async a=>{permissions.push(a.tool);return true;},ask:async messages=>{
  let data;try{data=JSON.parse(messages.at(-1).content).toolResult;}catch{}
  const field=()=>data.elements.find(e=>e.tag==='input'),after=()=>data.observed;
  const actions=[()=>({tool:'math.evaluate',expression:'2*7+9/9'}),()=>({tool:'finish',summary:'15'}),()=>({tool:'browser.read'}),()=>({tool:'browser.type',id:field().id,generation:data.generation,value:'15'}),()=>({tool:'browser.expect_value',id:after().elements.find(e=>e.tag==='input').id,generation:after().generation,value:'15'}),()=>({tool:'browser.click',intent:'submit',id:after().elements.find(e=>e.tag==='button').id,generation:after().generation}),()=>({tool:'browser.expect',contains:'คำตอบถูกต้อง'}),()=>({tool:'finish',summary:'กรอกและส่งแล้ว ตรวจพบคำตอบถูกต้อง'})];return JSON.stringify(actions[turn++]());
 }});
 assert.equal(result.verified,true);assert.ok(permissions.includes('browser.type'));assert.ok(permissions.includes('browser.expect_value'));assert.equal(await win.webContents.executeJavaScript('document.getElementById("answer").value'),'15');assert.equal(await win.webContents.executeJavaScript('document.querySelector("output").textContent'),'คำตอบถูกต้อง');
 stopped=true;await peer;await browser.close();await broker.close();await new Promise(r=>server.close(r));win.destroy();clearTimeout(timeout);console.log('PASS: authenticated selected-tab bridge -> shared isolated DOM -> verified math -> actual fill/readback/click/post-submit DOM check; premature finish rejected');app.exit(0);
}).catch(err=>{console.error(err);stopped=true;clearTimeout(timeout);app.exit(1);});
