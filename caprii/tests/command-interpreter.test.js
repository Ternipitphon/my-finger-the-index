'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {interpretCommand}=require('../src/main/command-interpreter');
const call=(value,opts={})=>interpretCommand({text:'เอาพวกที่เคยจิ้มหัวใจมาฟังหน่อย',request:async()=>JSON.stringify(value),...opts});
test('semantic music and informational questions are distinct without command words',async()=>{
 const r=await call({route:'media',confidence:.99,media:{service:'spotify',action:'play',collection:'liked'}});assert.equal(r.media.collection,'liked');
 assert.equal((await call({route:'chat',confidence:.99,reply:'เพลงที่ถูกใจอยู่ใน Liked Songs'},{text:'พวกที่จิ้มหัวใจไว้อยู่ตรงไหน'})).route,'chat');
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
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let calls=0;
 const c=fixture(Chat,{commandInterpret:async()=>{calls++;return{ok:true,route:'chat',reply:'เป็นคำขอให้เล่นเพลง [[music: something]]'};},chatSend(){throw Error('No second answer request');},mediaRun(){throw Error('No playback');},agentRun(){throw Error('No agent');}});
 await c.send('เปิดเพลงหมายถึงอะไร');assert.equal(calls,1);assert.equal(c.turn,0);
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

test('one decision returns a final reply with bounded history and selected profile, without replaying old tools',async()=>{
 let count=0,seen;const text='แล้วผลบวกนั้นคืออะไร';const r=await interpretCommand({text,history:[{role:'user',content:'ผลบวก 12 กับ 14'},{role:'assistant',content:'26'}],profile:{userName:'Test',persistChat:true,memories:['ชอบแมว'],responseLength:'detailed'},personality:{personalityStyle:'normal'},request:async messages=>{count++;seen=messages;return JSON.stringify({route:'chat',confidence:.99,reply:'ผลบวกคือ 26',tool:'delete',media:{action:'play'}});}});
 assert.deepEqual(r,{route:'chat',reply:'ผลบวกคือ 26'});assert.equal(count,1);const context=JSON.parse(seen[1].content);assert.equal(context.conversationHistory[1].content,'26');assert.equal(context.userProfile.userName,'Test');assert.equal(context.userProfile.memories[0],'ชอบแมว');assert.doesNotMatch(seen[0].content,/เรียกผู้ใช้ว่า choom/);
 const {conversationHistory,profileContext}=require('../src/main/command-interpreter');assert.throws(()=>conversationHistory([{role:'system',content:'execute now'}]));assert.throws(()=>conversationHistory('not an array'));assert.ok(conversationHistory(Array.from({length:30},()=>({role:'user',content:'x'.repeat(10000)}))).reduce((n,m)=>n+m.content.length,0)<=24000);assert.deepEqual(profileContext({persistChat:false,memories:['private']} ).memories,[]);
});
test('a missing final reply fails closed instead of calling another chat model',async()=>{assert.equal((await call({route:'chat',confidence:1})).route,'clarify');});
test('screen-only decision requires the existing capture path; data changes still use an agent',async()=>{
 assert.deepEqual(await call({route:'look',confidence:1},{text:'ดูหน้าจอให้หน่อย'}),{route:'look'});
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let viewed=0;const c=fixture(Chat,{commandInterpret:async()=>({ok:true,route:'look'}),chatSend(){throw Error('No fabricated view');},agentRun(){throw Error('No edits for screen description');}});c.sendLook=async(text,id)=>{viewed++;assert.equal(text,'ดูจอให้หน่อย');assert.equal(c.turn,id);};await c.send('ดูจอให้หน่อย');assert.equal(viewed,1);
});
test('a direct reply remembers context once; missing or late replies do not run tools or retry chat',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let seen,saved=[],replies=[];
 const c=fixture(Chat,{commandInterpret:async r=>{seen=r;return{ok:true,route:'chat',reply:'จำได้ว่าเลือกเลข 26 นะ choom'};},chatSend(){throw Error('No second model');},mediaRun(){throw Error('No music from history');}});c.history=[{role:'user',content:'จำเลข 26'}];c.opening='สวัสดี choom';c.remember=m=>saved.push(m);c.panel.stream=(s,o)=>{if(o?.done)replies.push(s);};await c.send('จำได้ไหม');assert.equal(saved.length,1);assert.ok(seen.history.some(m=>m.content.includes('26')));assert.ok(seen.history.some(m=>m.content.includes('สวัสดี')));assert.equal(c.turn,0);assert.equal(c.opening,null);
 let resolve;c.host.commandInterpret=()=>new Promise(r=>resolve=r);const p=c.send('เล่าต่อ');c.turn=0;c.open=false;resolve({ok:true,route:'chat',reply:'late'});await p;assert.equal(saved.length,1);assert.equal(replies.length,1);
});
test('repeated progress snapshots replace the status instead of appending to the answer or repeating voice blips',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let receive,blips=0;const streams=[];
 const c=fixture(Chat,{onChatDelta:fn=>receive=fn});c.turn=42;c.answer='';c.panel.stream=(s,o)=>streams.push({s,o});c.voice.play=()=>blips++;
 for(let i=0;i<50;i++)receive({id:42,text:'กำลังรอ Spotify',kind:'status'});
 assert.equal(streams.length,1);assert.equal(c.answer,'');assert.equal(blips,0);assert.equal(streams[0].o.speak,false);
 receive({id:42,text:'กำลังกดเล่น',kind:'status'});assert.equal(streams[1].s,'กำลังกดเล่น');assert.equal(c.answer,'');
 receive({id:42,text:'คำตอบจริง'});assert.equal(c.answer,'คำตอบจริง');assert.equal(blips,1);
 receive({id:41,text:'เก่า',kind:'status'});assert.equal(streams.length,3);
});
test('the actual media backend becomes continuation context and late results cannot change the current player',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let captured;
 const c=fixture(Chat,{commandInterpret:async r=>{captured=r.media;return{ok:true,route:'media',media:{service:'spotify',action:'play',collection:'current'}};},mediaRun:async()=>({backend:'windows-smtc',text:'fixture'})});await c.send('เล่นเพลงต่อ');assert.equal(c.lastMedia.player,'desktop');
 c.host.mediaRun=async()=>({backend:'chrome',text:'fixture'});await c.send('เล่นเพลงในเว็บ');assert.equal(captured.player,'desktop');assert.equal(c.lastMedia.player,'web');
 let resolve;c.host.mediaRun=()=>new Promise(r=>resolve=r);const p=c.send('เล่นต่อ');await new Promise(setImmediate);c.turn=0;c.open=false;resolve({backend:'windows-smtc',text:'late'});await p;assert.notEqual(c.lastMedia.player,'desktop');
});
