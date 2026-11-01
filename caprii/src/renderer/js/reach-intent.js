// Public links/search route to actual evidence tools, not an invented summary.
export function reachIntent(text){
 if(typeof text!=='string'||/^(?:อย่า|ห้าม|ไม่ต้อง|don't|do not)\s*(?:อ่าน|สรุป|ค้นหา|ดู|read|summarize|search)/i.test(text.trim()))return null;
 const url=text.match(/https?:\/\/[^\s<>]+/i)?.[0];
 if(url&&(/^(?:https?:\/\/\S+)[.!?]?$/i.test(text.trim())||/อ่าน|สรุป|วิเคราะห์|คำบรรยาย|คลิป|วิดีโอ|read|summari[sz]e|analy[sz]e|transcript/i.test(text)))return`ใช้ Agent Reach อ่านลิงก์สาธารณะนี้จริง: ${url}\nหากเป็น YouTube ให้อ่านข้อมูลและคำบรรยายก่อนสรุป แยกคำบรรยายออกจากคำอธิบายคลิป ไม่อ้างว่าได้ดูวิดีโอหากมีแค่ข้อมูล หากติดเครือข่าย/ไม่มีคำบรรยายให้บอกตรง ๆ ไม่เปิดหน้าติดตามงาน\nคำสั่งผู้ใช้: ${text}`;
 if(/^(?:ช่วย\s*)?(?:ค้นหา(?:ใน)?เว็บ|ค้นข้อมูล(?:ในเว็บ)?|ค้นหา(?:ใน)?ยูทู[ปบ]|search (?:the )?web|search youtube)\s*\S/i.test(text.trim()))return`ใช้ reach.search ค้นข้อมูลสาธารณะและสรุปจากผลจริง พร้อมลิงก์อ้างอิง ไม่แต่งข้อมูล\nคำสั่งผู้ใช้: ${text}`;
 return null;
}
