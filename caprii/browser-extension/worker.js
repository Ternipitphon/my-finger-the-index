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
   const next={code:message.code,tabId:tab.id,origin:url.origin,title:tab.title,url:tab.url};const result=await request('/connect',{url:tab.url,title:tab.title,media:true},next);next.session=result.session;
   await chrome.storage.session.set({connection:next,lastCode:message.code});
   try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['spotify-dom.js','dom.js','content.js']});}catch{await request('/disconnect',{session:next.session},next).catch(()=>{});await chrome.storage.session.remove('connection');throw Error('ส่วนขยายเข้าแท็บนี้ไม่ได้ รีเฟรชหน้าเว็บแล้วกดอนุญาตอีกครั้ง');}return{ok:true};
  }
  if(message.type==='disconnect'&&!sender.tab){if(connection)await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove(['connection','lastCode']);return{ok:true};}
  if(message.type==='status'&&!sender.tab)return{connected:!!connection,title:connection?.title,url:connection?.url,code:(await chrome.storage.session.get('lastCode')).lastCode||''};
  if(!connection||sender.tab?.id!==connection.tabId||new URL(sender.url).origin!==connection.origin)return{stop:true};
  if(message.type==='mediaNavigate'){
   const url=new URL(message.url);
   if(connection.origin!=='https://open.spotify.com'||url.origin!==connection.origin||url.username||url.password||!/^\/(?:search(?:\/[^?#]*)?|collection(?:\/(?:tracks|playlists))?|playlist\/[A-Za-z0-9]+|track\/[A-Za-z0-9]+)\/?$/.test(url.pathname))throw Error('ไม่อนุญาตให้ย้ายออกจากหน้าสื่อ Spotify');
   try{await chrome.tabs.update(connection.tabId,{url:url.href});await request('/reply',{session:connection.session,id:message.id,result:{performed:true,url:url.href}},connection);return{ok:true};}
   catch(error){await request('/reply',{session:connection.session,id:message.id,error:error.message},connection);throw error;}
  }
  if(message.type==='poll')return request('/poll',{session:connection.session},connection);
  if(message.type==='reply')return request('/reply',{session:connection.session,id:message.id,result:message.result,error:message.error},connection);
  throw Error('Unsupported message');
 })().then(reply,error=>reply({error:/[\u0e00-\u0e7f]/.test(error.message)?error.message:'เชื่อมต่อ Caprii ไม่สำเร็จ กรุณาตรวจโปรแกรมและรหัส'}));return true;
});
chrome.tabs.onRemoved.addListener(async id=>{const {connection}=await chrome.storage.session.get('connection');if(connection?.tabId===id){await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove('connection');}});
chrome.tabs.onUpdated.addListener(async(id,change,tab)=>{
 const {connection}=await chrome.storage.session.get('connection');if(connection?.tabId!==id)return;
 if(change.url){
  if(new URL(change.url).origin!==connection.origin){await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove('connection');return;}
  connection.url=change.url;connection.title=tab?.title||connection.title;await chrome.storage.session.set({connection});
  await request('/location',{session:connection.session,url:connection.url,title:connection.title},connection).catch(()=>{});
 }
 if(change.status==='complete')try{await chrome.scripting.executeScript({target:{tabId:id},files:['spotify-dom.js','dom.js','content.js']});}catch{await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove('connection');}
});
