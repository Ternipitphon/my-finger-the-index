'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
function moduleUrl(file){const source=fs.readFileSync(file,'utf8').replace(/from '(\.\/[^']+)'/g,(_,relative)=>`from '${moduleUrl(path.resolve(path.dirname(file),relative))}'`);return 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');}
test('the exact reported Thai screen command invokes agent IPC rather than text-only chat',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let called;
 const panel={setChatBusy(){},setActions(){},chatTurn(){},stream(){}};
 const chat=new Chat({capri:{pulse(){}},panel,voice:{},brain:{},host:{onChatDelta(){},agentRun:async request=>{called=request;return{ok:true,text:'started'};},chatSend:()=>{throw Error('must not send text-only chat');}}});
 chat.open=true;await chat.send('ดูจอแล้วพิมพ์คำตอบไป');assert.equal(called.goal,'ดูจอแล้วพิมพ์คำตอบไป');assert.equal(chat.turn,0);
});
test('Thai look-only command selects screenshot flow',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 const chat=new Chat({capri:{},panel:{},voice:{},brain:{},host:{onChatDelta(){}}});chat.look={};
 assert.deepEqual(chat.asked('ดูจอให้หน่อย'),{kind:'look'});
});
test('open YouTube in Thai invokes browser IPC without asking the LLM',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let url;
 const chat=new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){}},voice:{},brain:{},host:{onChatDelta(){},openSite:async value=>{url=value;return true;},chatSend(){throw Error('Must not use text-only chat');}}});
 chat.open=true;await chat.send('เปิดyoutube');assert.equal(url,'https://www.youtube.com/');assert.equal(chat.turn,0);
});
test('plain Thai mouse instruction starts the agent without slash prefix',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let called=false;
 const chat=new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){}},voice:{},brain:{},host:{onChatDelta(){},agentRun:async()=>{called=true;return{ok:true,text:'started'};}}});
 chat.open=true;await chat.send('คลิกปุ่มส่งบนหน้าจอ');assert.equal(called,true);
});

test('math request from the screenshot and informal spelling start the actual agent IPC',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 for(const text of ['ทำโจทที่อยู่บนหน้าให้หน่อย','ทำโจทย์ที่อยู่บนหน้าให้หน่อย','ช่วยทำโจทยที่อยู่บนหน้าเว็บให้ที','ช่วยทำข้อที่อยู่บนหน้านี้ให้หน่อย']){
  let goal;
  const chat=new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){}},voice:{},brain:{},host:{onChatDelta(){},agentRun:async r=>{goal=r.goal;return{ok:true,text:'started'};},chatSend(){throw Error('Screen request must not become text-only chat');}}});
  chat.open=true;await chat.send(text);assert.equal(goal,text);
 }
});
test('a short followup starts a new observation task; an ambiguous one asks locally',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let goal='',reply='';
 const chat=new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream:s=>{reply=s;}},voice:{},brain:{},host:{onChatDelta(){},agentRun:async r=>{goal=r.goal;return{ok:true,text:'เริ่มแล้ว'};},chatSend(){throw Error('must not guess through text-only chat');}}});
 chat.open=true;await chat.send('ทำต่อ');assert.match(reply,/ต้องการให้ทำอะไร/);assert.equal(goal,'');chat.history=[{role:'user',content:'กรอกคำตอบบนหน้าเว็บแต่ไม่ต้องกดส่ง'}];await chat.send('ส่งเลย');assert.match(goal,/ตรวจหน้าจอหรือแท็บปัจจุบันใหม่/);assert.match(goal,/คำสั่งตอนนี้: ตรวจคำตอบปัจจุบันแล้วกดส่ง/);
});
test('the reported look-and-find-answer command invokes calculator-capable agent, never vision-only narration',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let goal;
 const chat=new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){}},voice:{},brain:{},host:{onChatDelta(){},agentRun:async r=>{goal=r.goal;return{ok:true,text:'เริ่มตรวจ'};},lookSnap(){throw Error('must not use image-only chat');},chatSend(){throw Error('must use tools');}}});chat.open=true;await chat.send('ดูจอแล้วหาคำตอบ');assert.equal(goal,'ดูจอแล้วหาคำตอบ');
});
