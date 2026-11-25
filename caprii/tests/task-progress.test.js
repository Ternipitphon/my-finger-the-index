'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createProgressGuard, pendingSubmission } = require('../src/main/task-progress');
test('unchanged observations do not become progress merely because a snapshot ID changes', () => {
  const guard = createProgressGuard();
  for (let i=0;i<5;i++) assert.equal(guard.observe({tool:'browser.read'},{generation:String(i),text:'waiting',elements:[]}),null);
  assert.equal(guard.observe({tool:'browser.read'},{generation:'new',text:'waiting',elements:[]}).reason,'no-progress');
});
test('a read/write cycle without observable changes stops, while real field changes remain usable', () => {
  const guard = createProgressGuard();
  let blocked;
  for(let i=0;i<6;i++) blocked=guard.observe({tool:i%2?'browser.type':'browser.read',value:'same'},{observed:{generation:String(i),text:'same'}});
  assert.equal(blocked.cycleLength,2);
  const changing = createProgressGuard();
  for(let i=0;i<30;i++) assert.equal(changing.observe({tool:'browser.read'},{generation:String(i),value:String(i)}),null);
});
test('pending acknowledgment blocks only submission, not reading or filling another field', () => {
  const observation={elements:[{id:1,label:' ส่งแบบฟอร์ม →'},{id:2,label:'ยกเลิก'},{id:3,label:'Submit'}]};
  assert.equal(pendingSubmission({tool:'browser.click',id:1},observation,true),true);
  assert.equal(pendingSubmission({tool:'browser.click',id:3},observation,true),true);
  assert.equal(pendingSubmission({tool:'browser.click',id:2},observation,true),false);
  assert.equal(pendingSubmission({tool:'browser.read'},observation,true),false);
  assert.equal(pendingSubmission({tool:'browser.type',id:1},observation,true),false);
  assert.equal(pendingSubmission({tool:'browser.click',intent:'submit'},null,false),false);
});

test('a bounded wait is cancellable, does not verify success and allows deliberate polling', async () => {
 const { ToolRegistry }=require('../src/main/agent-registry');
 const { registerTaskWait }=require('../src/main/task-progress');
 const registry=registerTaskWait(new ToolRegistry());
 const signal=new AbortController().signal;
 await assert.rejects(registry.execute({tool:'task.wait',milliseconds:5001},{signal}),/1\.\.5000/);
 const controller=new AbortController();const waiting=registry.execute({tool:'task.wait',milliseconds:5000},{signal:controller.signal});controller.abort();await assert.rejects(waiting);
 const {result}=await registry.execute({tool:'task.wait',milliseconds:1},{signal});assert.equal(result.verified,false);
 const guard=createProgressGuard();
 for(let i=0;i<20;i++){assert.equal(guard.observe({tool:'browser.read'},{text:'loading'}),null);assert.equal(guard.observe({tool:'task.wait'},{waitedMs:1}),null);}
});

test('a no-progress stop is visible to the user instead of a model-authored success claim',()=>{
 const {taskResultText}=require('../src/main/task-result');
 const result={reason:'no-progress',verified:false,summary:'สำเร็จแล้ว',delivery:{submitDelivered:true}};
 assert.match(taskResultText(result),/หยุด.*ต้องตรวจ/);assert.doesNotMatch(taskResultText(result),/สำเร็จแล้ว/);
 assert.match(taskResultText(result,'en'),/Completion is not verified/);
});
