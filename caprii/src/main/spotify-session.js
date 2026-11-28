'use strict';
const wait=(ms,signal)=>new Promise((resolve,reject)=>{signal?.throwIfAborted();const timer=setTimeout(done,ms);function done(){signal?.removeEventListener('abort',stop);resolve();}function stop(){clearTimeout(timer);reject(signal.reason);}signal?.addEventListener('abort',stop,{once:true});});
const spotify=status=>status.connected&&new URL(status.url).origin==='https://open.spotify.com';
async function connectSpotify({broker,lang='th',open,signal,alreadyOpened=false,onProgress=()=>{},sleep=wait,maxChecks=50}){
 const ui=(value,slots=[])=>require('../renderer/js/ui-catalog').text(value,lang,slots);
 let opened=alreadyOpened,announced=false,lastReadError='',readFailures=0;
 for(let i=0;i<maxChecks;i++){
  signal?.throwIfAborted();const status=broker.status();
  if(spotify(status)){
   if(!status.media||!status.worker||status.mediaVersion!==undefined&&status.mediaVersion<2)throw Error(ui('อัปเดตส่วนขยาย Caprii เป็นรุ่นล่าสุด แล้วกด Reload และเชื่อม Spotify ใหม่ก่อน'));
   try{const browser=broker.browser(),page=await browser.spotify({action:'inspect'},signal);readFailures=0;lastReadError='';if(page.loggedOut)throw Object.assign(Error(ui('กรุณาเข้าสู่ระบบ Spotify ก่อน')),{login:true});if((!page.documentReady||page.documentReady==='complete')&&(!opened||page.tabActive!==false))return browser;}catch(error){if(error.login||signal?.aborted)throw error;const detail=String(error.message||ui('อ่านตัวเล่นไม่สำเร็จ')).slice(0,200);readFailures=detail===lastReadError?readFailures+1:1;lastReadError=detail;if(readFailures>=3)throw Error('อ่านตัวเล่น Spotify ไม่สำเร็จ: '+detail);}
  }
  if(!opened){await open();opened=true;}
  if(!broker.status().browserMode)throw Error(ui('เปิด Spotify ให้แล้ว เปิดโหมดจำ Chrome หรือเชื่อมแท็บ Spotify ก่อน แล้วสั่งเล่นอีกครั้ง'));
  if(!announced){announced=true;onProgress(ui('กำลังรอแท็บ Spotify ใหม่เชื่อมและโหลดตัวเล่น'));}await sleep(350,signal);
 }
 throw Error(ui('แท็บ Spotify ใหม่ยังไม่พร้อม ยังไม่ได้กดเล่น ตรวจส่วนขยายและการเข้าสู่ระบบ'));
}
module.exports={connectSpotify};
