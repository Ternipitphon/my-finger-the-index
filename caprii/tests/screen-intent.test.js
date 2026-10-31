'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
async function intent(){return (await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(require('node:path').join(__dirname,'../src/renderer/js/screen-intent.js'))).toString('base64'))).screenIntent;}
test('Thai screen viewing goes to the screenshot permission flow',async()=>{
 const route=await intent();for(const text of ['ดูจอให้หน่อย','ช่วยดูหน้าจอหน่อย','ตอนนี้เห็นอะไรบนหน้าจอ','อ่านจอให้หน่อย'])assert.equal(route(text),'look',text);
});
test('Thai screen typing and clicking route to agent without requiring slash prefix',async()=>{
 const route=await intent();for(const text of ['ดูจอแล้วพิมพ์คำตอบลงไป','ช่วยดูหน้าจอ คำนวณแล้วกรอกคำตอบให้หน่อย','ดูจอและกดส่งคำตอบ','look at my screen and fill the answer'])assert.equal(route(text),'agent',text);
});
test('ordinary chat and screen-sharing refusal never start a screen action',async()=>{
 const route=await intent();for(const text of ['สวัสดี','พิมพ์คำตอบให้ดูหน่อย','อย่าดูจอ','ไม่ต้องดูหน้าจอแล้วพิมพ์','do not capture my screen'])assert.equal(route(text),null,text);
});
test('math question about the screen invokes agent calculation, not image-only narration',async()=>{
 const route=await intent();assert.equal(route('ดูจอแล้วตอบมาว่าข้อนี้ตอบไร'),'agent');
});
