'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
function moduleUrl(file){const source=fs.readFileSync(file,'utf8').replace(/from '(\.\/[^']+)'/g,(_,relative)=>`from '${moduleUrl(path.resolve(path.dirname(file),relative))}'`);return 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');}
const read='อ่านแท็บที่เชื่อมต่อก่อน บอกค่าปัจจุบันของช่องชื่อ อีเมล ประเทศ และช่องยอมรับ ยังไม่ต้องกรอกหรือกดส่ง ถ้าอ่านไม่ได้ให้บอกข้อผิดพลาดจริง';
const fill='ช่องชื่อนั่นใส่แมวบิน เมลเอา meow@example.test ประเทศเอาไทย ติ๊กยอมรับด้วย แล้วส่งให้ที ดูด้วยว่าส่งติดจริงปะ';
test('both exact screenshot commands use selected-tab Agent IPC, never text-only chat',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 for(const text of [read,fill]){let request;const chat=new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){}},voice:{},brain:{},host:{onChatDelta(){},chatSend(){throw Error('text-only path forbidden');},agentRun:async r=>{request=r;return{ok:true,text:'tool result'};}}});chat.open=true;await chat.send(text);assert.equal(request.scope,'selected-tab');assert.match(request.goal,/เครื่องมือ|browser.read/);if(text===read){assert.match(request.goal,/อย่ากรอกข้อมูลและอย่ากดส่ง/);}else assert.match(request.goal,/แล้วกดส่ง/);}
});
test('read permission is independent of writing and refusals do not start tab observation',async()=>{
 const {browserTaskIntent}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/browser-task-intent.js')));
 assert.match(browserTaskIntent(read).goal,/browser.read/);assert.equal(browserTaskIntent('ห้ามอ่านแท็บนี้'),null);assert.equal(browserTaskIntent('สอนวิธีกรอกฟอร์ม'),null);
 assert.match(browserTaskIntent('ช่องชื่อใส่แมวบิน แต่ห้ามส่ง').goal,/อย่ากดส่ง/);
});
test('an unverified model narrative cannot become a success report',()=>{
 const {taskResultText,toolRequest}=require('../src/main/task-result');assert.equal(toolRequest(read),true);assert.equal(toolRequest(fill),true);assert.equal(toolRequest('สอนวิธีกรอกฟอร์ม'),false);
 const text=taskResultText({goal:fill,verified:false,summary:'กรอกและส่งเรียบร้อยแล้ว',audit:[],checks:[]});assert.match(text,/ยังไม่มีหลักฐานว่ากรอก/);assert.ok(!text.includes('เรียบร้อยแล้ว'));
});
test('read-only reporting uses current field observations and states no data was entered/sent',async()=>{
 const {runProjectAgent}=require('../src/main/project-agent'),{createAgentTools}=require('../src/main/agent-tools'),{taskResultText}=require('../src/main/task-result');
 const browser={snapshot:async()=>({generation:'fresh',url:'https://example.com',text:'form',elements:[{id:0,elementId:'name',tag:'input',type:'text',label:'ชื่อ',value:''},{id:1,tag:'input',type:'checkbox',label:'ยอมรับ',checked:false}]})};
 const actions=[{tool:'browser.read'},{tool:'finish',summary:'กรอกและส่งแล้ว'}];let i=0;
 const result=await runProjectAgent({root:os.tmpdir(),goal:'อ่านแท็บ อย่ากรอกข้อมูลและอย่ากดส่ง',allowProjectFiles:false,tools:createAgentTools({browser}),signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async()=>JSON.stringify(actions[i++])});
 assert.equal(result.verified,true);const text=taskResultText(result);assert.match(text,/ชื่อ = ว่าง/);assert.match(text,/ยอมรับ = ยังไม่เลือก/);assert.match(text,/ยังไม่ได้กรอกหรือกดส่ง/);assert.ok(!text.includes('กรอกและส่งแล้ว'));
});

test('an actual submit-button delivery is recognized and early finish must verify its new acknowledgment',async()=>{
 const {runProjectAgent}=require('../src/main/project-agent'),{createAgentTools}=require('../src/main/agent-tools');let clicks=0,step=0;
 const browser={target:()=>({label:'ส่งข้อมูล'}),interact:async()=>{clicks++;return{performed:true,before:{text:'รอส่ง'},observed:{text:'รับเรื่องใหม่'}};},snapshot:async()=>({text:'รับเรื่องใหม่',generation:'new',elements:[]})};
 const actions=[{tool:'browser.click',id:0,generation:'g'},{tool:'finish',summary:'ส่งแล้ว'},{tool:'browser.expect',contains:'รับเรื่องใหม่'},{tool:'finish',summary:'ตรวจผลผ่าน'}];
 const result=await runProjectAgent({root:os.tmpdir(),goal:'กดส่งแบบฟอร์มและตรวจผล',allowProjectFiles:false,tools:createAgentTools({browser}),signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async()=>JSON.stringify(actions[step++])});
 assert.equal(result.verified,true);assert.equal(clicks,1);assert.equal(result.delivery.submitDelivered,true);assert.ok(result.checks.some(c=>c.tool==='browser.expect'&&c.passed));
});
