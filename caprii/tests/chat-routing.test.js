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
