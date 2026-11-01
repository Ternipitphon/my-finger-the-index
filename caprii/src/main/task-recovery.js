'use strict';
function recoveryFor(message){
 if(/ห้ามส่งซ้ำ|ไม่ตอบกลับ|timed? out|timeout|uncertain/i.test(message))return{kind:'uncertain',hint:'ผลของคำสั่งยังไม่แน่ชัด อ่านสถานะได้ แต่ห้ามพิมพ์หรือกดส่งซ้ำอัตโนมัติ'};
 if(/read-only|พิมพ์ตรง|ไม่เก็บข้อความ/i.test(message))return{kind:'input',hint:'อ่านหน้าใหม่ ตรวจช่อง แล้วใช้แป้นคำตอบที่มองเห็นหากช่องไม่รับข้อความ ตรวจค่าด้วย browser.expect_value ก่อนส่ง'};
 if(/Inspect the page|หน้าเว็บเปลี่ยน|ปุ่มหรือช่องเปลี่ยน|ไม่พบช่องหรือปุ่ม|no longer available/i.test(message))return{kind:'stale',hint:'อ่านหน้าใหม่เพื่อรับ ID และ generation ใหม่ก่อนทำต่อ'};
 if(/lost focus|refused to focus|Input field moved|window moved/i.test(message))return{kind:'focus',hint:'ตรวจหน้าต่างและภาพใหม่ แล้วเลือกช่องที่ถูกต้องอีกครั้ง ไม่ใช้พิกัดเก่า'};
 return null;
}
function createRecoveryBudget(){
 const failures=new Map();let hints=0,uncertainWrite=false;
 const mutation=a=>['browser.type','browser.click','desktop.input','uia.type','uia.invoke','launcher.open','write','move'].includes(a.tool);
 const key=a=>JSON.stringify([a.tool,a.kind||'',a.id??a.targetHandle??a.handle??'',a.value??a.text??'',a.intent||'']);
 return{before(a){if(uncertainWrite&&mutation(a))throw Error('ผลคำสั่งก่อนหน้ายังไม่แน่ชัด ห้ามส่งซ้ำ ต้องให้ผู้ใช้ตรวจผลก่อน');if((failures.get(key(a))||0)>=2)throw Error('หยุดลองคำสั่งเดิมหลังล้มเหลว 2 ครั้ง ต้องตรวจสาเหตุหรือเปลี่ยนวิธีก่อน');},failed(a,message){failures.set(key(a),(failures.get(key(a))||0)+1);const recovery=recoveryFor(message);if(recovery?.kind==='uncertain'&&mutation(a))uncertainWrite=true;if(!recovery||hints++>=3)return null;return recovery;}};
}
module.exports={createRecoveryBudget,recoveryFor};
