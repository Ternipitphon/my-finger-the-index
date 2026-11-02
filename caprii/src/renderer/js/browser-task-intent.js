// Browser commands go to tools before chat. A prohibition on writing is not a prohibition on reading.
export function browserTaskIntent(text){
 if(typeof text!=='string'||/^(?:ช่วย|กรุณา)?\s*(?:สอน|อธิบาย|สร้าง|ออกแบบ|ยกตัวอย่าง|เขียน(?:โค้ด|โปรแกรม|เว็บ))|ตัวอย่างคำสั่ง|คืออะไร|วิธี(?:การ)?กรอก|how (?:to|do)/i.test(text))return null;
 // An explicit public URL without selected-tab/form instructions remains a public-web read.
 if(/https?:\/\//i.test(text)&&!/แท็บ|ที่เชื่อม|ฟอร์ม|ช่องชื่อ|ติ๊ก/.test(text))return null;
 const tab=/แท็บ|หน้าเว็บ|เบราว์เซอร์|browser|\btab\b/i.test(text);
 const read=/อ่าน|ตรวจ|บอกค่า|ค่าปัจจุบัน|ดูค่า|read|inspect/i.test(text);
 const noRead=/(?:ห้าม|อย่า|ไม่ต้อง|ไม่อนุญาต)\s*(?:ให้)?\s*(?:อ่าน|ดู|ตรวจ|มอง)|(?:do not|don't)\s+(?:read|look|inspect)/i.test(text);
 if(tab&&read&&noRead)return null;
 if(tab&&read){
  const noInput=/(?:ห้าม|อย่า|ไม่ต้อง)\s*(?:ให้)?\s*(?:กรอก|พิมพ์|ใส่)|(?:do not|don't)\s+(?:fill|type)/i.test(text);
  const writes=!noInput&&/กรอก|พิมพ์|ใส่|ติ๊ก|เลือก.*(?:ประเทศ|ตัวเลือก)/.test(text.replace(/(?:ยัง)?(?:ไม่ต้อง|ห้าม|อย่า)[^,\n]*(?:$|[,\n])/g,''));
  if(!writes)return{scope:'selected-tab',goal:'อ่านแท็บที่เชื่อมต่อด้วย browser.read แล้วรายงานค่าปัจจุบันจาก DOM จริง หากยังไม่เชื่อมแท็บให้รายงานข้อผิดพลาด ห้ามอ้างว่าไม่มีเครื่องมือโดยไม่เรียกใช้งาน อย่ากรอกข้อมูลและอย่ากดส่ง\nคำสั่งผู้ใช้: '+text};
 }
 if(/(?:Notepad|Explorer|โปรแกรม|หน้าต่าง)/i.test(text)&&!tab)return null;
 const form=/ช่อง(?:ชื่อ|อีเมล|เมล|ข้อมูล|นั้น|นี้)|ฟอร์ม|ติ๊ก.*ยอมรับ|dropdown/i.test(text);
 const noInput=/(?:ห้าม|อย่า|ไม่ต้อง)\s*(?:ให้)?\s*(?:กรอก|พิมพ์|ใส่)/.test(text);
 if(form&&!noInput&&/กรอก|ใส่|พิมพ์|ติ๊ก|เลือก/.test(text)){
  const submit=/ส่งให้|ส่งเลย|กดส่ง|ส่งข้อมูล|ส่งฟอร์ม|submit/i.test(text)&&!/(?:ห้าม|อย่า|ไม่ต้อง)\s*(?:กรอกหรือ)?\s*(?:กด)?ส่ง/.test(text);
  return{scope:'selected-tab',goal:'อ่านแท็บที่เชื่อมต่อก่อน กรอกข้อมูลตามคำสั่งด้วยเครื่องมือจริง ตรวจค่าทุกช่องที่กรอกด้วย browser.expect_value '+(submit?'แล้วกดส่งและตรวจผลตอบกลับใหม่จาก DOM':'อย่ากดส่ง')+' หากเครื่องมืออ่านหรือกรอกไม่ได้ให้แจ้งข้อผิดพลาดจริง ไม่อ้างว่าทำแล้ว\nคำสั่งผู้ใช้: '+text};
 }
 return null;
}
