'use strict';
// Opt-in real-model regression using only Test Lab's fictional data.
const {app,BrowserWindow,session}=require('electron'),assert=require('node:assert/strict'),os=require('node:os'),fs=require('node:fs');
const {createBrowser}=require('../src/main/agent-browser'),{createAgentTools}=require('../src/main/agent-tools'),{runProjectAgent}=require('../src/main/project-agent'),{taskResultText}=require('../src/main/task-result'),llm=require('../src/main/llm');
app.commandLine.appendSwitch('use-angle','swiftshader');app.commandLine.appendSwitch('enable-unsafe-swiftshader');app.on('window-all-closed',()=>{});
let server,browser,win;const timeout=setTimeout(()=>{console.error('Live form regression timed out');app.exit(1);},150000);
app.whenReady().then(async()=>{
 if(!process.env.CAPRII_LIVE_FORM_TEST||!process.env.GEMINI_API_KEY)throw Error('Set CAPRII_LIVE_FORM_TEST=1 for the opt-in live fixture test');
 const {createLabServer}=await import('../test-lab/server.mjs');server=createLabServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=createBrowser({BrowserWindow:class extends BrowserWindow{constructor(options){super({...options,show:false});win=this;}},session});const signal=AbortSignal.timeout(120000);await browser.navigate('http://127.0.0.1:'+server.address().port,signal);
 await win.webContents.executeJavaScript('document.documentElement.style.width="1440px";document.querySelector("[data-case=form]").click()');
 const source=fs.readFileSync(require.resolve('../src/renderer/js/browser-task-intent.js'),'utf8'),{browserTaskIntent}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const models=await llm.models('gemini',{}),model=models.find(m=>/3\.5-flash-lite/.test(m))||models.find(m=>/flash/.test(m)&&!/preview/.test(m));assert.ok(model);
 const goal=browserTaskIntent('ช่องชื่อนั่นใส่แมวบิน เมลเอา meow@example.test ประเทศเอาไทย ติ๊กยอมรับด้วย แล้วส่งให้ที ดูด้วยว่าส่งติดจริงปะ').goal;
 const result=await runProjectAgent({root:os.tmpdir(),goal,signal,allowProjectFiles:false,browserContext:{url:'http://127.0.0.1:'+server.address().port,title:'Test Lab'},tools:createAgentTools({browser}),approve:async()=>true,
  ask:async(messages,signal)=>{const styled=require('../src/main/response-style').responseMessages(require('../src/main/personality').personalityMessages(messages),'short',{question:goal});return require('../src/main/thai-language').thaiResponse({messages:styled,request:fixed=>llm.chat('gemini',{}, {model,messages:fixed},()=>{},signal)});},
  onProgress:e=>{if(e.status==='done'||e.status==='failed')console.log(JSON.stringify({tool:e.tool,status:e.status,error:e.error}));}
 });
 const actual=await win.webContents.executeJavaScript('({name:document.getElementById("person-name").value,email:document.getElementById("person-email").value,country:document.getElementById("person-country").value,consent:document.getElementById("person-consent").checked,status:document.getElementById("case-status").textContent})');
 assert.deepEqual(actual,{name:'แมวบิน',email:'meow@example.test',country:'th',consent:true,status:'ผ่านแล้ว'});assert.equal(result.verified,true);console.log(JSON.stringify({liveForm:'passed',model,actual,summary:taskResultText(result)}));
 await browser.close();await new Promise(r=>server.close(r));clearTimeout(timeout);app.exit(0);
}).catch(e=>{console.error(JSON.stringify({liveForm:'not passed',name:e.name,code:e.code||null,message:e.name==='AssertionError'?e.message:'Live form validation failed; inspect tool outcomes'}));clearTimeout(timeout);app.exit(1);});
