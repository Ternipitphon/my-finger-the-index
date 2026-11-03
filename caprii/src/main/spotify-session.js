'use strict';
const wait=(ms,signal)=>new Promise((resolve,reject)=>{signal?.throwIfAborted();const timer=setTimeout(done,ms);function done(){signal?.removeEventListener('abort',stop);resolve();}function stop(){clearTimeout(timer);reject(signal.reason);}signal?.addEventListener('abort',stop,{once:true});});
const spotify=status=>status.connected&&new URL(status.url).origin==='https://open.spotify.com';
async function connectSpotify({broker,open,signal,alreadyOpened=false,onProgress=()=>{},sleep=wait,maxChecks=50}){
 let opened=alreadyOpened;
 for(let i=0;i<maxChecks;i++){
  signal?.throwIfAborted();const status=broker.status();
  if(spotify(status)){
   if(!status.media||!status.worker||status.mediaVersion!==undefined&&status.mediaVersion<2)throw Error('อัปเดตส่วนขยาย Caprii เป็น 0.7.6 แล้วกด Reload และเชื่อม Spotify ใหม่ก่อน');
   try{const browser=broker.browser(),page=await browser.spotify({action:'inspect'},signal);if(page.loggedOut)throw Object.assign(Error('กรุณาเข้าสู่ระบบ Spotify ก่อน'),{login:true});if((!page.documentReady||page.documentReady==='complete')&&(!opened||page.tabActive!==false))return browser;}catch(error){if(error.login||signal?.aborted)throw error;}
  }
  if(!opened){await open();opened=true;}
  if(!broker.status().browserMode)throw Error('เปิด Spotify ให้แล้ว เปิดโหมดจำ Chrome หรือเชื่อมแท็บ Spotify ก่อน แล้วสั่งเล่นอีกครั้ง');
  onProgress('กำลังรอแท็บ Spotify ใหม่เชื่อมและโหลดตัวเล่น');await sleep(350,signal);
 }
 throw Error('แท็บ Spotify ใหม่ยังไม่พร้อม ยังไม่ได้กดเล่น ตรวจส่วนขยายและการเข้าสู่ระบบ');
}
module.exports={connectSpotify};
