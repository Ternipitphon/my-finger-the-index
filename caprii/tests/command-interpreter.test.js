'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {interpretCommand}=require('../src/main/command-interpreter');
const call=(value,opts={})=>interpretCommand({text:'เอาพวกที่เคยจิ้มหัวใจมาฟังหน่อย',request:async()=>JSON.stringify(value),...opts});
test('semantic music and informational questions are distinct without command words',async()=>{
 const r=await call({route:'media',confidence:.99,media:{service:'spotify',action:'play',collection:'liked'}});assert.equal(r.media.collection,'liked');
 assert.equal((await call({route:'chat',confidence:.99},{text:'พวกที่จิ้มหัวใจไว้อยู่ตรงไหน'})).route,'chat');
});
test('website capabilities use known destinations or a supplied full address, not invented URLs',async()=>{
 const r=await call({route:'website',confidence:.99,target:'youtube'},{text:'พาไปเว็บดูคลิปสีแดงหน่อย'});assert.equal(r.website.url,'https://www.youtube.com/');
 for(const target of ['YouTube','https://www.youtube.com/'])assert.equal((await call({route:'website',confidence:.99,target},{text:'พาไปเว็บดูคลิปสีแดงหน่อย'})).website.url,'https://www.youtube.com/');
 const url='https://example.org/search?q=hello&x=1#result';assert.equal((await call({route:'website',confidence:.99,target:url},{text:'อยากไป '+url})).website.url,url);
 for(const target of ['https://invented.example','javascript:alert(1)','https://u:p@example.org'])assert.equal((await call({route:'website',confidence:.99,target},{text:'เปิดร้านแมวบิน'})).route,'clarify');
});
test('agent receives exact current wording; old instructions cannot alter current requirements',async()=>{
 const text='เอาชื่อนี้ใส่ช่องข้างหน้า แต่ห้ามส่ง';const r=await call({route:'agent',confidence:.99,goal:'ส่งเลย',tool:'delete'},{text,previous:'กดส่งคำตอบ'});assert.equal(r.goal,text);assert.equal(r.tool,undefined);assert.equal(require('../src/main/task-completion').requirements(r.goal).submit,false);
 assert.equal((await call({route:'selected-tab',confidence:.99},{connected:false})).route,'clarify');
});
test('invalid, low-confidence and timed-out interpretations never fall back to keywords',async()=>{
 for(const value of [{route:'run_shell',confidence:1},{route:'agent',confidence:.3},null])assert.equal((await call(value)).route,'clarify');
 assert.equal((await call(null,{timeoutMs:20,request:()=>new Promise(()=>{})})).route,'clarify');
 const a=new AbortController();const p=call(null,{signal:a.signal,request:()=>new Promise(()=>{})});a.abort(Error('stopped'));await assert.rejects(p,/stopped/);
});
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
function moduleUrl(file){const s=fs.readFileSync(file,'utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${moduleUrl(path.resolve(path.dirname(file),p))}'`);return'data:text/javascript;base64,'+Buffer.from(s).toString('base64');}
function fixture(Chat,host){const c=new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){},setFace(){}},voice:{},brain:{lang:'th'},host:{onChatDelta(){},...host}});c.open=true;c.asked=()=>{throw Error('No keyword dispatch');};c.after=()=>{throw Error('No action tags');};c.remember=()=>{};c.listApps=()=>{};return c;}
test('actual Chat routes every text through AI, including paraphrases that legacy patterns cannot match',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let resolve;const played=[],opened=[],classified=[];
 const c=fixture(Chat,{commandInterpret:r=>{classified.push(r.text);return new Promise(r=>resolve=r);},mediaInterpret(){throw Error('No second classifier');},taskInterpret(){throw Error('No keyword gate');},mediaRun:async r=>{played.push(r.media);return{text:'fixture only'};},openSite:async url=>{opened.push(url);return true;}});
 const p=c.send('เอาพวกที่เคยจิ้มหัวใจมาฟังหน่อย');assert.equal(played.length,0);resolve({ok:true,route:'media',media:{service:'spotify',action:'play',collection:'liked'}});await p;assert.equal(played.length,1);
 const q=c.send('พาไปเว็บดูคลิปสีแดงหน่อย');resolve({ok:true,route:'website',website:{name:'youtube',url:'https://www.youtube.com/'}});await q;assert.equal(opened.length,1);assert.equal(classified.length,2);
});
test('chat-only decisions, failed interpretation and closing prevent any legacy or tag action',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let sent;
 const c=fixture(Chat,{commandInterpret:async()=>({ok:true,route:'chat'}),chatSend:async r=>{sent=r;return{ok:true,text:'An explanation [[music: something]]'};},mediaRun(){throw Error('No playback');},agentRun(){throw Error('No agent');}});
 await c.send('เปิดเพลงหมายถึงอะไร');assert.equal(sent.semanticText,'เปิดเพลงหมายถึงอะไร');
 c.host.commandInterpret=async()=>({ok:true,route:'clarify',question:'Which target?'});await c.send('เปิดเพลง');assert.equal(c.turn,0);
 let resolve;c.host.commandInterpret=()=>new Promise(r=>resolve=r);const p=c.send('เปิดเพลง');c.turn=0;c.open=false;resolve({ok:true,route:'media',media:{service:'spotify',action:'play',collection:'current'}});await p;
});
test('canonical website capability map matches the legacy destinations without parsing user command words',async()=>{
 const legacy=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/command-intent.js')));assert.deepEqual(require('../src/shared/website-destinations.json'),legacy.WEBSITE_URLS);
});

test('an explicit generic play reaches playback without the website/autoplay preference path in Thai and English',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 for(const text of ['เปิดเพลง','turn on some music','เปิดเพลงล่าสุดที่ค้างอยู่']){
  const calls=[];const c=fixture(Chat,{commandInterpret:async()=>({ok:true,route:'media',media:{service:'spotify',action:'play',collection:'current'}}),openSite(){throw Error('No website confirmation');},mediaRun:async r=>{calls.push(r);return{text:'fixture'};}});c.spotifyAutoPlay=false;await c.send(text);assert.equal(calls.length,1);assert.equal(calls[0].autoOpen,undefined);assert.equal(calls[0].media.collection,'current');
 }
 let prompt='';await call({route:'media',confidence:.99,media:{service:'spotify',action:'play',collection:'current'}},{text:'เปิดเพลง',request:async messages=>{prompt=messages[0].content;return JSON.stringify({route:'media',confidence:.99,media:{service:'spotify',action:'play',collection:'current'}});}});assert.match(prompt,/Do not ask which song/);assert.match(prompt,/takes precedence over the autoplay preference/);
});
test('AI website Spotify root also reaches media before any generic website confirmation',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let calls=0;
 const c=fixture(Chat,{commandInterpret:async()=>({ok:true,route:'website',website:{name:'spotify',url:'https://open.spotify.com/'}}),openSite(){throw Error('No generic website dialog');},mediaRun:async r=>{calls++;assert.equal(r.autoOpen,true);assert.equal(r.alreadyOpened,undefined);return{text:'fixture'};}});await c.send('เปิด Spotify');assert.equal(calls,1);assert.equal(c.turn,0);
});
