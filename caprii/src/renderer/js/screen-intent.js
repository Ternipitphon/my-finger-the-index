// Routing is local and explicit; no screenshot is taken before the normal permission flow.
const screen = /(?:หน้าจอ|ดูจอ|มองจอ|อ่านจอ|บนจอ|screen)/i;
const view = /(?:ดู|มอง|อ่าน|เห็น|ตรวจ|look|see|read|inspect)/i;
const act = /(?:พิมพ์|กรอก|คลิก|กดส่ง|ส่งคำตอบ|ใส่คำตอบ|เติมคำตอบ|คำนวณ|ทำโจทย์|โจทย์|ข้อนี้.*ตอบ|ตอบ.*ข้อนี้|type|fill|click|submit)/i;
const denied = /(?:อย่า|ห้าม|ไม่ต้อง|ไม่อนุญาต)\s*(?:ดู|มอง|อ่าน|จับภาพ|แคป|ส่งภาพ)|(?:do not|don't)\s+(?:look|capture|share)/i;
export function screenIntent(text) {
  if (typeof text !== 'string' || denied.test(text) || !screen.test(text) || !view.test(text)) return null;
  return act.test(text) ? 'agent' : 'look';
}
