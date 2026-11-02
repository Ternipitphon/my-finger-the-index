'use strict';
const MODES=['short','balanced','detailed'];
const ACCURACY='ความแม่นยำ: ยึดคำถามล่าสุดและหลักฐานที่ได้รับจริง ไม่แต่งตัวเลขหรือผลการทำงาน แยกข้อเท็จจริงจากข้อสันนิษฐาน ถ้าอ่านข้อความหรือตัวเลขไม่ชัดให้บอกส่วนที่ไม่ชัด ไม่เดา หากได้รับภาพแนบจริงให้ตอบจากภาพนั้น ไม่บอกว่าไม่มีภาพ ถ้างานต้องคำนวณและมีเครื่องมือ ให้คำนวณตรวจผลก่อนตอบ งานบนหน้าเว็บใช้ DOM ล่าสุดก่อน; งานหน้าจอใช้ภาพที่จับจริงหลังอนุญาต ไม่โทษผู้ใช้เมื่อเครื่องมือหรือข้อมูลไม่พร้อม';
function normalizeLength(value){return MODES.includes(value)?value:'short';}
function userText(message){if(typeof message?.content==='string')return message.content;if(Array.isArray(message?.content))return message.content.filter(p=>p.type==='text').map(p=>p.text).join('\n');return '';}
function requestedLength(configured,question=''){
 const text=String(question);
 if(/(?:ตอบ|ขอ|สรุป|เอาแบบ)\s*(?:ให้)?\s*สั้น|ไม่ต้อง(?:ตอบ|อธิบาย)?\s*(?:ยาว|ละเอียด)|สรุป(?:สั้น|ใจความ)|brief(?:ly)?|concise/i.test(text))return 'short';
 if(/(?:อธิบาย|ตอบ|ขยายความ|ขอรายละเอียด|สอน)(?:ให้|แบบ|อย่าง|เป็น|เพิ่ม|อีก|ฉัน|ผม|เรา|คุณ|ทีละ|\s)*(?:ละเอียด|ทีละขั้นตอน|step.by.step)|ขอรายละเอียด|in detail|step.by.step/i.test(text))return 'detailed';
 return normalizeLength(configured);
}
function lengthRule(mode){
 if(mode==='detailed')return 'ความยาวคำตอบ: ละเอียด อธิบายเหตุผล หลักฐาน และขั้นตอนที่จำเป็นให้ทำตามได้ ตอบให้ครบตามคำถาม ไม่ยืดด้วยคำเกริ่น มุก หรือเรื่องเก่าที่ไม่เกี่ยวข้อง';
 if(mode==='balanced')return 'ความยาวคำตอบ: สมดุล เอาคำตอบหลักขึ้นก่อน แล้วอธิบายเฉพาะเหตุผลสำคัญ โดยทั่วไป 3–6 ประโยคหรือรายการสั้น ๆ ไม่เกริ่นหรือเล่นมุกซ้ำ';
 return 'ความยาวคำตอบ: สรุปสั้น ตอบใจความหลักทันที โดยทั่วไป 1–3 ประโยคสั้น ๆ ไม่เกินประมาณ 400 ตัวอักษร ไม่ทวนคำถาม ไม่เกริ่น ไม่แซวหรือพูดติดตลกยาว หากข้อมูลขาดให้ถามเพียงจุดที่จำเป็น คงผลลัพธ์และข้อจำกัดสำคัญ อย่าแต่งว่าทำสำเร็จ ห้ามใช้การตัดข้อความกลางประโยค';
}
function responseMessages(messages,configured='short',{question}={}){
 const out=messages.map(m=>({...m}));const text=question??userText([...out].reverse().find(m=>m.role==='user'));
 const mode=requestedLength(configured,text);
 const rule=ACCURACY+'\n'+lengthRule(mode)+'\nข้อยกเว้น: ห้ามย่อหรือตัด JSON คำสั่งเครื่องมือ โค้ด สูตร ตัวเลข URL หรือข้อมูลที่ผู้ใช้ขอให้คงครบ สำหรับ Agent จำกัดความยาวเฉพาะ summary ของ finish ไม่ใช่เครื่องมือหรือแผนงาน คำขอรายละเอียดในรอบนี้มีความสำคัญกว่าค่าความยาวเริ่มต้น';
 if(out[0]?.role==='system'&&typeof out[0].content==='string')out[0].content+='\n'+rule;else out.unshift({role:'system',content:rule});return out;
}
function responseLengthMenu(configured,onSelect,lang='th'){const current=normalizeLength(configured);return{id:'caprii-response-length',label:lang==='en'?'Reply / speech length':'ความยาวคำตอบ / คำพูด',submenu:[['short','สรุปสั้น — 1–3 ประโยค'],['balanced','สมดุล — อธิบายเท่าที่จำเป็น'],['detailed','ละเอียด — เหตุผลและขั้นตอน']].map(([value,label])=>({id:'caprii-length-'+value,label:lang==='en'?({short:'Short — 1–3 sentences',balanced:'Balanced — essential explanation',detailed:'Detailed — reasoning and steps'}[value]):label,type:'radio',checked:current===value,click:()=>onSelect(value)}))};}
module.exports={MODES,ACCURACY,normalizeLength,requestedLength,responseMessages,responseLengthMenu,userText};
