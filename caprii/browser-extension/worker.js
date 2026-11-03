'use strict';
const BASE='http://127.0.0.1:47824';
let pumpTimer=null,running=false,failures=0,epoch=0;
const AUTO_ORIGINS=['http://*/*','https://*/*'];
const preferences=async()=>chrome.storage.local?(await chrome.storage.local.get('browserPair')).browserPair:null;
async function forgetBrowser(){await chrome.storage.local?.remove('browserPair');await chrome.alarms?.clear('caprii-auto');}
async function autoSelect(){
 const pref=await preferences();if(!pref)return;
 if(!await chrome.permissions.contains({origins:AUTO_ORIGINS})){await forgetBrowser();await disconnect();return;}
 const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});
 if(!tab?.url||!/^https?:\/\//.test(tab.url)||tab.incognito||tab.status==='loading')return;
 const c=await selected(),origin=new URL(tab.url).origin;
 if(c?.tabId===tab.id&&c.origin===origin)return;
 if(c){const live=await request('/ping',{session:c.session},c);if(live.busy)return;}
 const next={code:pref.code,tabId:tab.id,origin,url:tab.url,title:tab.title};
 const result=await request('/connect',{url:tab.url,title:tab.title,media:true,transport:'worker',automatic:true},next);
 if(result.transport!=='worker'||result.browserMode!==true)throw failure('อัปเดตแอป Caprii ก่อนใช้โหมดจำ Chrome','auth');
 next.session=result.session;epoch++;await chrome.storage.session.set({connection:next,lastCode:pref.code});
 // Do not inject or read a page until the user actually sends a task.
}

