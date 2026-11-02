'use strict';
const RULE='ใช้ถ้อยคำสุภาพ ห้ามใช้คำดูถูกหรือคำเหยียดเรียกผู้ใช้ ยึดคำถามล่าสุดและหลักฐานล่าสุด ไม่กล่าวถึงงานเก่าหรือโปรแกรมเก่าที่ไม่เกี่ยวข้อง ตอบคำอธิบายและบทพูดทั้งหมดเป็นภาษาไทยเสมอ แม้ผู้ใช้พิมพ์ภาษาอื่น ใช้เลขอารบิก คงชื่อโปรแกรม โค้ด URL ชื่อไฟล์ และ JSON tool keys ตามจริง ห้ามแปลคำสั่งเครื่องมือจนใช้งานไม่ได้';
function thaiMessages(messages){const out=messages.map(m=>({...m}));if(out[0]?.role==='system'&&typeof out[0].content==='string')out[0]={...out[0],content:out[0].content+'\n'+RULE};else out.unshift({role:'system',content:RULE});return out;}
function needsThai(text){
 if(/[\u0e00-\u0e7f]/.test(text))return false;
 const prose=text.replace(/```[\s\S]*?```/g,'').replace(/`[^`]*`/g,'').replace(/https?:\/\/\S+/g,'').replace(/\b(?:Caprii?|Claude(?: Code)?|Codex|Gemini|Ollama|YouTube|Chrome|Windows|Fastmath|API|JSON)\b/gi,'').trim();
 return /[a-z]/i.test(prose);
}
function disrespectful(text){return /\bnigg(?:a|er)s?\b|ไอ้โง่|โง่ชิบหาย|(?:^|[\s.,!?])(?:มึง|กู|สัส)(?:$|[\s.,!?])/i.test(text);}
function checkReply(text){if(needsThai(text))throw Object.assign(Error('โมเดลยังตอบภาษาไทยไม่สำเร็จ กรุณาลองใหม่'),{code:'language'});if(disrespectful(text))throw Object.assign(Error('คำตอบมีถ้อยคำไม่เหมาะสม จึงไม่แสดง กรุณาลองใหม่'),{code:'response_style'});}
async function thaiResponse({request,messages,lang='th'}){
 if(lang==='en')return englishResponse({request,messages});
 let text=await request(thaiMessages(messages));let action;
 try{action=JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{}
 if(action&&typeof action==='object'){
  if(action.tool!=='finish'||(!needsThai(String(action.summary||''))&&!disrespectful(String(action.summary||''))))return text;
  const summary=await request([{role:'system',content:RULE+'\nเรียบเรียงสรุปนี้เป็นภาษาไทย ห้ามเปลี่ยนข้อเท็จจริง ตอบเฉพาะข้อความสรุป ไม่ใช่ JSON'},{role:'user',content:action.summary}]);
  checkReply(summary);
  return JSON.stringify({...action,summary});
 }
 if(/^[\[{]/.test(text.trim())||(!needsThai(text)&&!disrespectful(text)))return text;
 text=await request([...thaiMessages(messages),{role:'assistant',content:text},{role:'user',content:'กรุณาเรียบเรียงคำตอบล่าสุดเป็นภาษาไทยที่สุภาพ ห้ามใช้คำดูถูกหรือคำเหยียดเรียกผู้ใช้ ตอบเฉพาะคำถามล่าสุด รักษาข้อเท็จจริง โค้ด และตัวเลข ห้ามเพิ่มสิ่งที่ยังไม่ได้ทำ'}]);
 checkReply(text);
 return text;
}
async function englishResponse({request,messages}){
 const rule='Use English as the selected primary language. Be respectful. Preserve facts, numbers, code, URLs and tool JSON keys. Never claim unperformed actions or unseen images.';
 const prepared=messages.map(m=>({...m}));
 if(prepared[0]?.role==='system'&&typeof prepared[0].content==='string')prepared[0].content+='\n'+rule;else prepared.unshift({role:'system',content:rule});
 let text=await request(prepared);let action;try{action=JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{}
 if(action&&typeof action==='object'&&action.tool!=='finish')return text;
 if(!action&&/^[\[{]/.test(text.trim()))return text;
 const prose=action?String(action.summary||''):text;
 if(!/[\u0e00-\u0e7f]/.test(prose)&&!disrespectful(prose))return text;
 const fixed=await request([{role:'system',content:rule+' Rewrite the supplied summary in English only; preserve facts and do not add actions. Return plain text.'},{role:'user',content:prose}]);
 if(/[\u0e00-\u0e7f]/.test(fixed)||disrespectful(fixed))throw Object.assign(Error('The model could not produce an appropriate English reply. Please try again.'),{code:'language'});
 return action?JSON.stringify({...action,summary:fixed}):fixed;
}
module.exports={englishResponse,thaiMessages,thaiResponse,needsThai,disrespectful,RULE};
