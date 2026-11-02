'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture({fetch,tabURL='https://example.com/',injectError=false}={}){
 let listener;const stored={},calls=[];const context={URL,AbortSignal,fetch:fetch||(async()=>({ok:true,status:200,json:async()=>({session:'fixture-session'})})),chrome:{runtime:{id:'fixture-extension',onMessage:{addListener:fn=>listener=fn}},storage:{session:{get:async key=>typeof key==='string'?{[key]:stored[key]}:{},set:async value=>Object.assign(stored,value),remove:async keys=>{for(const key of [].concat(keys))delete stored[key];}}},tabs:{query:async()=>[{id:1,url:tabURL,title:'fixture'}],onRemoved:{addListener(){}},onUpdated:{addListener(){}}},scripting:{executeScript:async()=>{if(injectError)throw Error('denied');}}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../browser-extension/worker.js'),'utf8')+'\nglobalThis.fixtureRequest=request;',context);
 return{stored,request:()=>context.fixtureRequest('/connect',{url:tabURL},{code:'fixture-only-code'}),connect:()=>new Promise(resolve=>listener({type:'connect',code:'fixture-only-code'},{},resolve))};
}
test('connection diagnostics distinguish app offline, stale pairing and unsupported file pages',async()=>{
 await assert.rejects(fixture({fetch:async()=>{throw Error('network');}}).request(),/ติดต่อแอป/);
 await assert.rejects(fixture({fetch:async()=>({status:403,ok:false})}).request(),/รหัสเชื่อมต่อหรือส่วนขยาย/);
 await assert.rejects(fixture({fetch:async()=>({status:409,ok:false})}).request(),/หมดอายุ/);
 const result=await fixture({tabURL:'file:///example/index.html'}).connect();assert.match(result.error,/เปิดเว็บทดสอบ Caprii/);assert.match(result.error,/127\.0\.0\.1/);
});
test('failed DOM injection rolls back selected-tab state instead of reporting a false connection',async()=>{
 const f=fixture({injectError:true}),result=await f.connect();assert.match(result.error,/ส่วนขยายเข้าแท็บนี้ไม่ได้/);assert.equal(f.stored.connection,undefined);
});
