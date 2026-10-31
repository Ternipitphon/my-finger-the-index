'use strict';
const BASE='http://127.0.0.1:47824';
async function request(path,data,connection){const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json','X-Caprii-Extension':chrome.runtime.id,Authorization:'Bearer '+connection.code},body:JSON.stringify(data),signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('เชื่อมต่อ Caprii ไม่สำเร็จ ('+r.status+')');return r.json();}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 (async()=>{
  const {connection}=await chrome.storage.session.get('connection');
  if(message.type==='connect'&&!sender.tab){
   const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const url=new URL(tab.url);if(!['http:','https:'].includes(url.protocol))throw Error('เลือกหน้าเว็บปกติก่อน');
   const next={code:message.code,tabId:tab.id,origin:url.origin};const result=await request('/connect',{url:tab.url,title:tab.title},next);next.session=result.session;
   await chrome.storage.session.set({connection:next});
   await chrome.scripting.executeScript({target:{tabId:tab.id},files:['dom.js','content.js']});return{ok:true};
  }
  if(message.type==='disconnect'&&!sender.tab){if(connection)await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove('connection');return{ok:true};}
  if(message.type==='status'&&!sender.tab)return{connected:!!connection};
  if(!connection||sender.tab?.id!==connection.tabId||new URL(sender.url).origin!==connection.origin)return{stop:true};
  if(message.type==='poll')return request('/poll',{session:connection.session},connection);
  if(message.type==='reply')return request('/reply',{session:connection.session,id:message.id,result:message.result,error:message.error},connection);
  throw Error('Unsupported message');
 })().then(reply,error=>reply({error:/[\u0e00-\u0e7f]/.test(error.message)?error.message:'เชื่อมต่อ Caprii ไม่สำเร็จ กรุณาตรวจโปรแกรมและรหัส'}));return true;
});
chrome.tabs.onRemoved.addListener(async id=>{const {connection}=await chrome.storage.session.get('connection');if(connection?.tabId===id){await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove('connection');}});
chrome.tabs.onUpdated.addListener(async(id,change)=>{if(!change.url)return;const {connection}=await chrome.storage.session.get('connection');if(connection?.tabId===id){await request('/disconnect',{session:connection.session},connection).catch(()=>{});await chrome.storage.session.remove('connection');}});
