'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createTaskPermissions,scopeFor}=require('../src/main/task-permissions');
const windowAction={tool:'desktop.input',kind:'type',displayId:'1',target:{handle:'8',processId:'42',processStart:'123',title:'Quiz'}};
test('task grant reuses same screen, not another screen',async()=>{let calls=0;const p=createTaskPermissions({signal:new AbortController().signal,prompt:async()=>{calls++;return'task';}});await p.approve({tool:'desktop.look',displayId:'1'});await p.approve({tool:'desktop.look',displayId:'1'});assert.equal(calls,1);await p.approve({tool:'desktop.look',displayId:'2'});assert.equal(calls,2);});
test('window grant covers routine input and screen, window identity changes reask',async()=>{let calls=0;const p=createTaskPermissions({signal:new AbortController().signal,prompt:async()=>{calls++;return'task';}});assert.equal(await p.approve(windowAction),true);await p.approve({...windowAction,kind:'click'});await p.approve({tool:'desktop.look',displayId:'1'});await p.approve({tool:'desktop.windows'});assert.equal(calls,1);for(const change of [{title:'New'},{processId:'77'},{processStart:'456'},{handle:'99'}])await p.approve({...windowAction,target:{...windowAction.target,...change}});assert.equal(calls,5);});
test('once and deny never cache and completion revokes',async()=>{let calls=0;const p=createTaskPermissions({signal:new AbortController().signal,prompt:async()=>{calls++;return calls===1?'deny':'once';}});assert.equal(await p.approve(windowAction),false);assert.equal(await p.approve(windowAction),true);await p.approve(windowAction);assert.equal(calls,3);p.clear();assert.equal(await p.approve(windowAction),false);});
test('abort while dialog pending cannot grant and new task asks again',async()=>{const a=new AbortController();const p=createTaskPermissions({signal:a.signal,prompt:async()=>{a.abort();return'task';}});assert.equal(await p.approve(windowAction),false);});
test('expiry revokes cached scope',async()=>{let time=0;const p=createTaskPermissions({signal:new AbortController().signal,now:()=>time,expiresAt:10,prompt:async()=> 'task'});assert.equal(await p.approve(windowAction),true);time=11;assert.equal(await p.approve(windowAction),false);});
test('files, shell, sensitive keys and outside-window actions remain single-use',()=>{for(const a of [{tool:'write'}, {...windowAction,kind:'key',key:'alt+f4'},{...windowAction,risk:'sensitive'},{...windowAction,allowOutsideWindow:true},{...windowAction,target:{handle:'8',title:'Quiz'}}])assert.equal(scopeFor(a),null);});
test('explicit session mode skips screen/web prompts but abort still revokes',async()=>{
 const a=new AbortController();let calls=0;const p=createTaskPermissions({signal:a.signal,automatic:()=>true,prompt:async()=>{calls++;return'deny';}});
 for(const action of [{tool:'desktop.look',displayId:'1'},windowAction,{tool:'desktop.open_url'},{tool:'browser.click'},{tool:'uia.read'},{tool:'uia.type'},{tool:'launcher.search'},{tool:'launcher.open'}])assert.equal(await p.approve(action),true);
 assert.equal(calls,0);a.abort();assert.equal(await p.approve(windowAction),false);
});
test('session screen mode does not approve project scripts or changed puzzle rules',async()=>{
 let calls=0;const p=createTaskPermissions({signal:new AbortController().signal,automatic:()=>true,prompt:async()=>{calls++;return'deny';}});
 for(const action of [{tool:'check'},{tool:'write'},{tool:'math.solve',proposed:{}}])assert.equal(await p.approve(action),false);
 assert.equal(calls,3);
});
test('turning session mode off restores confirmation',async()=>{
 let automatic=true,calls=0;const p=createTaskPermissions({signal:new AbortController().signal,automatic:()=>automatic,prompt:async()=>{calls++;return'deny';}});
 assert.equal(await p.approve(windowAction),true);automatic=false;assert.equal(await p.approve(windowAction),false);assert.equal(calls,1);
});
