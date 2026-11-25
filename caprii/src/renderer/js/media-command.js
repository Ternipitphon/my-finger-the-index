// Common media instructions are deterministic; library contents stay in the selected browser tab.
const YT=/youtube|ยูทู[ปบ]/i,SP=/spotify|สปอ[ตท]ิฟ(?:าย|ายด์|าย์|ายน์|ไฟ)/i;
const clean=s=>String(s||'').trim().replace(/^["“”']|["“”']$/g,'').trim();
const polite=s=>clean(s).replace(/\s*(?:ให้(?:ผม|ฉัน)?(?:หน่อย|ที)|หน่อย|ครับ|ค่ะ|ด้วยนะ|ทีนะ|please)[.!\s]*$/i,'').trim();
export function mediaCommand(text,previous=null){
 if(typeof text!=='string')return null;
 let t=text.trim().replace(/^(?:ช่วย|กรุณา|please)\s*/i,'');
 if(/^(?:อย่า|ห้าม|ไม่ต้อง|do not|don't)\s*/i.test(t)||/^(?:สอน|อธิบาย|ทำไม|ผมบอก|ฉันบอก|how to|why)/i.test(t))return null;
 const control=/^(?:กด)?(?:หยุด(?:เพลง|เล่น)?|พักเพลง|pause|stop)(?:\s*(?:ใน|บน|on)?\s*(?:spotify|สปอติฟาย))?(?:\s*(?:หน่อย|ครับ|ค่ะ))?$/i.test(t)?'pause':/^(?:กด)?(?:ข้าม(?:เพลง)?|เพลงถัดไป|เพลงต่อไป|next(?: song| track)?)(?:\s*(?:ใน|บน|on)?\s*(?:spotify|สปอติฟาย))?(?:\s*(?:หน่อย|ครับ|ค่ะ))?$/i.test(t)?'next':/^(?:เพลงก่อนหน้า|เพลงก่อน|previous(?: song| track)?)(?:\s*(?:ใน|บน|on)?\s*(?:spotify|สปอติฟาย))?$/i.test(t)?'previous':null;
 if(control&&(SP.test(t)||previous?.service==='spotify'))return{service:'spotify',action:control,collection:'current'};
 if(/^(?:เปิด(?:เว็บ)?|open(?:\s+(?:website|url))?)\s*https?:\/\//i.test(t))return null;
 if(previous?.awaiting==='artist'){
  const artist=polite(t.replace(/^(?:ของ|ศิลปิน|by)\s*/i,''));
  const named=/^(?:ของ|ศิลปิน|by)\s*/i.test(t)||(previous.choices||[]).some(c=>(c.artists||[]).some(a=>a.toLowerCase()===artist.toLowerCase()));
  if(named&&artist)return{service:'spotify',action:'play',collection:'track',query:previous.query,artist};
 }
 if(previous?.awaiting==='playlist'){
  const name=polite(t.replace(/^(?:ชื่อ|อันชื่อ)\s*/,''));
  const link=t.match(/^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]+$/i)?.[0];
  if(link)return{service:'spotify',action:'play',collection:'playlist',url:link};
  if((previous.choices||[]).some(c=>typeof c==='string'&&c.toLowerCase()===name.toLowerCase()))return{service:'spotify',action:'play',collection:'playlist',query:name};
 }
 if(/^(?:เล่นเลย|เปิดเลย|เล่นต่อ|ต่อเลย|เอาเลย|play it|resume)$/i.test(t)&&previous){if(previous.service==='spotify')return ['pause','next','previous'].includes(previous.action)?{service:'spotify',action:'play',collection:'current'}:previous.action==='search'?{service:'spotify',action:'play',collection:'track',query:previous.query}:{...previous};return{question:'ต้องการเปิดคลิปไหนในผลค้นหา YouTube ครับ?'};}
 if(!/^(?:เปิด|เล่น|กดเล่น|ค้นหา|หา|ไป|ช่วย|play|open|search|resume)/i.test(t))return null;
 const youtube=YT.test(t),spotify=SP.test(t);
 if(youtube){
  const search=/(?:ค้นหา(?:ว่า)?|ค้น(?:ว่า)?|เสิร์ช(?:ว่า)?|หา(?:คลิป|วิดีโอ)?|search(?:\s+for)?)\s*(.+)$/i.exec(t);
  let q=search?search[1].replace(/\s*(?:ใน|บน|ที่|on)\s*(?:youtube|ยูทู[ปบ])\s*$/i,''):'';
  q=polite(q);
  if(search)return q?{service:'youtube',action:'search',query:q,url:'https://www.youtube.com/results?search_query='+encodeURIComponent(q)}:{question:'ต้องการค้นหาอะไรใน YouTube ครับ?'};
  return null;
 }
 const likes=/liked\s*songs?|เพลง(?:ที่)?(?:กด)?(?:ถูกใจ|ชอบ|ไล[กค]์?)|เพลงโปรด|ไลค์(?:ซอง|เพลง)|เพลงที่ไลก์/i.test(t);
 const playlist=/play\s*list|เพลย์ลิสต์|เพลลิสต์|เพลย์ลิส|เพลลิส/i.test(t);
 const play=/(?:เล่น|เปิดเพลง|play|resume)/i.test(t)||((likes||playlist)&&/^เปิด/.test(t));
 if(!spotify&&!likes&&!playlist&&!/^(?:เล่นเพลง|เปิดเพลง|play\s+(?:song|track))/i.test(t))return null;
 if(!play){
  const search=/(?:ค้นหา(?:ว่า)?|หาเพลง|search(?:\s+for)?)\s*(.+)$/i.exec(t);
  if(search){const q=polite(search[1].replace(/\s*(?:ใน|บน|on)\s*spotify\s*$/i,''));return q?{service:'spotify',action:'search',query:q,url:'https://open.spotify.com/search/'+encodeURIComponent(q)}:{question:'ต้องการค้นหาเพลงอะไรครับ?'};}
  return null;
 }
 const base={service:'spotify',action:'play'};
 if(likes)return{...base,collection:'liked'};
 if(playlist){
  const link=t.match(/https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]+/i)?.[0];
  const match=/(?:play\s*list|เพลย์ลิสต์|เพลลิสต์|เพลย์ลิส|เพลลิส)\s*(?:ชื่อ|ที่ชื่อ)?\s*(.*)$/i.exec(t);
  const q=polite((match?.[1]||'').replace(/\s*(?:ใน|บน|on)\s*(?:spotify|สปอติฟาย)\s*$/i,'')).replace(/^(?:ของ(?:ผม|ฉัน)|นี้|เดิม|ที่เปิดอยู่|ปัจจุบัน)$/,'').trim();
  return{...base,collection:'playlist',...(link?{url:link}:q?{query:clean(q)}:{})};
 }
 let q=t.replace(/^open\s+spotify\s+(?:(?:and|then)\s+)*/i,'').replace(/^(?:เปิด\s*(?:spotify|สปอติฟาย)\s*(?:แล้ว(?:ก็)?\s*)?)?(?:กด)?(?:เล่น|เปิด|play)\s*(?:เพลง|song|track)?\s*(?:ชื่อ|ที่ชื่อ)?\s*/i,'').replace(/\s*(?:ใน|บน|จาก|on)\s*(?:spotify|สปอติฟาย)\s*$/i,'');
 q=polite(q);
 if(!q||/^(?:เพลง|ต่อ|เพลงต่อ|spotify|สปอติฟาย)$/i.test(q))return{...base,collection:'current'};
 const by=/^(.*?)\s+(?:ของ|by)\s+(.+)$/i.exec(q);
 return{...base,collection:'track',query:clean(by?by[1]:q),...(by?{artist:clean(by[2])}:{})};
}