function failure(message,code){return Object.assign(Error(message),{code});}
async function request(path,data,connection){
 let r;try{r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json','X-Caprii-Extension':chrome.runtime.id,Authorization:'Bearer '+connection.code},body:JSON.stringify(data),signal:AbortSignal.timeout(5000)});}catch{throw failure('ติดต่อแอป Caprii ไม่ได้ เปิด Caprii แล้วตรวจการเชื่อมต่ออีกครั้ง','offline');}
 if(r.status===403)throw failure('รหัสเชื่อมต่อหรือส่วนขยายไม่ตรงกับแอป คัดลอกรหัสใหม่จาก Caprii','auth');
 if(r.status===409)throw failure('รอบการเชื่อมต่อหมดอายุ เชื่อมแท็บนี้อีกครั้งด้วยรหัสปัจจุบัน','session');
 if(!r.ok)throw failure('แอปตอบกลับข้อผิดพลาด ('+r.status+')','server');return r.json();
}
const selected=async()=> (await chrome.storage.session.get('connection')).connection;
const same=async c=>{const current=await selected();return current?.session===c.session&&current.tabId===c.tabId;};
function wake(delay=0){clearTimeout(pumpTimer);pumpTimer=setTimeout(pump,delay);}
async function inject(tabId){await chrome.scripting.executeScript({target:{tabId},files:['spotify-dom.js','dom.js','content.js']});}
async function disconnect(expected){
 const current=await selected();if(!current||expected&&current.session!==expected.session)return;
 epoch++;clearTimeout(pumpTimer);await chrome.storage.session.remove('connection');
 await request('/disconnect',{session:current.session},current).catch(()=>{});
}
async function checkTab(c){if(!await same(c))throw failure('เปลี่ยนแท็บที่เชื่อมแล้ว','changed');let tab;try{tab=await chrome.tabs.get(c.tabId);}catch{throw failure('แท็บที่เชื่อมปิดแล้ว เลือกแท็บที่ต้องการและเชื่อมใหม่','tab');}if(new URL(tab.url).origin!==c.origin)throw failure('แท็บออกไปคนละเว็บไซต์ ต้องเชื่อมใหม่','origin');return tab;}
async function execute(c,command){
 await checkTab(c);
 if(command.op==='media-navigate'){
  const url=new URL(command.args.url);
  if(c.origin!=='https://open.spotify.com'||url.origin!==c.origin||url.username||url.password||!/^\/(?:search(?:\/[^?#]*)?|collection(?:\/(?:tracks|playlists))?|playlist\/[A-Za-z0-9]+|track\/[A-Za-z0-9]+)\/?$/.test(url.pathname))throw Error('ไม่อนุญาตให้ย้ายออกจากหน้าสื่อ Spotify');
  await chrome.tabs.update(c.tabId,{url:url.href});return{performed:true,url:url.href};
 }
 if(command.op==='spotify'&&c.origin!=='https://open.spotify.com')throw Error('ต้องเชื่อมแท็บ Spotify ก่อน');
 const run=()=>chrome.scripting.executeScript({target:{tabId:c.tabId},func:async(op,args)=>{
  if(typeof globalThis.createCapriiDOMBridge!=='function'||typeof globalThis.createCapriiSpotifyDOMBridge!=='function')return{needsInjection:true};
  const state=globalThis.__capriiBridges071||(globalThis.__capriiBridges071={dom:createCapriiDOMBridge(),spotify:createCapriiSpotifyDOMBridge()});
  return{value:await(op==='spotify'?state.spotify.execute(args):state.dom.execute(op,args))};
 },args:[command.op,command.args||{}]});
 let result=await run();if(result[0]?.result?.needsInjection){await inject(c.tabId);await checkTab(c);result=await run();}
 if(!result[0]?.result||!('value'in result[0].result))throw Error('แท็บยังไม่พร้อมรับคำสั่ง รีเฟรชแท็บแล้วเชื่อมใหม่');
 return result[0].result.value;
}
async function pump(){
 if(running)return;running=true;let connection;let cycle=epoch;
 try{
  await autoSelect();cycle=epoch;connection=await selected();if(!connection)return;
  const tab=await checkTab(connection);
  if(tab.status==='loading'){await request('/ping',{session:connection.session},connection);failures=0;return;}
  const packet=await request('/poll',{session:connection.session},connection);failures=0;
  if(packet.command&&cycle===epoch&&await same(connection)){
   const command=packet.command;let result,error;
   try{result=await execute(connection,command);}catch(e){error=e.message;}
   // Never retry a consumed mutation after a missing acknowledgment.
   if(await same(connection))await request('/reply',{session:connection.session,id:command.id,result,error},connection);
  }
 }catch(error){
  failures++;
  if(error.code==='auth'){await forgetBrowser();await chrome.storage.session.remove('lastCode');}
  if(['auth','session','origin','tab'].includes(error.code))await disconnect(connection||await selected());
 }finally{
  running=false;
  if((await selected()||await preferences())&&failures<6)wake(failures?Math.min(5000,500*2**failures):350);
 }
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 (async()=>{
  const connection=await selected();
  if(message.type==='connect'&&!sender.tab){
   if(message.remember===true&&!await chrome.permissions.contains({origins:AUTO_ORIGINS}))throw Error('ต้องอนุญาต Chrome ให้ใช้เว็บไซต์ก่อนเปิดโหมดจำการเชื่อมต่อ');
   const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const url=new URL(tab.url);
   if(!['http:','https:'].includes(url.protocol))throw Error(url.protocol==='file:'?'หน้านี้เปิดจากไฟล์ คลิกขวา Caprii → เปิดเว็บทดสอบ Caprii แล้วเชื่อมแท็บ http://127.0.0.1':'เลือกแท็บ http หรือ https ก่อน');
   epoch++;clearTimeout(pumpTimer);
   const next={code:message.code,tabId:tab.id,origin:url.origin,title:tab.title,url:tab.url};
   const result=await request('/connect',{url:tab.url,title:tab.title,media:true,transport:'worker'},next);next.session=result.session;
   if(result.transport!=='worker'){await request('/disconnect',{session:next.session},next).catch(()=>{});throw Error('อัปเดตแอป Caprii เป็น 0.7.1 ก่อนใช้ส่วนขยายรุ่นนี้');}
   if(message.remember===true&&result.browserMode!==true){await request('/disconnect',{session:next.session},next).catch(()=>{});throw Error('โหมดจำ Chrome ต้องอัปเดตแอป Caprii เป็น 0.7.3 ก่อน');}
   await chrome.storage.session.set({connection:next,lastCode:message.code});
   try{await inject(tab.id);}catch{await disconnect(next);throw Error('ส่วนขยายเข้าแท็บนี้ไม่ได้ รีเฟรชหน้าเว็บแล้วกดอนุญาตอีกครั้ง');}
   if(message.remember===true){await chrome.storage.local.set({browserPair:{code:message.code}});await chrome.alarms.create('caprii-auto',{periodInMinutes:1});}else await forgetBrowser();
   failures=0;wake();return{ok:true};
  }
  if(message.type==='disconnect'&&!sender.tab){await forgetBrowser();await disconnect();await chrome.permissions?.remove({origins:AUTO_ORIGINS});await chrome.storage.session.remove('lastCode');return{ok:true};}
  if(message.type==='status'&&!sender.tab){
   const pref=await preferences();const code=(await chrome.storage.session.get('lastCode')).lastCode||pref?.code||'';
   if(pref){failures=0;wake();}
   if(!connection)return{connected:false,remember:!!pref,code};
   try{await checkTab(connection);const live=await request('/ping',{session:connection.session},connection);if(live.transport!=='worker')throw failure('เชื่อมแท็บนี้ใหม่อีกครั้งเพื่อใช้ตัวส่งคำสั่งรุ่นใหม่','session');failures=0;wake();return{connected:true,remember:!!pref,title:connection.title,url:connection.url,code};}
   catch(error){if(['auth','session','origin','tab'].includes(error.code))await disconnect(connection);else{failures=0;wake(500);}return{connected:false,remember:!!pref,paired:!!await selected(),error:error.message,code};}
  }
  // Old page-timer pollers must not compete with the background dispatcher.
  return{stop:true};
 })().then(reply,error=>reply({error:/[\u0e00-\u0e7f]/.test(error.message)?error.message:'เชื่อมต่อ Caprii ไม่สำเร็จ กรุณาตรวจโปรแกรมและรหัส'}));return true;
});
chrome.tabs.onRemoved.addListener(async id=>{const c=await selected();if(c?.tabId===id){await disconnect(c);failures=0;wake();}});
chrome.tabs.onUpdated.addListener(async(id,change,tab)=>{
 const c=await selected();if(c?.tabId!==id){if(change.status==='complete'){failures=0;wake();}return;}
 if(change.url){
  if(new URL(change.url).origin!==c.origin){await disconnect(c);failures=0;wake();return;}
  c.url=change.url;c.title=tab?.title||c.title;await chrome.storage.session.set({connection:c});
  await request('/location',{session:c.session,url:c.url,title:c.title},c).catch(()=>{});
 }
 if(change.status==='complete'){failures=0;wake();}
});
chrome.tabs.onActivated?.addListener(()=>{failures=0;wake();});
chrome.alarms?.onAlarm.addListener(alarm=>{if(alarm.name==='caprii-auto'){failures=0;wake();}});
chrome.permissions?.onRemoved?.addListener(()=>{failures=0;wake();});
chrome.runtime.onStartup?.addListener(()=>wake());
// Resume a still-authorized session when Chrome wakes this worker. No new tabs are granted.
Promise.all([selected(),preferences()]).then(async([c,pref])=>{if(pref)await chrome.alarms?.create('caprii-auto',{periodInMinutes:1});if(c||pref)wake();});
