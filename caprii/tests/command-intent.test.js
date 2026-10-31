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
 const {actionCommand}=await load();for(const s of ['คลิกปุ่มส่ง','ช่วยลากไฟล์ไปทางขวา','เลื่อนลง','กรอกชื่อให้หน่อย','พิมพ์ hello','ใช้เมาส์คลิกปุ่มส่ง','ผมอยากให้คุณเลื่อนลง','ข้อนี้ตอบอะไร'])assert.equal(actionCommand(s),true,s);
 assert.equal(actionCommand('อย่าคลิกปุ่มส่ง'),false);
});
