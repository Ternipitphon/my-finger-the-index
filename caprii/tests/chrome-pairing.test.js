'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {createPairingStore}=require('../src/main/chrome-pairing'),{createChromeBroker}=require('../src/main/chrome-broker');
function codec(){const key=crypto.randomBytes(32);return{seal:value=>{const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv),body=Buffer.concat([c.update(value,'utf8'),c.final()]);return'enc:'+Buffer.concat([iv,c.getAuthTag(),body]).toString('base64');},open:value=>{const b=Buffer.from(value.slice(4),'base64'),d=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString();}};}
function disk(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'caprii-pair-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=()=>path.join(dir,'pair.json'),encryption=codec();return{file,store:()=>createPairingStore({file,...encryption})};}
function worker(port,local={},session={}){
 let listener,offline=false,permission=true;const timers=[],posts=[],injections=[];
 const area=obj=>({get:async key=>({[key]:obj[key]}),set:async patch=>Object.assign(obj,patch),remove:async keys=>{for(const k of [].concat(keys))delete obj[k];}});
 const tab={id:1,url:'https://open.spotify.com/',title:'Spotify',status:'complete',active:true};
 const chrome={runtime:{id:'fixture-extension',onMessage:{addListener:fn=>listener=fn},onStartup:{addListener(){}}},storage:{local:area(local),session:area(session)},tabs:{query:async()=>[tab],get:async()=>tab,onRemoved:{addListener(){}},onUpdated:{addListener(){}},onActivated:{addListener(){}}},permissions:{contains:async()=>permission,remove:async()=>{permission=false;},onRemoved:{addListener(){}}},alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener(){}}},scripting:{executeScript:async a=>{injections.push(a);return[];}}};
 const box={chrome,URL,AbortSignal,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},fetch:async(url,args)=>{posts.push(new URL(url).pathname);if(offline)throw Error('offline');return fetch(url,args);}};
 const src=fs.readFileSync(path.join(__dirname,'../browser-extension/worker.js'),'utf8').replace("const BASE='http://127.0.0.1:47824'",`const BASE='http://127.0.0.1:${port}'`);
 vm.runInNewContext(src+'\nglobalThis.fixturePump=pump;',box);
 return{local,session,posts,injections,timers,tab,offline:on=>offline=on,permission:on=>permission=on,tick:async()=>{await new Promise(setImmediate);await box.fixturePump();},send:m=>new Promise(r=>listener(m,{},r))};
}
test('encrypted pairing key and remembered mode survive a new store; reset rotates the key',t=>{
 const d=disk(t),one=d.store(),first=one.get();one.remember(true);const contents=fs.readFileSync(d.file(),'utf8');assert.ok(!contents.includes(first.token));assert.ok(JSON.parse(contents).key.startsWith('enc:'));
 const two=d.store();assert.equal(two.get().token,first.token);assert.equal(two.get().browserMode,true);assert.notEqual(two.get({rotate:true}).token,first.token);assert.equal(two.get().browserMode,false);
});
test('corrupt encrypted state fails closed and explicit reset repairs it; no plaintext key is accepted',t=>{
 const d=disk(t);fs.mkdirSync(path.dirname(d.file()),{recursive:true});fs.writeFileSync(d.file(),JSON.stringify({schema:1,key:'plaintext',remembered:true}));assert.throws(()=>d.store().get(),/อ่านข้อมูลจับคู่/);assert.equal(d.store().get({rotate:true}).browserMode,false);
});
test('remembered extension recovers after app restart without entering a new code or injecting a page again',async t=>{
 const d=disk(t);let store=d.store(),broker=createChromeBroker({port:0,extensionId:'fixture-extension',tokenProvider:o=>store.get(o),onRememberChange:on=>store.remember(on)});t.after(()=>broker.close());
 const info=await broker.start(),f=worker(info.port);assert.equal((await f.send({type:'connect',code:info.code,remember:true})).ok,true);const oldSession=f.session.connection.session,initialInjections=f.injections.length;
 await broker.close();store=d.store();broker=createChromeBroker({port:info.port,extensionId:'fixture-extension',tokenProvider:o=>store.get(o),onRememberChange:on=>store.remember(on)});const next=await broker.start();assert.equal(next.code,info.code);assert.equal(broker.status().browserMode,true);
 for(let i=0;i<6&&!broker.status().connected;i++)await f.tick();assert.equal(broker.status().connected,true);assert.notEqual(f.session.connection.session,oldSession);assert.equal(f.injections.length,initialInjections);assert.equal(f.local.browserPair.code,info.code);assert.equal(f.posts.filter(x=>x==='/connect').length,2);
});
test('remembered retry survives extended app downtime; Chrome restart needs only saved local preference',async t=>{
 const d=disk(t),store=d.store(),broker=createChromeBroker({port:0,extensionId:'fixture-extension',tokenProvider:o=>store.get(o),onRememberChange:on=>store.remember(on)});t.after(()=>broker.close());const info=await broker.start(),f=worker(info.port,{browserPair:{code:info.code}});f.offline(true);
 for(let i=0;i<9;i++)await f.tick();assert.ok(f.local.browserPair);assert.ok(f.timers.length>=9);f.offline(false);await f.tick();assert.equal(broker.status().connected,true);assert.equal(f.injections.length,0);
 const newWorker=worker(info.port,f.local,{});await newWorker.tick();assert.equal(broker.status().connected,true);assert.ok(newWorker.session.connection);assert.equal(newWorker.injections.length,0);
});
test('revoking from app rejects old pairing code and clears remembered reconnect; permission removal also stops it',async t=>{
 const d=disk(t),store=d.store(),broker=createChromeBroker({port:0,extensionId:'fixture-extension',tokenProvider:o=>store.get(o),onRememberChange:on=>store.remember(on)});t.after(()=>broker.close());const info=await broker.start(),f=worker(info.port,{browserPair:{code:info.code}});await f.tick();await broker.revoke();await f.tick();assert.equal(f.local.browserPair,undefined);assert.equal(broker.status().connected,false);assert.equal(store.get().browserMode,false);
 const saved=store.get(),g=worker(info.port,{browserPair:{code:saved.token}});await g.tick();g.permission(false);await g.tick();assert.equal(g.local.browserPair,undefined);assert.equal(broker.status().connected,false);
});

test('remembered pairing cannot be granted from an incognito tab',async t=>{
 const d=disk(t),store=d.store(),broker=createChromeBroker({port:0,extensionId:'fixture-extension',tokenProvider:o=>store.get(o),onRememberChange:on=>store.remember(on)});t.after(()=>broker.close());const info=await broker.start(),f=worker(info.port);f.tab.incognito=true;const r=await f.send({type:'connect',code:info.code,remember:true});assert.match(r.error,/ไม่ระบุตัวตน/);assert.equal(broker.status().connected,false);assert.equal(f.local.browserPair,undefined);
});
