'use strict';
const RULE='ตอบคำอธิบายและบทพูดทั้งหมดเป็นภาษาไทยเสมอ แม้ผู้ใช้พิมพ์ภาษาอื่น ใช้เลขอารบิก คงชื่อโปรแกรม โค้ด URL ชื่อไฟล์ และ JSON tool keys ตามจริง ห้ามแปลคำสั่งเครื่องมือจนใช้งานไม่ได้';
function thaiMessages(messages){const out=messages.map(m=>({...m}));if(out[0]?.role==='system'&&typeof out[0].content==='string')out[0]={...out[0],content:out[0].content+'\n'+RULE};else out.unshift({role:'system',content:RULE});return out;}
function needsThai(text){
 if(/[\u0e00-\u0e7f]/.test(text))return false;
 const prose=text.replace(/```[\s\S]*?```/g,'').replace(/`[^`]*`/g,'').replace(/https?:\/\/\S+/g,'').replace(/\b(?:Caprii?|Claude(?: Code)?|Codex|Gemini|Ollama|YouTube|Chrome|Windows|Fastmath|API|JSON)\b/gi,'').trim();
 return /[a-z]/i.test(prose);
}
async function thaiResponse({request,messages}){
 let text=await request(thaiMessages(messages));let action;
 try{action=JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{}
 if(action&&typeof action==='object'){
  if(action.tool!=='finish'||!needsThai(String(action.summary||'')))return text;
  const summary=await request([{role:'system',content:RULE+'\nเรียบเรียงสรุปนี้เป็นภาษาไทย ห้ามเปลี่ยนข้อเท็จจริง ตอบเฉพาะข้อความสรุป ไม่ใช่ JSON'},{role:'user',content:action.summary}]);
  if(needsThai(summary))throw Object.assign(Error('โมเดลยังตอบภาษาไทยไม่สำเร็จ กรุณาลองใหม่'),{code:'language'});
  return JSON.stringify({...action,summary});
 }
 if(/^[\[{]/.test(text.trim())||!needsThai(text))return text;
 text=await request([...thaiMessages(messages),{role:'assistant',content:text},{role:'user',content:'กรุณาเรียบเรียงคำตอบล่าสุดเป็นภาษาไทย รักษาข้อเท็จจริง โค้ด และตัวเลข ห้ามเพิ่มสิ่งที่ยังไม่ได้ทำ'}]);
 if(needsThai(text))throw Object.assign(Error('โมเดลยังตอบภาษาไทยไม่สำเร็จ กรุณาลองใหม่'),{code:'language'});
 return text;
}
module.exports={thaiMessages,thaiResponse,needsThai,RULE};
