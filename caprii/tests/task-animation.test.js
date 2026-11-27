'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const moduleUrl=file=>'data:text/javascript;base64,'+Buffer.from(fs.readFileSync(file,'utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${moduleUrl(path.resolve(path.dirname(file),p))}'`)).toString('base64');
const ready=import(moduleUrl(path.join(__dirname,'../src/renderer/js/task-animation.js')));
async function fixture(){const {TaskAnimation}=await ready;let time=0;const poses=[],states=[],timers=new Map();let next=0;const capri={perform:p=>{poses.push(p);},stance:'stand'};const a=new TaskAnimation({capri,now:()=>time,onState:s=>states.push(s),schedule:fn=>{timers.set(++next,fn);return next;},unschedule:id=>timers.delete(id)});return{a,capri,poses,states,timers,advance:ms=>{time+=ms;}};}
test('frozen preload API is preserved; tools run once with unchanged arguments/results and celebrate only verified completion',async()=>{
 for(const verified of [true,false]){const f=await fixture(),input={id:1,media:{query:'weathergirl'}},result={ok:true,verified};let calls=0;const raw=Object.freeze({mediaRun:async req=>{assert.equal(req,input);calls++;f.advance(3000);return result;},lookSnap:()=>{throw Error('no implicit capture');}}),host=f.a.wrapHost(raw);
 assert.equal(await host.mediaRun(input),result);assert.equal(calls,1);assert.equal(f.poses.includes('hop'),verified);assert.equal(f.timers.size,0);assert.notEqual(host,raw);}
});
test('AI interpretation never celebrates an action plan; clarification waits and incomplete tasks remain neutral',async()=>{
 const f=await fixture(),host=f.a.wrapHost({commandInterpret:async()=>({ok:true,route:'media'}),agentRun:async()=>({ok:true,verified:false})});await host.commandInterpret({id:1});assert.equal(f.a.active.kind,'decision');assert.equal(f.poses.includes('hop'),false);f.advance(3000);await host.agentRun({id:1});assert.equal(f.poses.includes('hop'),false);
 const waiting=f.a.wrapHost({commandInterpret:async()=>({ok:true,route:'clarify'})});await waiting.commandInterpret({id:2});assert.equal(f.states.at(-1),'waiting');assert.equal(f.timers.size,0);
});
test('stopping or replacing an operation suppresses late success and cleans periodic reactions',async()=>{
 const f=await fixture();let resolve;const host=f.a.wrapHost({mediaRun:()=>new Promise(r=>resolve=r),chatStop:()=>{}});const p=host.mediaRun({id:1});host.chatStop(1);f.advance(5000);resolve({ok:true,verified:true});await p;assert.equal(f.poses.includes('hop'),false);assert.equal(f.timers.size,0);
 let late;const other=f.a.wrapHost({agentRun:()=>new Promise(r=>late=r),commandInterpret:async()=>({ok:true,route:'chat',reply:'Hello'})});const q=other.agentRun({id:2});await other.commandInterpret({id:3});late({ok:true,verified:true});await q;assert.equal(f.poses.includes('hop'),false);assert.equal(f.a.active,null);
});
test('screen capture and permission calls remain explicit; capture alone never means completed screen analysis',async()=>{
 const f=await fixture(),calls=[],snap={ok:true,id:'capture-1'},reply={ok:true,text:'Visible title'};const host=f.a.wrapHost({lookWhere:async()=>{calls.push('where');return{local:true};},lookSnap:async req=>{calls.push(['capture',req]);return snap;},lookSay:async req=>{calls.push(['analyse',req]);f.advance(3000);return reply;}});
 assert.deepEqual(calls,[]);await host.lookWhere();assert.deepEqual(calls,['where']);assert.equal(await host.lookSnap({automatic:false}),snap);assert.equal(f.a.active.kind,'look');assert.equal(f.poses.includes('hop'),false);assert.equal(await host.lookSay({id:snap.id,automatic:false}),reply);assert.equal(f.states.at(-1),'reply');assert.equal(f.poses.includes('hop'),false);
});
test('disabling screen auto mode suppresses late automatic-look reactions without changing or retrying its request',async()=>{
 const f=await fixture();let resolve,calls=0;const host=f.a.wrapHost({lookSay:()=>{calls++;return new Promise(r=>resolve=r);}});const p=host.lookSay({id:1,automatic:true});const before=f.poses.length;f.a.configure({watchScreen:false});f.advance(5000);resolve({ok:true,text:'Title'});await p;assert.equal(calls,1);assert.equal(f.poses.length,before);assert.equal(f.timers.size,0);
});
test('reaction setting, reduced motion, hidden/held character and cancellation prevent unwanted effects',async()=>{
 const f=await fixture();f.a.configure({taskAnimations:false});let calls=0;const host=f.a.wrapHost({agentRun:async()=>{calls++;return{ok:true,verified:true};}});await host.agentRun({id:1});assert.equal(calls,1);assert.deepEqual(f.poses,[]);assert.equal(f.timers.size,0);
 f.a.configure({taskAnimations:true});f.a.reduced=()=>true;await host.agentRun({id:2});assert.deepEqual(f.poses,[]);f.a.reduced=()=>false;f.capri.hidden=true;await host.agentRun({id:3});assert.deepEqual(f.poses,[]);
 f.capri.hidden=false;const t=f.a.begin('agent',{id:4});f.a.phase({id:999,phase:'waiting'});assert.equal(t.phase,'working');f.a.phase({id:4,phase:'waiting'});f.advance(15000);const before=f.poses.length;for(const tick of f.timers.values())tick();assert.equal(f.poses.length,before);f.a.phase({id:4,phase:'cancelled'});assert.equal(f.timers.size,0);
});
test('real Chat with wrapped host animates verified media only and closing prevents late completion',async()=>{
 globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 const f=await fixture();Object.assign(f.capri,{pulse(){}});let resolve;const host=f.a.wrapHost({onChatDelta(){},commandInterpret:async()=>({ok:true,route:'media',media:{service:'spotify',action:'play',collection:'current'}}),mediaRun:()=>new Promise(r=>resolve=r),chatStop(){},focusOverlay(){}});
 const c=new Chat({capri:f.capri,panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){},setFace(){}},voice:{},brain:{lang:'th'},host});c.open=true;c.taskAnimation=f.a;c.remember=()=>{};
 const p=c.send('เล่นเพลง');await new Promise(r=>setTimeout(r,0));assert.equal(f.poses.includes('hop'),false);f.advance(5000);resolve({ok:true,verified:true,backend:'windows-smtc',text:'Playing'});await p;assert.equal(f.poses.filter(p=>p==='hop').length,1);
 const q=c.send('เล่นเพลง');await new Promise(r=>setTimeout(r,0));c.close();f.advance(5000);resolve({ok:true,verified:true,text:'Late'});await q;assert.equal(f.poses.filter(p=>p==='hop').length,1);assert.equal(f.timers.size,0);
});
test('full victory is reserved for a long verified agent task; unverified work never wins',async()=>{
 for(const verified of [true,false]){const f=await fixture();const host=f.a.wrapHost({agentRun:async()=>{f.advance(125000);return{ok:true,verified};}});await host.agentRun({id:1});assert.equal(f.poses.includes('victory'),verified);assert.equal(f.timers.size,0);}
});
test('a broken visual scheduler cannot block, retry or alter a real tool or its cancellation',async()=>{
 const {TaskAnimation}=await ready;let calls=0,stops=0;const result={ok:true,verified:true};const a=new TaskAnimation({capri:{perform(){}},schedule:()=>{throw Error('visual timer failed');},unschedule:()=>{throw Error('cleanup failed');}});const h=a.wrapHost(Object.freeze({mediaRun:async()=>{calls++;return result;},chatStop:()=>{stops++;}}));assert.equal(await h.mediaRun({id:1}),result);assert.equal(calls,1);assert.equal(a.active,null);h.chatStop(1);assert.equal(stops,1);
});
test('ordinary talking can yield to a task reaction while an existing special act keeps priority',async()=>{
 const f=await fixture();f.capri.act={player:{name:'talk'}};f.a.pose('hop');assert.deepEqual(f.poses,['hop']);f.advance(3000);f.capri.act={player:{name:'uplink'}};f.a.pose('hop');assert.deepEqual(f.poses,['hop']);
});
