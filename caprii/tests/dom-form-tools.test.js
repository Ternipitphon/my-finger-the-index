'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createAgentTools}=require('../src/main/agent-tools');
const {createCompletion}=require('../src/main/task-completion');
const {createRecoveryBudget}=require('../src/main/task-recovery');
const {runProjectAgent}=require('../src/main/project-agent');
const os=require('node:os');
test('form controls require consent, validate desired state, and respect no-input before mutations',async()=>{
 let calls=0;const browser={target:()=>({label:'Consent'}),interact:async()=>{calls++;return{performed:true,inputConfirmed:true};}};
 const tools=createAgentTools({browser}),base={signal:AbortSignal.timeout(1000),permission:async()=>{throw Error('denied');}};
 for(const action of [{tool:'browser.select',value:'th'},{tool:'browser.check',checked:false}]){
  await assert.rejects(tools.execute({...action,id:0,generation:'1'},base),/denied/);
  await assert.rejects(tools.execute({...action,id:0,generation:'1'},{...base,intentRequirements:{noInput:true}}),/ไม่ให้กรอก/);
 }
 await assert.rejects(tools.execute({tool:'browser.check',id:0,generation:'1',checked:'false'},base),/boolean/);
 assert.equal(calls,0);
});
test('scoped DOM assertions cannot pass from unrelated page text or old submit text',async()=>{
 let args;const browser={expectText:async a=>{args=a;return{passed:false,observed:{text:'Success elsewhere'}};}};
 const tools=createAgentTools({browser}),context={signal:AbortSignal.timeout(1000),permission:async()=>true};
 assert.equal((await tools.execute({tool:'browser.expect',contains:'Success',selector:'#result',timeoutMs:0},context)).result.passed,false);
 assert.equal(args.selector,'#result');assert.equal(args.timeoutMs,0);
 browser.expectText=async()=>({passed:true,observed:{text:'Success'}});context.submitBaseline={text:'Success'};
 assert.equal((await tools.execute({tool:'browser.expect',contains:'Success',selector:'#result'},context)).result.passed,false);
 context.submitBaseline={text:'partial',textTruncated:true};
 const incomplete=await tools.execute({tool:'browser.expect',contains:'Success',selector:'#result'},context);assert.equal(incomplete.result.passed,false);assert.equal(incomplete.result.baselineIncomplete,true);
 await assert.rejects(tools.execute({tool:'browser.expect',contains:'ok',timeoutMs:5001},context));
});
test('checkbox readback uses a boolean and does not prove submission',async()=>{
 const browser={target:()=>({label:'Consent'}),verifyField:async a=>({passed:a.checked===false,observed:{text:''}})};
 const tools=createAgentTools({browser}),c={signal:AbortSignal.timeout(1000),permission:async()=>true};
 assert.equal((await tools.execute({tool:'browser.expect_value',id:0,generation:'1',checked:false},c)).result.passed,true);
 await assert.rejects(tools.execute({tool:'browser.expect_value',id:0,generation:'1',checked:true,value:'true'},c));
 const completion=createCompletion('fill and submit');completion.record({tool:'browser.select'},{performed:true});
 assert.equal(completion.facts().inputDelivered,true);assert.equal(completion.facts().submitDelivered,false);
 completion.record({tool:'browser.click',intent:'submit'},{});completion.record({tool:'browser.check'},{performed:true});
 assert.equal(completion.facts().submitDelivered,false);
});
test('uncertain form actions block all further input including new form tools',()=>{
 for(const tool of ['browser.select','browser.check']){
  const budget=createRecoveryBudget();budget.failed({tool,id:0},'timeout');
  for(const next of ['browser.select','browser.check','browser.click','browser.type'])assert.throws(()=>budget.before({tool:next,id:1}),/ห้ามส่งซ้ำ/);
  budget.before({tool:'browser.read'});
 }
});
test('agent keeps a changed dropdown pending until actual DOM field verification',async()=>{
 for(const verify of [false,true]){
  const browser={target:()=>({label:'Country'}),interact:async()=>({performed:true,inputConfirmed:true}),verifyField:async()=>({passed:true,observed:{text:'Thailand'}})};
  const actions=[{tool:'browser.select',id:0,generation:'1',value:'th'},...(verify?[{tool:'browser.expect_value',id:0,generation:'2',value:'th'}]:[]),{tool:'finish',summary:'กรอกแล้ว'}];let i=0;
  const result=await runProjectAgent({root:os.tmpdir(),goal:'fill the country',allowProjectFiles:false,tools:createAgentTools({browser}),signal:AbortSignal.timeout(1000),approve:async()=>true,ask:async()=>JSON.stringify(actions[i++])});
  assert.equal(result.verified,verify);assert.equal(result.audit[0].tool,'browser.select');
 }
});
