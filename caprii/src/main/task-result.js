'use strict';
function toolRequest(text){return typeof text==='string'&&!/^(?:ช่วย|กรุณา)?\s*(?:สอน|อธิบาย|สร้าง|ออกแบบ|ยกตัวอย่าง|เขียน(?:โค้ด|โปรแกรม|เว็บ))|ตัวอย่างคำสั่ง|คืออะไร|วิธี(?:การ)?กรอก|how to/i.test(text)&&(/(?:อ่าน|ตรวจ|บอกค่า|ค่าปัจจุบัน).*?(?:แท็บ|หน้าเว็บ|เบราว์เซอร์)|(?:ช่องชื่อ|ในช่อง|ลงช่อง|ใส่ชื่อ|^กรอก|ฟอร์ม|ติ๊ก.*ยอมรับ).*(?:ใส่|กรอก|พิมพ์|ติ๊ก|เลือก|หยอด|เติม)/i.test(text));}
function taskResultText(result,lang='th'){
 if(lang==='en'){
  const error=[...(result.audit||[])].reverse().find(e=>e.error)?.error;
  if(!result.verified)return "Task completion is not verified. "+(result.delivery?.inputDelivered?"Input was sent. ":"No confirmed input. ")+(result.delivery?.submitDelivered?"Submission was sent, but acknowledgment is not verified.":"No confirmed submission.")+(error?" Error: "+error:"");
  if(result.readOnly&&result.observedFields?.length)return "Actual tab values: "+result.observedFields.map(e=>(e.label||e.elementId||e.tag)+" = "+(typeof e.checked==='boolean'?(e.checked?"checked":"unchecked"):(e.value||"empty"))).join("; ")+"\nNo fields were filled or submitted.";
  if(result.readOnly&&typeof result.observedText==='string')return "Actual tab text: "+result.observedText.slice(0,800)+"\nNo fields were filled or submitted.";
  return result.summary;
 }
 const audit=result.audit||[],submits=!!result.delivery?.submitDelivered;
 if(!result.verified&&!result.readOnly&&!result.requirements?.input&&!result.requirements?.submit&&!toolRequest(result.goal||'')){const error=[...audit].reverse().find(e=>e.error)?.error;return 'ยังไม่ยืนยันว่างานสำเร็จ'+(error?' — '+error:' — ยังไม่มีผลตรวจที่เพียงพอ');}
 if(!result.verified){const error=[...audit].reverse().find(x=>x.error)?.error;return 'ยังไม่ยืนยันว่างานสำเร็จ — '+(result.delivery?.inputDelivered?'มีคำสั่งกรอกหรือเลือกข้อมูลที่ส่งไปแล้ว':'ยังไม่มีหลักฐานว่ากรอกข้อมูลแล้ว')+'; '+(submits?'มีคำสั่งส่งแล้ว แต่ยังไม่ยืนยันผลตอบรับ':'ยังไม่มีหลักฐานว่ากดส่งแล้ว')+(error?'\nข้อผิดพลาดจริง: '+error:'');}
 if(result.readOnly&&result.observedFields?.length){return 'ค่าที่อ่านจากแท็บจริง: '+result.observedFields.map(e=>(e.label||e.elementId||e.tag)+' = '+(typeof e.checked==='boolean'?(e.checked?'เลือกแล้ว':'ยังไม่เลือก'):(e.value||'ว่าง'))).join('; ')+'\nยังไม่ได้กรอกหรือกดส่ง';}
 if(result.readOnly&&typeof result.observedText==='string')return 'อ่านข้อความจากแท็บจริง: '+String(result.observedText||'ไม่พบข้อความ').slice(0,800)+'\nยังไม่ได้กรอกหรือกดส่ง';
 return result.summary;
}
module.exports={toolRequest,taskResultText};
