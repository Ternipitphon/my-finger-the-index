// Routing is local and explicit; no screenshot is taken before the normal permission flow.
const screen = /(?:หน้าจอ|ดูจอ|มองจอ|อ่านจอ|บนจอ|บนหน้า(?:เว็บ|นี้)?|หน้าเว็บ|ที่เปิดอยู่|แท็บ(?:นี้|ที่เปิด)?|screen|\btab\b)/i;
const view = /(?:ดู|มอง|อ่าน|เห็น|ตรวจ|look|see|read|inspect)/i;
const act = /(?:พิมพ์|กรอก|คลิก|กดส่ง|ส่งคำตอบ|ใส่คำตอบ|เติมคำตอบ|คำนวณ|หาคำตอบ|คิดคำตอบ|แก้ข้อนี้|ทำโจท(?:ย์|ย)?|โจท(?:ย์|ย)?|ทำข้อ|ข้อนี้.*ตอบ|ตอบ.*ข้อนี้|type|fill|click|submit)/i;
const denied = /(?:อย่า|ห้าม|ไม่ต้อง|ไม่อนุญาต)\s*(?:ให้\s*)?(?:ดู|มอง|อ่าน|จับภาพ|แคป|ส่งภาพ|ทำ|แก้|คำนวณ|พิมพ์|กรอก|คลิก|กด|ตอบ)|(?:do not|don't)\s+(?:look|capture|share|solve|fill|click|type|submit)/i;
export function screenIntent(text) {
  if (typeof text !== 'string' || denied.test(text) || !screen.test(text)) return null;
  return act.test(text) ? 'agent' : view.test(text) ? 'look' : null;
}
