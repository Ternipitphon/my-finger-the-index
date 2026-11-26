'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {interpretMedia}=require('../src/main/media-interpreter');
const call=(result,opts={})=>interpretMedia({text:'เล่นเพลงที่ผมกดชอบหน่อย',request:async()=>JSON.stringify(result),...opts});
test('Thai and English requests share structured intents independently of reply language',async()=>{
 for(const [text,lang]of [['เล่นเพลงที่ผมกดชอบหน่อย','en'],['Play my liked songs','th']]){let prompt='';const r=await call(null,{text,lang,request:async m=>{prompt=m[0].content;return JSON.stringify({route:'media',confidence:.99,media:{service:'spotify',action:'play',collection:'liked'}});}});assert.equal(r.media.collection,'liked');assert.match(prompt,/Thai, English or mixed language/);}
});
test('AI output is validated and cannot create tools, names or destinations',async()=>{
 for(const media of [{service:'spotify',action:'delete',collection:'current'},{service:'spotify',action:'play',collection:'track',query:'Invented song'},{service:'youtube',action:'play',collection:'current'}])assert.equal((await call({route:'media',confidence:.99,media})).route,'clarify');
 const r=await call({route:'media',confidence:.99,media:{service:'spotify',action:'play',collection:'current',url:'https://evil.example'}},{text:'เปิดเพลง'});assert.equal(r.media.url,undefined);
 const search=await call({route:'media',confidence:.99,media:{service:'youtube',action:'search',query:'limbus'}},{text:'Search YouTube for limbus'});assert.equal(search.media.url,'https://www.youtube.com/results?search_query=limbus');
});
test('old names require explicit continuation and low confidence never executes',async()=>{
 const previous={service:'spotify',action:'play',collection:'track',query:'Harpy Hare'};
 const result={route:'media',confidence:.99,media:previous};assert.equal((await call(result,{text:'เล่นเพลง',previous})).route,'clarify');
 assert.equal((await call({...result,continuation:true},{text:'เล่นเลย',previous})).media.query,'Harpy Hare');
 assert.equal((await call({...result,confidence:.3})).route,'clarify');
});
test('broken JSON, timeout and cancellation do not fall back to an unplanned playback',async()=>{
 assert.equal((await call(null,{request:async()=>'bad json'})).route,'clarify');
 assert.equal((await call(null,{timeoutMs:20,request:()=>new Promise(()=>{})})).route,'clarify');
 const a=new AbortController();const p=call(null,{signal:a.signal,request:()=>new Promise(()=>{})});a.abort(Error('stopped'));await assert.rejects(p,/stopped/);
});
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
function moduleUrl(file){const s=fs.readFileSync(file,'utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${moduleUrl(path.resolve(path.dirname(file),p))}'`);return'data:text/javascript;base64,'+Buffer.from(s).toString('base64');}
function fixture(Chat,host){return new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){},setFace(){}},voice:{},brain:{lang:'en'},host:{onChatDelta(){},...host}});}
test('actual Chat waits for AI even for a clear legacy command and uses its validated intent',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let resolve,started=false;const calls=[];
 const chat=fixture(Chat,{mediaInterpret:()=>new Promise(r=>resolve=r),mediaRun:async r=>{calls.push(r);return{text:'verified fixture'};}});chat.open=true;
 const p=chat.send('เปิดเพลง');assert.equal(calls.length,0);resolve({ok:true,route:'media',media:{service:'spotify',action:'play',collection:'current'}});await p;assert.equal(calls.length,1);assert.equal(calls[0].media.collection,'current');
 const closed=fixture(Chat,{mediaInterpret:()=>new Promise(r=>resolve=r),mediaRun(){started=true;}});closed.open=true;const q=closed.send('Play my liked songs');closed.turn=0;closed.open=false;resolve({ok:true,route:'media',media:{service:'spotify',action:'play',collection:'liked'}});await q;assert.equal(started,false);
});
test('clarification never plays; a chat-only decision cannot fall back to legacy actions or model tags',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 const host={mediaInterpret:async()=>({ok:true,route:'clarify',question:'Which playlist?'}),mediaRun(){throw Error('No playback');}};
 const c=fixture(Chat,host);c.open=true;await c.send('play a playlist');assert.equal(c.turn,0);
 const chat=fixture(Chat,{...host,mediaInterpret:async()=>({ok:true,route:'chat'}),chatSend:async()=>({ok:true,text:'Supported. [[music: some song]]'})});chat.open=true;chat.asked=()=>{throw Error('No legacy action detection');};chat.after=()=>{throw Error('No model tag execution');};chat.remember=()=>{};chat.listApps=()=>{};await chat.send('Could you explain how to play songs?');assert.equal(chat.turn,0);
});
test('explicit prohibitions and requests for an explanation cannot be interpreted as playback',async()=>{
 const wrong={route:'media',confidence:.99,media:{service:'spotify',action:'play',collection:'current'}};
 for(const text of ['อย่าเล่นเพลง','Please do not play music','อธิบายวิธีเล่นเพลง','how to play songs'])assert.equal((await call(wrong,{text})).route,'chat',text);
});
test('a bare artist/playlist answer and a brief continuation still reach AI interpretation',async()=>{
 const {needsMediaInterpretation}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/media-interpretation.js')));
 assert.equal(needsMediaInterpretation('Yaelokre',{awaiting:'artist'}),true);assert.equal(needsMediaInterpretation('Night Drive',{awaiting:'playlist'}),true);assert.equal(needsMediaInterpretation('อีกที',{service:'spotify'}),true);assert.equal(needsMediaInterpretation('สวัสดี'),false);
});
