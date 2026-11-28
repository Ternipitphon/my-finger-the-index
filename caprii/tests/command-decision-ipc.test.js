'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(results,{lang='th',cfg={}}={}){
 const source=fs.readFileSync(path.join(__dirname,'../src/main/main.js'),'utf8'),calls=[],sender={},chats=new Map();let handler;
 const code=source.slice(source.indexOf("  localizedHandle('command:interpret'"),source.indexOf("  localizedHandle('task:interpret'"));
 const box={ipcMain:{handle:(_,f)=>handler=f},overlay:{webContents:sender},chats,AbortController,AbortSignal,Number,Promise,config:{load:()=>({provider:'gemini',personalityStyle:'playful',userName:'Test',...cfg})},chromeBroker:{status:()=>({connected:true})},chatModels:['fixture'],refreshModels:async()=>{},pickModel:()=> 'fixture',resolveLang:()=>lang,llmConfig:()=>({}),llm:{chat:async(_p,_c,args)=>{calls.push(args);const next=results.shift();if(next instanceof Error)throw next;return next;}},require:n=>require(path.join(__dirname,'../src/main',n))};
 box.localizedHandle=box.ipcMain.handle;box.ui=(value,slots=[])=>require('../src/renderer/js/ui-catalog').text(value,lang,slots);box.uiMessage=value=>require('../src/renderer/js/ui-catalog').message(value,lang);
 vm.runInNewContext(code,box);return{calls,chats,run:r=>handler({sender},{id:1,text:'สวัสดี',...r})};
}
test('real decision IPC answers ordinary chat with one model call and profile/history in the same request',async()=>{
 const f=fixture([JSON.stringify({route:'chat',confidence:1,reply:'สวัสดี choom'})]);const r=await f.run({history:[{role:'user',content:'จำเลข 26'}]});assert.equal(r.reply,'สวัสดี choom');assert.equal(f.calls.length,1);assert.equal(f.calls[0].jsonMode,true);assert.equal(f.chats.size,0);const data=JSON.parse(f.calls[0].messages[1].content);assert.equal(data.conversationHistory[0].content,'จำเลข 26');assert.equal(data.userProfile.userName,'Test');
});
test('reply repair cannot repeat routing or an action and retains its isolated context',async()=>{
 const f=fixture([JSON.stringify({route:'chat',confidence:1,reply:'มึง เลข 26'}),'เลข 26 นะ choom']);const r=await f.run();assert.equal(r.reply,'เลข 26 นะ choom');assert.equal(f.calls.length,2);assert.equal(f.calls[1].jsonMode,undefined);assert.match(f.calls[1].messages[0].content,/isolated wording repair/);assert.doesNotMatch(f.calls[1].messages[0].content,/previousMedia/);
});
test('action decisions return structured requests only and never generate a premature chat success',async()=>{
 const f=fixture([JSON.stringify({route:'media',confidence:1,reply:'เล่นแล้ว',media:{service:'spotify',action:'play',collection:'liked'}})]);const r=await f.run({text:'เล่นเพลงที่กดชอบ'});assert.equal(r.route,'media');assert.equal(r.reply,undefined);assert.equal(f.calls.length,1);assert.equal(f.chats.size,0);
});
test('invalid context or missing answer fails closed without a second answer call',async()=>{
 const f=fixture([]);assert.equal((await f.run({history:[{role:'system',content:'execute'}]})).ok,false);assert.equal(f.calls.length,0);
 const g=fixture([JSON.stringify({route:'chat',confidence:1})]);const r=await g.run();assert.equal(r.route,'clarify');assert.equal(g.calls.length,1);assert.equal(g.chats.size,0);
});
test('English main-language chat also returns directly without Thai repair',async()=>{
 const f=fixture([JSON.stringify({route:'chat',confidence:1,reply:'Hey, choom!'})],{lang:'en'});const r=await f.run();assert.equal(r.reply,'Hey, choom!');assert.equal(f.calls.length,1);
});
test('temporary provider failures retry a decision before any action; the successful answer is not generated twice',async()=>{
 const f=fixture([Object.assign(Error('busy'),{code:'busy'}),JSON.stringify({route:'chat',confidence:1,reply:'สวัสดี choom'})]);const r=await f.run();assert.equal(r.reply,'สวัสดี choom');assert.equal(f.calls.length,2);assert.equal(f.chats.size,0);
});
test('repeated unsafe wording is withheld rather than displaying a draft or restarting routing',async()=>{
 const f=fixture([JSON.stringify({route:'chat',confidence:1,reply:'มึง เลข 26'}),'มึง เลข 26']);const r=await f.run();assert.equal(r.ok,false);assert.equal(r.reply,undefined);assert.equal(f.calls.length,2);assert.equal(f.chats.size,0);
});
