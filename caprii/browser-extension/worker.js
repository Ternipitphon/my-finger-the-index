'use strict';
const BASE='http://127.0.0.1:47824';
async function request(path,data,connection){
 let r;try{r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json','X-Caprii-Extension':chrome.runtime.id,Authorization:'Bearer '+connection.code},body:JSON.stringify(data),signal:AbortSignal.timeout(5000)});}catch{throw Error('ติดต่อแอป Caprii ไม่ได้ เปิด Caprii แล้วคลิกขวา → เชื่อมแท็บ Chrome… จากนั้นลองอีกครั้ง');}
 if(r.status===403)throw Error('รหัสเชื่อมต่อหรือส่วนขยายไม่ตรงกับแอป คัดลอกรหัสใหม่จาก Caprii และตรวจว่าใช้ส่วนขยายจากรุ่นเดียวกัน');
 if(r.status===409)throw Error('การเชื่อมแท็บหมดอายุ กดอนุญาตให้ใช้แท็บนี้อีกครั้งด้วยรหัสรอบปัจจุบัน');
 if(!r.ok)throw Error('แอปตอบกลับข้อผิดพลาด ('+r.status+') ยังไม่ได้เชื่อมแท็บ');return r.json();
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 (async()=>{
  const {connection}=await chrome.storage.session.get('connection');
  if(message.type==='connect'&&!sender.tab){
   const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const url=new URL(tab.url);if(!['http:','https:'].includes(url.protocol))throw Error(url.protocol==='file:'?'หน้านี้เปิดจากไฟล์ ให้คลิกขวา Caprii → เปิดเว็บทดสอบ Caprii แล้วเชื่อมแท็บ http://127.0.0.1 ที่แอปเปิดให้':'แท็บนี้ไม่รองรับ เลือกหน้าเว็บ http หรือ https ก่อน');
   const next={code:message.code,tabId:tab.id,origin:url.origin,title:tab.title,url:tab.url};const result=await request('/connect',{url:tab.url,title:tab.title},next);next.session=result.session;
   await chrome.storage.session.set({connection:next,lastCode:message.code});
   try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['dom.js','content.js']});}catch{await request('/disconnect',{session:next.session},next).catch(()=>{});await chrome.storage.session.remove('connection');throw Error('ส่วนขยายเข้าแท็บนี้ไม่ได้ รีเฟรชหน้าเว็บแล้วกดอนุญาตอีกครั้ง');}return{ok:true};
  }
  if(message.type==='disconnect'&&!sender.tab){if(connection)await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove(['connection','lastCode']);return{ok:true};}
  if(message.type==='status'&&!sender.tab)return{connected:!!connection,title:connection?.title,url:connection?.url,code:(await chrome.storage.session.get('lastCode')).lastCode||''};
  if(!connection||sender.tab?.id!==connection.tabId||new URL(sender.url).origin!==connection.origin)return{stop:true};
  if(message.type==='poll')return request('/poll',{session:connection.session},connection);
  if(message.type==='reply')return request('/reply',{session:connection.session,id:message.id,result:message.result,error:message.error},connection);
  throw Error('Unsupported message');
 })().then(reply,error=>reply({error:/[\u0e00-\u0e7f]/.test(error.message)?error.message:'เชื่อมต่อ Caprii ไม่สำเร็จ กรุณาตรวจโปรแกรมและรหัส'}));return true;
});
chrome.tabs.onRemoved.addListener(async id=>{const {connection}=await chrome.storage.session.get('connection');if(connection?.tabId===id){await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove('connection');}});
chrome.tabs.onUpdated.addListener(async(id,change)=>{if(!change.url)return;const {connection}=await chrome.storage.session.get('connection');if(connection?.tabId===id){await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove('connection');}});
