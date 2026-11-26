'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {thaiResponse,thaiMessages}=require('../src/main/thai-language');
const load=file=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(file)).toString('base64'));
test('English chat is rewritten once to Thai while original messages remain intact',async()=>{const original=[{role:'user',content:'hello'}];let calls=0;const text=await thaiResponse({messages:original,request:async messages=>{assert.match(messages[0].content,/ภาษาไทย/);return ++calls===1?'Hello, how can I help?':'สวัสดี มีอะไรให้ช่วยไหม';}});assert.equal(text,'สวัสดี มีอะไรให้ช่วยไหม');assert.equal(calls,2);assert.equal(original.length,1);});
test('tool names/code/numbers stay unchanged and finish summaries use Thai',async()=>{assert.equal(await thaiResponse({messages:[],request:async()=>'{"tool":"math.evaluate","expression":"2+2"}'}),'{"tool":"math.evaluate","expression":"2+2"}');let calls=0;const result=JSON.parse(await thaiResponse({messages:[],request:async()=>++calls===1?'{"tool":"finish","summary":"Filled the answer"}':'ส่งคำสั่งกรอกแล้ว'}));assert.equal(result.tool,'finish');assert.match(result.summary,/กรอก/);assert.equal(thaiMessages([{role:'user',content:'2+2'}])[1].content,'2+2');});
test('language repair is bounded when a provider keeps answering in English',async()=>{let calls=0;await assert.rejects(thaiResponse({messages:[],request:async()=>{calls++;return'English answer again';}}),/ภาษาไทย/);assert.equal(calls,2);});
test('all Thai dialogue keeps the original structure and placeholders',async()=>{const {THAI_LINES}=await load(path.join(__dirname,'../src/renderer/js/lines-th.js'));const source=fs.readFileSync(path.join(__dirname,'../src/renderer/js/lines.js'),'utf8').replace(/^import .*\n/,'').replace('LINES.th=THAI_LINES;','');const {LINES}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));let count=0;function check(en,th){if(typeof en==='string'){count++;assert.deepEqual((en.match(/\{[^{}]+\}/g)||[]).sort(),(th.match(/\{[^{}]+\}/g)||[]).sort());}else if(en&&typeof en==='object'){assert.deepEqual(Object.keys(th),Object.keys(en));for(const key of Object.keys(en))check(en[key],th[key]);}}check(LINES.en,THAI_LINES);assert.equal(count,477);assert.match(THAI_LINES.chat.placeholder,/พิมพ์/);});
test('Thai speech never falls back to an English voice and respects mute',async()=>{const {ThaiSpeech}=await load(path.join(__dirname,'../src/renderer/js/thai-speech.js'));const spoken=[],voices=[{lang:'en-US'}];const speech=new ThaiSpeech({synthesis:{getVoices:()=>voices,cancel(){},speak:x=>spoken.push(x)},Utterance:class{constructor(text){this.text=text;}}});speech.configure({speechThai:true,muted:false});assert.equal(speech.speak('สวัสดี'),false);voices.push({lang:'th-TH',localService:false});assert.equal(speech.speak('สวัสดี'),false);voices.push({lang:'th-TH',localService:true});assert.equal(speech.speak('สวัสดี'),true);assert.equal(spoken[0].lang,'th-TH');speech.configure({speechThai:true,muted:true});assert.equal(speech.speak('สวัสดี'),false);});
test('structured data and malformed tool JSON are preserved for the normal tool repair path',async()=>{
 for(const text of ['{"name":"Alice"}','{"tool":"read",']){let calls=0;assert.equal(await thaiResponse({messages:[],request:async()=>{calls++;return text;}}),text);assert.equal(calls,1);}
});
test('inappropriate forms of address in an otherwise Thai reply are rewritten before display',async()=>{let calls=0;const bad='คำตอบในภาพนี้ nigga ต้องตรวจด้วยเครื่องคิดเลข';const result=await thaiResponse({messages:[{role:'user',content:'ดูจอแล้วหาคำตอบ'}],request:async()=>++calls===1?bad:'กำลังตรวจโจทย์ปัจจุบันด้วยเครื่องคิดเลข'});assert.equal(calls,2);assert.doesNotMatch(result,/nigga/i);});
test('repeated disrespectful output is withheld, including final task summaries',async()=>{let calls=0;await assert.rejects(thaiResponse({messages:[],request:async()=>{calls++;return'สวัสดี nigga';}}),/ไม่เหมาะสม/);assert.equal(calls,2);let n=0;const summary=JSON.parse(await thaiResponse({messages:[],request:async()=>++n===1?'{"tool":"finish","summary":"เสร็จแล้ว nigga"}':'ส่งคำสั่งแล้วและตรวจผลแล้ว'}));assert.equal(summary.tool,'finish');assert.doesNotMatch(summary.summary,/nigga/i);});
test('respectful situational teasing is returned without rewriting',async()=>{
 let calls=0;const reply='แท็บกำลังเปิดประชุมกันแล้วนะ เลขรับเรื่องคือ 126';assert.equal(await thaiResponse({messages:[],request:async()=>{calls++;return reply;}}),reply);assert.equal(calls,1);
});
test('style repair is isolated from playful history and preserves the reply facts',async()=>{
 let calls=0;const draft='มึง เลขรับเรื่อง 126 อยู่ที่ https://example.org/receipt/126';
 const result=await thaiResponse({messages:[{role:'system',content:'PLAYFUL_HISTORY_MARKER'},{role:'user',content:'คุยกวน ๆ'}],request:async messages=>{
  if(++calls===1)return draft;
  assert.equal(messages.length,2);assert.doesNotMatch(messages[0].content,/PLAYFUL_HISTORY_MARKER/);assert.equal(JSON.parse(messages[1].content).draft,draft);assert.match(messages[0].content,/not a conversation or action request/);
  return 'เลขรับเรื่องคือ 126 ดูได้ที่ https://example.org/receipt/126';
 }});assert.equal(calls,2);assert.match(result,/126/);
});
test('repair that changes numbers or drops exact URLs/code is withheld',async()=>{
 for(const [draft,fixed]of [['มึง เลขรับเรื่อง 126','เลขรับเรื่องคือ 127'],['มึง ใช้ `const n=126;`','ใช้ const n=126;'],['มึง เปิด https://example.org/a','เปิด https://other.example/a']]){
  let calls=0;await assert.rejects(thaiResponse({messages:[],request:async()=>++calls===1?draft:fixed}),{code:'response_facts'});assert.equal(calls,2);
 }
});
test('finish summary repair cannot change tool fields or repeat actions',async()=>{
 let calls=0;const original={tool:'finish',summary:'มึง เลขรับเรื่อง 126',other:'keep exactly'};
 const result=JSON.parse(await thaiResponse({messages:[],request:async()=>++calls===1?JSON.stringify(original):'เลขรับเรื่องคือ 126'}));assert.deepEqual(result,{...original,summary:'เลขรับเรื่องคือ 126'});assert.equal(calls,2);
});
test('English style repair is also isolated and keeps literal values',async()=>{
 let calls=0;const result=await thaiResponse({lang:'en',messages:[{role:'system',content:'PLAYFUL_HISTORY_MARKER'}],request:async messages=>{
  if(++calls===1)return 'กู receipt 126';
  assert.equal(messages.length,2);assert.doesNotMatch(messages[0].content,/PLAYFUL_HISTORY_MARKER/);return 'The receipt number is 126.';
 }});assert.equal(result,'The receipt number is 126.');assert.equal(calls,2);
});
test('a busy repair cannot make the chat runner replay the original request',async()=>{
 const {runChat}=require('../src/main/chat-runner');let calls=0;
 await assert.rejects(runChat({models:['fixture'],maxAttempts:3,retryMs:1,timeoutMs:1000,request:()=>thaiResponse({messages:[],request:async()=>{
  if(++calls===1)return 'มึง เลขรับเรื่อง 126';throw Object.assign(Error('fixture busy'),{code:'busy'});
 }})}),{code:'reply_repair'});assert.equal(calls,2);
});
