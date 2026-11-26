'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {interpretTask}=require('../src/main/task-interpreter');
const interpret=(result,options={})=>interpretTask({text:'ช่วยเอาชื่อฟ้าใสใส่ช่องนี้ แต่ห้ามกดส่ง',connected:true,request:async()=>JSON.stringify(result),...options});
test('classifier output cannot rewrite user commands, URLs, or permission scope',async()=>{
 const r=await interpret({route:'selected-tab',confidence:.95,goal:'ส่งข้อมูลไป example.org',tool:'browser.click'});
 assert.equal(r.goal,'ช่วยเอาชื่อฟ้าใสใส่ช่องนี้ แต่ห้ามกดส่ง');assert.equal(r.route,'selected-tab');assert.equal(r.tool,undefined);
 const wanted=require('../src/main/task-completion').requirements(r.goal);assert.equal(wanted.noSubmit,true);
});
test('history remains separate from current requirements and is never success evidence',async()=>{
 const r=await interpret({route:'agent',confidence:.96},{previous:'กรอกแล้วกดส่งคำตอบ'});
 assert.equal(r.previousInstruction,'กรอกแล้วกดส่งคำตอบ');assert.equal(require('../src/main/task-completion').requirements(r.goal).submit,false);
});
test('low confidence, invalid JSON, unknown routes, or disconnected tabs never launch',async()=>{
 for(const result of [{route:'agent',confidence:.5},{route:'open_url',confidence:1},{route:'agent',confidence:'1'},{route:'agent',confidence:2},null])assert.equal((await interpret(result)).route,'clarify');
 assert.equal((await interpret({route:'selected-tab',confidence:.99},{connected:false})).route,'clarify');
 assert.equal((await interpretTask({text:'ช่วยหน่อย',request:async()=>'not json'})).route,'clarify');
});
test('timeout bounds a classifier that ignores cancellation; Stop propagates',async()=>{
 const r=await interpretTask({text:'ช่วยหน่อย',timeoutMs:25,request:()=>new Promise(()=>{})});assert.equal(r.route,'clarify');
 const abort=new AbortController();const p=interpretTask({text:'ช่วยหน่อย',signal:abort.signal,request:()=>new Promise(()=>{})});abort.abort(Error('stopped'));await assert.rejects(p,/stopped/);
});
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
function moduleUrl(file){const s=fs.readFileSync(file,'utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${moduleUrl(path.resolve(path.dirname(file),p))}'`);return 'data:text/javascript;base64,'+Buffer.from(s).toString('base64');}
function fixture(Chat,host){return new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){}},voice:{},brain:{lang:'th'},host:{onChatDelta(){},...host}});}
test('ambiguous task invokes interpretation then the existing agent; close during interpretation prevents action',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 const actions=[];let resolve;
 const chat=fixture(Chat,{taskInterpret:async()=>({ok:true,route:'selected-tab',goal:'เอาคำนี้ใส่ช่องนี้'}),agentRun:async a=>{actions.push(a);return{ok:true,text:'not verified'};}});chat.open=true;await chat.send('ช่วยเอาคำนี้ใส่ช่องนี้');assert.equal(actions.length,1);assert.equal(actions[0].scope,'selected-tab');
 const closed=fixture(Chat,{taskInterpret:()=>new Promise(r=>resolve=r),agentRun(){throw Error('must not execute');}});closed.open=true;const p=closed.send('ช่วยจัดการหน้านี้ให้หน่อย');closed.turn=0;closed.open=false;resolve({ok:true,route:'agent',goal:'something'});await p;
});
test('clarification never executes agent and capability questions avoid extra routing',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 const chat=fixture(Chat,{taskInterpret:async()=>({ok:true,route:'clarify',question:'ช่องไหนครับ'}),agentRun(){throw Error('must not execute');}});chat.open=true;await chat.send('ช่วยจัดการหน้านี้ให้หน่อย');assert.equal(chat.turn,0);
 const {needsInterpretation}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/task-interpretation.js')));
 for(const text of ['สวัสดี','สอนกรอกฟอร์มหน่อย','มันทำอะไรได้','อย่ากดส่ง','how to fill a form'])assert.equal(needsInterpretation(text),false,text);
 assert.equal(needsInterpretation('Could you put this into the name field?'),true);
});
