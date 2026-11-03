function normalized(text) { return text.trim().replace(/^(?:ผม|ฉัน|เรา)?(?:อยากให้|ต้องการให้)(?:คุณ|เธอ|แคปรี่|caprii?)?\s*/i, '').replace(/^(?:ช่วย|กรุณา|please)\s*/i, ''); }
// Canonical web destinations, shared by direct commands and the older chat actions.
export const WEBSITE_URLS = {
 youtube:'https://www.youtube.com/', google:'https://www.google.com/', facebook:'https://www.facebook.com/',
 spotify:'https://open.spotify.com/', gmail:'https://mail.google.com/', twitch:'https://www.twitch.tv/',
 netflix:'https://www.netflix.com/', reddit:'https://www.reddit.com/', twitter:'https://x.com/', x:'https://x.com/',
 instagram:'https://www.instagram.com/', tiktok:'https://www.tiktok.com/', github:'https://github.com/',
 chatgpt:'https://chatgpt.com/', wikipedia:'https://www.wikipedia.org/', linkedin:'https://www.linkedin.com/',
 pinterest:'https://www.pinterest.com/', crunchyroll:'https://www.crunchyroll.com/', outlook:'https://outlook.live.com/',
 whatsapp:'https://web.whatsapp.com/', discord:'https://discord.com/app', soundcloud:'https://soundcloud.com/',
 deezer:'https://www.deezer.com/', gemini:'https://gemini.google.com/', claude:'https://claude.ai/',
 notion:'https://www.notion.so/', canva:'https://www.canva.com/', drive:'https://drive.google.com/',
 'google drive':'https://drive.google.com/', 'google maps':'https://maps.google.com/', maps:'https://maps.google.com/'
};
const WEB_PREFIX=/^(?:(?:เว็บ(?:ไซต์)?|เว็ป(?:ไซต์)?)\s*|(?:the\s+)?(?:website|web site|site)\s+)/i;
const aliases={ยูทูป:'youtube',ยูทูบ:'youtube',กูเกิล:'google',กูเกิ้ล:'google',เฟซบุ๊ก:'facebook',เฟสบุ๊ค:'facebook',เฟซบุ๊ค:'facebook',สปอติฟาย:'spotify',สปอติฟายด์:'spotify',สปอติฟาย์:'spotify',สปอติฟายน์:'spotify',สปอติไฟ:'spotify',เน็ตฟลิกซ์:'netflix',เน็ตฟลิก:'netflix',ดิสคอร์ด:'discord',ทวิตเตอร์:'twitter',อินสตาแกรม:'instagram',ติ๊กต็อก:'tiktok',ติ๊กต๊อก:'tiktok',จีเมล:'gmail'};
function addressUrl(target){
 try{const explicit=/^[a-z][a-z0-9+.-]*:/i.test(target);const url=new URL(explicit?target:'https://'+target);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.')||/[\s\\]/.test(target))return null;return url;}catch{return null;}
}
export function siteCommand(text) {
 if(typeof text!=='string')return null;
 const command=normalized(text);
 const match=/^(?:เปิด|เข้า(?:เว็บ(?:ไซต์)?)?|ไปที่|open|visit)\s*(.+)$/i.exec(command);
 if(!match)return null;
 let target=match[1].trim();
 const explicitWeb=WEB_PREFIX.test(target)||/^เข้าเว็บ/i.test(command);
 target=target.replace(WEB_PREFIX,'').trim();
 // A supplied URL is preserved; friendly suffixes are removed only outside its address.
 const address=addressUrl(target)||addressUrl(target.replace(/\s+(?:ให้หน่อย|หน่อย|ให้ที|ที|ด้วย|ครับ|ค่ะ|นะ|please)[.!]*$/i,''));
 if(address)return{name:address.hostname,url:address.href};
 if(/แล้ว|จากนั้น|ค้นหา|\bsearch\b|\band\b/i.test(target))return null;
 if(!explicitWeb&&(/^(?:(?:แอป(?:พลิเคชัน)?|แอพ|โปรแกรม)\s*|(?:desktop\s+)?app(?:lication)?\s+)/i.test(target)||/\b(?:desktop\s+)?app(?:lication)?$|แบบแอ[ปพ]|ในแอ[ปพ]/i.test(target)))return null;
 const name=target.replace(/(?:ในเว็บ|บนเว็บ|แบบเว็บ|ในเบราว์เซอร์|บนเบราว์เซอร์|\s+in (?:the )?(?:web )?browser)\s*/i,'').replace(/(?:ให้หน่อย|หน่อย|ให้ที|ที|ด้วย|ครับ|ค่ะ|นะ|please|[.!?\s])+$/gi,'').trim().toLowerCase();
 const key=aliases[name]||name;
 if(WEBSITE_URLS[key])return{name:key==='spotify'?'Spotify':key==='youtube'?'YouTube':name,url:WEBSITE_URLS[key]};
 if(explicitWeb)return{question:'ขอลิงก์หรือโดเมนของเว็บไซต์ที่ต้องการเปิด เช่น https://example.com เพื่อเปิดในเบราว์เซอร์ให้ตรงเว็บ'};
 return null;
}
export function refusedCommand(text) { return typeof text === 'string' && /^(?:(?:ช่วย|กรุณา)\s*)?(?:(?:อย่า|ห้าม|ไม่ต้อง|ไม่)\s*(?:เปิด|เข้า|คลิก|กด|ลาก|พิมพ์|กรอก|ดู|มอง|ทำ|แก้|คำนวณ|ตอบ)|(?:do not|don't)\s+(?:open|click|drag|type|fill|look|solve|calculate))/i.test(normalized(text)); }
export function actionCommand(text) {
 if(typeof text!=='string'||refusedCommand(text))return false;
 if (/^(?:ข้อนี้|โจทย์นี้).*(?:ตอบ|ทำ|คำนวณ)/i.test(normalized(text))) return true;
 return /^(?:(?:ช่วย|กรุณา)\s*)?(?:ใช้เมาส์|เอาเมาส์|use the mouse|คลิก|ดับเบิลคลิก|คลิกขวา|ลาก|เลื่อน|ขยับเมาส์|ย้ายเมาส์|พิมพ์|กรอก|กด|เปิด|เข้าเว็บ|ค้นหาไฟล์|หาไฟล์|ค้นหาโปรแกรม|เปิดเกม|เล่นเกม|ค้นหาในเว็บ|คำนวณ|คิดเลข|แก้โจท(?:ย์|ย)?|ทำโจท(?:ย์|ย)?|calculate|solve|click|double.click|right.click|drag|scroll|type|fill|open)\s*/i.test(normalized(text));
}

// Uses only the current chat's previous user instruction, never stored task evidence.
export function resolveTaskCommand(text,previous='') {
 if(typeof text!=='string'||refusedCommand(text))return null;
 const command=normalized(text).replace(/[.!?\s]+$/,'');
 // A deictic answer question requests observation/calculation, not permission to fill or submit.
 const positive=text.replace(/(?:ยัง)?(?:ไม่ต้อง|ห้าม|อย่า)\s*(?:ให้)?\s*(?:กรอก|พิมพ์|ใส่|เติม|กดส่ง|ส่ง)[^,\n]*/g,'');
 const asksToAct=/กรอก|พิมพ์|ใส่|เติม|หยอด|ติ๊ก|กดแป้น|ส่งเลย|ส่งให้|กดส่ง/.test(positive);
 const answerHere=/^(?:(?:ช่วย)?ตอบ(?:โจทย์|ข้อ)(?:ข้อ)?นี้|(?:ข้อ|อัน|โจทย์|โจทย์ข้อ)นี้.*(?:ตอบ(?:อะไร|เท่าไหร่|เท่าไร|ยังไง)|คำตอบ|ได้เท่าไหร่|ได้เท่าไร))/i.test(command);
 if(answerHere&&/(?:ไม่ต้อง|อย่า|ห้าม)\s*(?:ดู|มอง|อ่าน|จับภาพ)/.test(command))return{question:'คุณระบุไม่ให้ดูโจทย์บนจอ กรุณาพิมพ์โจทย์หรือแนบรูปที่ต้องการให้ใช้แทน'};
 if(answerHere&&!asksToAct)return{goal:`อ่านโจทย์ปัจจุบันจากแท็บที่ผู้ใช้เชื่อม หรือจับภาพหน้าจอจริงผ่านเครื่องมือหลังอนุญาต อ่านตัวเลขและเงื่อนไขก่อน คำนวณและตรวจคำตอบด้วยเครื่องมือเมื่อเป็นโจทย์ตัวเลข หากเป็นคำถามข้อความให้ยึดเนื้อหาที่อ่านได้ ถ้าอ่านไม่ชัดให้ระบุจุดที่ไม่ชัด อย่ากรอกคำตอบและอย่ากดส่งคำตอบ สรุปคำตอบหลักก่อนตามความยาวที่ตั้งไว้\nคำสั่งผู้ใช้: ${text}`};
 const shortDo=/^(?:ทำ|แก้|คิด)(?:โจท(?:ย์|ย)?|ข้อ)(?:ข้อ)?(?:นี้|ที่เห็น|บนหน้า|บนจอ|ในแท็บ)/i.test(command);
 if(shortDo){
  if(/ยังไง|อย่างไร|วิธี|สอน|อธิบาย/.test(command))return{goal:`อ่านโจทย์ปัจจุบันบนหน้าจอหรือแท็บที่เชื่อม แล้วคำนวณและอธิบาย อย่ากรอกคำตอบและอย่ากดส่งคำตอบ\nคำสั่งผู้ใช้: ${text}`};
  const wantsInput=!/(?:ไม่ต้อง|อย่า|ห้าม)\s*(?:กรอก|พิมพ์|ใส่คำตอบ)/.test(command)&&(/^(?:ทำ|แก้)/.test(command)||/กรอก|พิมพ์|ใส่คำตอบ/.test(command));
  const submit=/(?:กดส่ง|ส่งคำตอบ|ส่งเลย|ส่งด้วย)/.test(command)&&!/(?:ไม่ต้อง|อย่า|ห้าม)\s*(?:กด)?ส่ง/.test(command);
  return{goal:`อ่านโจทย์ปัจจุบันบนหน้าจอหรือแท็บที่เชื่อมใหม่ คำนวณ${wantsInput?'และกรอกคำตอบ':' อย่ากรอกคำตอบ'} ${submit?'แล้วกดส่งคำตอบ':'อย่ากดส่งคำตอบ'}\nคำสั่งผู้ใช้: ${text}`};
 }
 const follow=/^(?:ทำต่อ|ไปต่อ|ทำให้หน่อย|จัดการให้หน่อย|ทำให้เลย|เอาเลย|กรอกเลย|พิมพ์เลย|ส่ง(?:เลย|ให้หน่อย|ให้ด้วย|ด้วย|ที|หน่อย)?|กดส่ง(?:เลย|ให้หน่อย|หน่อย|ที)?|ทำ(?:ให้)?แล้วส่ง(?:ให้)?ด้วย|ทำให้แล้วส่งเลย)(?:นะ|ครับ|ค่ะ|ให้หน่อย|หน่อย|ด้วย)*$/i.test(command);
 if(!follow)return null;
 if(!previous||refusedCommand(previous)||siteCommand(previous)||!actionCommand(previous))return{question:'ต้องการให้ทำอะไรบนหน้าเว็บหรือหน้าจอครับ เช่น ทำโจทย์ กรอกข้อมูล หรือกดส่ง'};
 const submit=/ส่ง/.test(command),input=/กรอก|พิมพ์/.test(command);
 const resume=/(?:กรอก|พิมพ์|(?:ทำ|แก้|คิด)(?:โจท|ข้อ))/.test(previous)?'อ่านโจทย์ปัจจุบันและคำนวณแล้วกรอกคำตอบ '+(/กดส่ง|ส่งคำตอบ|ส่งเลย/.test(previous)&&!/(?:ไม่ต้อง|อย่า|ห้าม).*ส่ง/.test(previous)?'แล้วกดส่งคำตอบ':'อย่ากดส่งคำตอบ'):previous;
 return{goal:`ตรวจหน้าจอหรือแท็บปัจจุบันใหม่ก่อนลงมือ ห้ามใช้ค่าหรือคำตอบเก่าหากโจทย์เปลี่ยน\nบริบทคำสั่งผู้ใช้ก่อนหน้า: ${previous}\nคำสั่งตอนนี้: ${submit?'ตรวจคำตอบปัจจุบันแล้วกดส่งคำตอบ':input?'ตรวจคำตอบแล้วกรอกคำตอบ':resume}\nคำสั่งผู้ใช้: ${text}`};
}
