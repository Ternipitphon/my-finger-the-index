'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(__dirname,'../src/renderer/js/command-intent.js'))).toString('base64'));
test('Thai and English YouTube commands map to an exact HTTPS URL',async()=>{
 const {siteCommand}=await load();for(const s of ['เปิดyoutube','เปิด YouTube ให้หน่อย','เปิดยูทูป','ช่วยเปิดยูทูบหน่อย','open youtube','ผมอยากให้คุณเปิด YouTube'])assert.equal(siteCommand(s)?.url,'https://www.youtube.com/',s);
});
test('narration, refusal and multi-step requests are not misreported as a simple website launch',async()=>{
 const {siteCommand}=await load();for(const s of ['อย่าเปิดYouTube','ผมบอกให้เปิดyoutubeแต่มันไม่เป็นให้','เปิด youtube แล้วค้นหาแมว'])assert.equal(siteCommand(s),null,s);
});
test('mouse and keyboard commands route naturally while refusal stays in chat',async()=>{
 const {actionCommand}=await load();for(const s of ['คลิกปุ่มส่ง','ช่วยลากไฟล์ไปทางขวา','เลื่อนลง','กรอกชื่อให้หน่อย','พิมพ์ hello','ใช้เมาส์คลิกปุ่มส่ง','ผมอยากให้คุณเลื่อนลง','ข้อนี้ตอบอะไร','ค้นหาไฟล์รายงานแล้วเปิด','หาไฟล์งาน','เปิดเกม Limbus Company'])assert.equal(actionCommand(s),true,s);
 assert.equal(actionCommand('อย่าคลิกปุ่มส่ง'),false);
});
test('short puzzle requests and followups use current context without guessing absent work',async()=>{const {resolveTaskCommand}=await load();assert.match(resolveTaskCommand('ช่วยทำข้อนี้ให้หน่อย').goal,/กรอกคำตอบ/);assert.match(resolveTaskCommand('ทำข้อนี้แล้วส่งเลย').goal,/แล้วกดส่งคำตอบ/);assert.match(resolveTaskCommand('ส่งเลย','กรอกคำตอบแต่ไม่ต้องกดส่ง').goal,/คำสั่งตอนนี้: ตรวจคำตอบปัจจุบันแล้วกดส่ง/);assert.ok(resolveTaskCommand('ทำต่อ').question);assert.ok(resolveTaskCommand('เอาเลย','สวัสดี').question);assert.ok(resolveTaskCommand('เอาเลย','เปิดyoutube').question);assert.equal(resolveTaskCommand('ไม่ต้องทำต่อ','ทำโจทย์บนหน้าเว็บ'),null);});
test('asking how to solve does not silently become permission to type or submit',async()=>{const {resolveTaskCommand}=await load();const r=resolveTaskCommand('ทำโจทย์ข้อนี้ยังไง');assert.match(r.goal,/อธิบาย/);assert.match(r.goal,/อย่ากรอกคำตอบ/);assert.match(r.goal,/อย่ากดส่ง/);assert.match(resolveTaskCommand('ส่งให้หน่อย','กรอกคำตอบบนหน้าเว็บ').goal,/คำสั่งตอนนี้: ตรวจคำตอบปัจจุบันแล้วกดส่ง/);});
