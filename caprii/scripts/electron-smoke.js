'use strict';
const {app,BrowserWindow,session,protocol,net,ipcMain,screen,desktopCapturer}=require('electron');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const {createBrowser}=require('../src/main/agent-browser');
const {createAgentTools}=require('../src/main/agent-tools');
const {runProjectAgent}=require('../src/main/project-agent');
const {registerAgentWindowIpc,createAgentWindow}=require('../src/main/agent-window');
protocol.registerSchemesAsPrivileged([{scheme:'capri',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.on('window-all-closed', event => event.preventDefault());
app.commandLine.appendSwitch('use-angle','swiftshader');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
let server,browser,root,task;
const timeout=setTimeout(()=>{console.error('Electron smoke timed out');app.exit(1);},45000);
app.whenReady().then(async()=>{
 protocol.handle('capri',request=>{
  const u=new URL(request.url); const file=path.resolve(__dirname,'..','.'+u.pathname);
  if(!file.startsWith(path.resolve(__dirname,'..')+path.sep))return new Response('Forbidden',{status:403});
  return net.fetch(pathToFileURL(file).href);
 });
 root=await fs.mkdtemp(path.join(os.tmpdir(),'caprii-electron-'));
 server=http.createServer((req,res)=>{
  if(req.url==='/redirect'){res.writeHead(302,{Location:'https://example.com'});res.end();return;}
  res.setHeader('content-type','text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="th"><title>Caprii Browser Fixture</title><body><h1>แบบทดสอบ</h1><label>ชื่อ <input aria-label="ชื่อ"></label><button onclick="document.querySelector('output').textContent='สวัสดี '+document.querySelector('input').value">ยืนยัน</button><output></output><label>แป้นคำตอบ<input id="readonly" readonly></label><button onclick="document.getElementById('readonly').value+='2'">2</button><input id="rejected" aria-label="ช่องไม่รับข้อความ" oninput="this.value=''"><input type="password" value="fixture-private-password"><script>window.__capriiGeneration='tampered';window.__capriiElements=[];</script></body></html>`);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=createBrowser({BrowserWindow,session});
 const tools=createAgentTools({browser});
 let turn=0;
 const result=await runProjectAgent({root,goal:'คำนวณ กรอกคำตอบและกดส่ง',tools,signal:AbortSignal.timeout(30000),approve:async()=>true,
  ask:async messages=>{
   const last=messages.at(-1);let data=null;try{data=JSON.parse(last.content).toolResult;}catch{}
   const actions=[()=>({tool:'math.evaluate',expression:'2*7+9/9'}),()=>({tool:'finish',summary:'15'}),()=>({tool:'browser.open',url:`http://127.0.0.1:${server.address().port}/`}),
    ()=>({tool:'browser.type',id:data.elements.find(e=>e.tag==='input').id,generation:data.generation,value:'15'}),
    ()=>({tool:'browser.click',intent:'submit',id:data.observed.elements.find(e=>e.tag==='button').id,generation:data.observed.generation}),
    ()=>({tool:'browser.expect',contains:'สวัสดี 15'}),()=>({tool:'finish',summary:'ตรวจผลจริงสำเร็จ'})];
   return JSON.stringify(actions[turn++]());
  }});
 assert.equal(result.verified,true);assert.equal(result.checks[0].passed,true);
 const picture=await browser.capture(AbortSignal.timeout(2000));assert.match(picture.image,/^data:image\/png;base64,/);
 let observed=await browser.snapshot(AbortSignal.timeout(2000));
 const field=()=>observed.elements.find(e=>e.tag==='input'&&e.label.includes('ชื่อ'));
 let checked=await browser.verifyField({id:field().id,generation:observed.generation,value:'15'},AbortSignal.timeout(2000));assert.equal(checked.passed,true);observed=checked.observed;
 checked=await browser.verifyField({id:field().id,generation:observed.generation,value:'16'},AbortSignal.timeout(2000));assert.equal(checked.passed,false);observed=checked.observed;
 const readonly=observed.elements.find(e=>e.readOnly);assert.equal(readonly.editable,false);
 await assert.rejects(browser.interact({kind:'type',id:readonly.id,generation:observed.generation,value:'2'},AbortSignal.timeout(2000)),/read-only/);
 const key=observed.elements.find(e=>e.tag==='button'&&e.label==='2');
 const clicked=await browser.interact({kind:'click',id:key.id,generation:observed.generation},AbortSignal.timeout(2000));observed=clicked.observed;
 checked=await browser.verifyField({id:observed.elements.find(e=>e.readOnly).id,generation:observed.generation,value:'2'},AbortSignal.timeout(2000));assert.equal(checked.passed,true);observed=checked.observed;
 const rejected=observed.elements.find(e=>e.label==='ช่องไม่รับข้อความ');
 await assert.rejects(browser.interact({kind:'type',id:rejected.id,generation:observed.generation,value:'15'},AbortSignal.timeout(2000)),/ไม่เก็บข้อความ/);
 assert.equal(observed.elements.find(e=>e.type==='password').value,undefined);
 console.log('PASS: actual DOM field readback, wrong-value detection, readonly keypad fallback, rejected edits, and password-value redaction');
 await assert.rejects(browser.navigate(`http://127.0.0.1:${server.address().port}/redirect`,AbortSignal.timeout(5000)));
 await browser.close();
 registerAgentWindowIpc(ipcMain);
 let stopped=0;
 task=createAgentWindow({BrowserWindow,show:true,goal:'<img src=x onerror=alert(1)>',stop:()=>stopped++});
 await new Promise(resolve=>task.window.webContents.once('did-finish-load',resolve));
 const state=await task.window.webContents.executeJavaScript('window.agentTask.state()');
 assert.equal(state.goal,'<img src=x onerror=alert(1)>');
 const text=await task.window.webContents.executeJavaScript('document.getElementById("goal").textContent');assert.equal(text,state.goal);
 assert.equal(await task.window.webContents.executeJavaScript('document.querySelector("#goal img")'),null);
 await task.window.webContents.executeJavaScript('document.getElementById("stop").click()');
 await new Promise(resolve=>setTimeout(resolve,50));assert.equal(stopped,1);
 task.finish({state:'done',summary:'fixture finished',checks:result.checks});
 await task.window.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
 assert.equal(await task.window.webContents.executeJavaScript('document.getElementById("summary").textContent'),'fixture finished');
 const desktop=require('../src/main/agent-desktop').createDesktop({screen,desktopCapturer});
 const screenImage=await desktop.capture(undefined,AbortSignal.timeout(5000));assert.match(screenImage.image,/^data:image\/png;base64,/);
 await fs.writeFile(path.join(root,'task.png'),(await task.window.webContents.capturePage()).toPNG());
 if(process.env.CAPRII_SMOKE_ARTIFACTS){await fs.mkdir(process.env.CAPRII_SMOKE_ARTIFACTS,{recursive:true});await fs.copyFile(path.join(root,'task.png'),path.join(process.env.CAPRII_SMOKE_ARTIFACTS,'agent-task.png'));}
 console.log('PASS: real Electron browser navigate/type/click/DOM verification; screenshot; blocked cross-origin redirect; isolated page state; task UI, completion state, Stop IPC, and actual virtual screen capture');
}).then(async()=>{clearTimeout(timeout);task?.window.destroy();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await fs.rm(root,{recursive:true,force:true});app.quit();}).catch(async err=>{console.error(err);clearTimeout(timeout);await browser?.close().catch(()=>{});server?.close();app.exit(1);});
