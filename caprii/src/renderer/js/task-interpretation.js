// Only ambiguous task-like messages need another model request. Clear existing routes stay fast.
export function needsInterpretation(text){
 if(typeof text!=='string')return false;
 const t=text.trim();
 if(/^(?:อย่า|ห้าม|ไม่ต้อง|do not|don't)\s*/i.test(t)||/^(?:(?:ช่วย|กรุณา)\s*)?(?:สอน|อธิบาย|ยกตัวอย่าง)|คืออะไร|ทำอะไรได้|ทำได้ไหม|มี.*ไหม|\b(?:what is|what can|how to|explain)\b/i.test(t))return false;
 return /ช่วย|จัดการ|ทำต่อ|ต่อเลย|อันนี้|ตรงนี้|หน้านี้|ช่องนี้|ปุ่มนี้|เอา.*(?:ใส่|ลง)|(?:อยาก|ต้องการ)ให้|รบกวน|ลอง.*ให้|\b(?:please|could you|can you|do it|continue|put|select|check|fix|help me)\b/i.test(t);
}
