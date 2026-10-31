function normalized(text) { return text.trim().replace(/^(?:ผม|ฉัน|เรา)?(?:อยากให้|ต้องการให้)(?:คุณ|เธอ|แคปรี่|caprii?)?\s*/i, '').replace(/^(?:ช่วย|กรุณา)\s*/, ''); }
const siteAliases = [
  { names: /youtube|ยูทู[ปบ]/i, name: 'YouTube', url: 'https://www.youtube.com/' },
  { names: /google|กูเกิล|กูเกิ้ล/i, name: 'Google', url: 'https://www.google.com/' },
  { names: /facebook|เฟซบุ๊ก|เฟสบุ๊ค/i, name: 'Facebook', url: 'https://www.facebook.com/' },
];
export function siteCommand(text) {
  if (typeof text !== 'string') return null;
  const command = normalized(text);
  const match = /^(?:เปิด|เข้า(?:เว็บ(?:ไซต์)?)?|ไปที่|open|visit)\s*(.+?)(?:\s*(?:ให้หน่อย|หน่อย|ให้ที|ที|ด้วย|ครับ|ค่ะ|นะ))?[.!\s]*$/i.exec(command);
  if (!match || /แล้ว|จากนั้น|ค้นหา|search|and\s/i.test(match[1])) return null;
  const target=match[1].replace(/^(?:เว็บ(?:ไซต์)?|the\s+website)\s*/i,'');
  const site=siteAliases.find(s=>s.names.test(target));
  if(site && target.replace(site.names,'').replace(/(?:ให้หน่อย|หน่อย|ให้ที|ที|ด้วย|ครับ|ค่ะ|นะ|\s)/g,'')==='')return {name:site.name,url:site.url};
  try { const url=new URL(target); if(url.protocol==='https:'&&!url.username&&!url.password)return{name:url.hostname,url:url.href}; } catch {}
  return null;
}
export function refusedCommand(text) { return typeof text === 'string' && /^(?:(?:ช่วย|กรุณา)\s*)?(?:(?:อย่า|ห้าม|ไม่ต้อง|ไม่)\s*(?:เปิด|เข้า|คลิก|กด|ลาก|พิมพ์|กรอก|ดู|มอง)|(?:do not|don't)\s+(?:open|click|drag|type|fill|look))/i.test(normalized(text)); }
export function actionCommand(text) {
 if(typeof text!=='string'||refusedCommand(text))return false;
 if (/^(?:ข้อนี้|โจทย์นี้).*(?:ตอบ|ทำ|คำนวณ)/i.test(normalized(text))) return true;
 return /^(?:(?:ช่วย|กรุณา)\s*)?(?:ใช้เมาส์|เอาเมาส์|use the mouse|คลิก|ดับเบิลคลิก|คลิกขวา|ลาก|เลื่อน|ขยับเมาส์|ย้ายเมาส์|พิมพ์|กรอก|กด|เปิด|เข้าเว็บ|ค้นหาในเว็บ|คำนวณ|คิดเลข|แก้โจทย์|ทำโจทย์|calculate|solve|click|double.click|right.click|drag|scroll|type|fill|open)\s*/i.test(normalized(text));
}
