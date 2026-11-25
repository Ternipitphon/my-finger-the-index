'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ToolRegistry } = require('../src/main/agent-registry');
const { createAgentTools } = require('../src/main/agent-tools');
const { browserUrl } = require('../src/main/agent-browser');
const { validateDesktop } = require('../src/main/agent-desktop');
const screen = { getAllDisplays: () => [{ bounds: { x: -100, y: 0, width: 200, height: 100 } }] };
test('browser URL policy rejects executable, credentialed, and private-network destinations', () => {
  for (const u of ['file:///etc/passwd','javascript:alert(1)','https://user:pass@example.com','http://example.com','https://10.1.2.3','https://169.254.169.254','https://[::ffff:127.0.0.1]']) assert.throws(() => browserUrl(u));
  assert.equal(browserUrl('http://127.0.0.1:3000/'),'http://127.0.0.1:3000/');
  assert.equal(browserUrl('https://example.com'),'https://example.com/');
});
test('desktop validates multi-monitor coordinates, target handles and supported keys', () => {
  validateDesktop({kind:'click',targetHandle:'100',x:-50,y:10},screen.getAllDisplays());
  for (const a of [{kind:'click',x:0,y:0},{kind:'click',targetHandle:'100',x:101,y:0},{kind:'key',targetHandle:'100',key:'powershell'},{kind:'focus',handle:'1;whoami'},{kind:'scroll',targetHandle:'100',amount:11}]) assert.throws(()=>validateDesktop(a,screen.getAllDisplays()));
});
test('registry rejects unknown tool calls and invalid actions before any side effect', async () => {
  let calls=0;
  const tools=new ToolRegistry().add('sample',{description:{purpose:'test'},validate:a=>{if(a.value!==1)throw Error('bad');},run:async()=>++calls});
  const context={signal:AbortSignal.timeout(1000)};
  await assert.rejects(tools.execute({tool:'sample',value:2},context));
  await assert.rejects(tools.execute({tool:'shell'},context));
  assert.equal(calls,0);
});
test('browser click shows target before approval and never executes a denied action', async () => {
  let calls=0, approved;
  const browser={target:()=>({label:'Delete account'}),interact:async()=>++calls};
  const tools=createAgentTools({browser});
  await assert.rejects(tools.execute({tool:'browser.click',id:0,generation:'1'}, {signal:AbortSignal.timeout(1000),permission:async a=>{approved=a;throw Error('denied');}}));
  assert.equal(approved.target.label,'Delete account');assert.equal(calls,0);
});
test('desktop helper converts DPI coordinates and receives input only as JSON stdin',async()=>{
 const {createDesktop}=require('../src/main/agent-desktop');let last;
 const desktop=createDesktop({platform:'win32',screen:{...screen,dipToScreenPoint:p=>({x:p.x*2,y:p.y*2}),screenToDipRect:(_,r)=>({x:r.x/2,y:r.y/2,width:r.width/2,height:r.height/2}),screenToDipPoint:p=>({x:p.x/2,y:p.y/2})},desktopCapturer:{},run:async(file,args,options)=>{last={file,args,options};return{passed:true,stdout:JSON.stringify({foreground:'10',cursor:{x:20,y:20},windows:[{handle:'10',title:'fixture',x:-200,y:0,width:400,height:200}]})};}});
 const result=await desktop.state({kind:'click',targetHandle:'10',x:20,y:10},AbortSignal.timeout(1000));
 assert.deepEqual(JSON.parse(last.options.input),{kind:'click',targetHandle:'10',x:40,y:20});
 assert.equal(last.args.includes('-Command'),true);assert.ok(!last.args.includes('10'));
 assert.equal(result.windows[0].width,200);assert.equal(result.cursor.x,10);
});
test('mouse drag and context-click validate destinations and explicit outside-window flag',()=>{
 const displays=screen.getAllDisplays();
 for(const kind of ['move','doubleclick','rightclick','drag'])validateDesktop({kind,targetHandle:'10',x:0,y:10,toX:10,toY:20},displays);
 assert.throws(()=>validateDesktop({kind:'drag',targetHandle:'10',x:0,y:10,toX:1000,toY:20},displays));
 assert.throws(()=>validateDesktop({kind:'click',targetHandle:'10',x:0,y:10,allowOutsideWindow:'true'},displays));
});
test('opening a desktop URL requests consent before the OS browser launch',async()=>{
 let launched=false;const tools=createAgentTools({openExternal:async()=>{launched=true;return true;}});
 await assert.rejects(tools.execute({tool:'desktop.open_url',url:'https://www.youtube.com/'},{signal:AbortSignal.timeout(1000),permission:async()=>{throw Error('denied');}}));assert.equal(launched,false);
 const r=await tools.execute({tool:'desktop.open_url',url:'https://www.youtube.com/'},{signal:AbortSignal.timeout(1000),permission:async()=>true});assert.equal(launched,true);assert.equal(r.result.verified,false);
});
test('math answer fields reject guessed text until a calculator tool verifies it',async()=>{
 let typed=0;
 const browser={target:()=>({label:'คำตอบ'}),interact:async()=>{typed++;return{performed:true};}};
 const tools=createAgentTools({browser});const c={mathTask:true,signal:AbortSignal.timeout(1000),permission:async()=>true};
 await assert.rejects(tools.execute({tool:'browser.type',id:0,generation:'1',value:'แปดสิบสอง'},c));assert.equal(typed,0);
 await tools.execute({tool:'math.evaluate',expression:'14+27'},c);
 await tools.execute({tool:'browser.type',id:0,generation:'1',value:'41'},c);assert.equal(typed,1);
});
test('atomic typing validates both field coordinates and keeps typing inside the selected window',()=>{
 const displays=screen.getAllDisplays();
 validateDesktop({kind:'type',targetHandle:'10',x:0,y:10,replace:true,text:'2*7+9/9'},displays);
 for(const a of [{x:0},{y:10},{x:1000,y:10},{x:0,y:10,allowOutsideWindow:true},{replace:'yes'}])assert.throws(()=>validateDesktop({kind:'type',targetHandle:'10',text:'15',...a},displays));
});
test('atomic typing passes DPI-adjusted field coordinates and literal math text as JSON',async()=>{
 const {createDesktop}=require('../src/main/agent-desktop');let input;
 const desktop=createDesktop({platform:'win32',screen:{...screen,dipToScreenPoint:p=>({x:p.x*2,y:p.y*2})},desktopCapturer:{},run:async(file,args,options)=>{input=JSON.parse(options.input);return{passed:true,stdout:JSON.stringify({foreground:'10',cursor:{x:0,y:0},windows:[]})};}});
 await desktop.state({kind:'type',targetHandle:'10',x:0,y:10,replace:true,text:'2*7+9/9'},AbortSignal.timeout(1000));
 assert.deepEqual(input,{kind:'type',targetHandle:'10',x:0,y:20,replace:true,text:'2*7+9/9'});
});
test('math keypad clicks cannot bypass exact answer verification',async()=>{
 let clicks=0;const browser={target:()=>({label:'2'}),interact:async()=>{clicks++;return{performed:true};}};const tools=createAgentTools({browser});const c={mathTask:true,signal:AbortSignal.timeout(1000),permission:async()=>true};
 await assert.rejects(tools.execute({tool:'browser.click',id:0,generation:'1',intent:'answer_key'},c),/ตรวจคำตอบ/);assert.equal(clicks,0);
 await tools.execute({tool:'math.evaluate',expression:'2*7+9/9'},c);await tools.execute({tool:'browser.click',id:0,generation:'1',intent:'answer_key'},c);assert.equal(clicks,1);
});
test('an acknowledgment already present before submit cannot verify a new submission',async()=>{
 const browser={snapshot:async()=>({text:'คำตอบถูกต้อง',elements:[],generation:'2'})};const tools=createAgentTools({browser});const c={signal:AbortSignal.timeout(1000),permission:async()=>true,submitBaseline:{text:'คำตอบถูกต้อง'}};
 const r=await tools.execute({tool:'browser.expect',contains:'คำตอบถูกต้อง'},c);assert.equal(r.result.passed,false);assert.equal(r.result.alreadyPresentBeforeSubmit,true);
});
test('explicit do-not-fill and do-not-submit instructions block tools before permission or input',async()=>{
 let performed=0,asked=0;const browser={target:()=>({label:'ส่งคำตอบ'}),interact:async()=>{performed++;return{};}};const tools=createAgentTools({browser});const c={signal:AbortSignal.timeout(1000),intentRequirements:{noInput:true,noSubmit:true},permission:async()=>{asked++;}};
 await assert.rejects(tools.execute({tool:'browser.type',id:0,generation:'1',value:'15'},c),/ไม่ให้กรอก/);await assert.rejects(tools.execute({tool:'browser.click',id:0,generation:'1',intent:'submit'},c),/ไม่ให้กดส่ง/);assert.equal(performed,0);assert.equal(asked,0);
});
