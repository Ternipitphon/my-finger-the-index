'use strict';
const {spotifyURL}=require('./media-url');
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s“”"']+/g,' ').trim();
const wait=(ms,signal)=>new Promise((resolve,reject)=>{signal?.throwIfAborted();const id=setTimeout(done,ms);function done(){signal?.removeEventListener('abort',stop);resolve();}function stop(){clearTimeout(id);reject(signal.reason);}signal?.addEventListener('abort',stop,{once:true});});
function validateMedia(request){
 if(!request||request.service!=='spotify'||request.action!=='play'||!['liked','playlist','track','current'].includes(request.collection))throw Error('Invalid media request');
 for(const key of ['query','artist'])if(request[key]!==undefined&&(typeof request[key]!=='string'||!request[key].trim()||request[key].length>300))throw Error('Invalid media query');
 if(request.collection==='track'&&!request.query)throw Error('ต้องระบุชื่อเพลงก่อน');
 if(request.url!==undefined){const u=new URL(spotifyURL(request.url));if(request.collection!=='playlist'||!/^\/playlist\//.test(u.pathname))throw Error('Invalid playlist URL');}
 return{service:'spotify',action:'play',collection:request.collection,...(request.query?{query:request.query}:{}),...(request.artist?{artist:request.artist}:{}),...(request.url?{url:request.url}:{})};
}
function destination(r){return r.collection==='liked'?'https://open.spotify.com/collection/tracks':r.url||(r.query&&r.collection==='track'?'https://open.spotify.com/search/'+encodeURIComponent(r.query):'https://open.spotify.com/collection');}
async function runSpotify({request,browser,signal,onProgress=()=>{},sleep=wait,maxChecks=12}){
 const r=validateMedia(request);let observed,clicked=false,expectedTrack=null;
 const inspect=()=>browser.spotify({action:'inspect'},signal);
 async function go(url){url=spotifyURL(url);onProgress('กำลังเปิดหน้า Spotify ที่ต้องการ');await browser.mediaNavigate(url,signal);for(let i=0;i<20;i++){signal?.throwIfAborted();observed=await inspect();if(new URL(observed.url).pathname===new URL(url).pathname){if(observed.loggedOut)throw Error('กรุณาเข้าสู่ระบบ Spotify ก่อน ยังไม่ได้กดเล่น');return observed;}await sleep(350,signal);}throw Error('หน้า Spotify ยังไม่พร้อม ยังไม่ได้กดเล่น');}
 try{
  observed=await inspect();if(observed.loggedOut)throw Error('กรุณาเข้าสู่ระบบ Spotify ก่อน ยังไม่ได้กดเล่น');
  if(r.collection==='liked')await go('https://open.spotify.com/collection/tracks');
  else if(r.collection==='track'){
   await go('https://open.spotify.com/search/'+encodeURIComponent(r.query));
   let matches=[];
   for(let i=0;i<6;i++){observed=await inspect();matches=observed.rows.filter(x=>normalize(x.title)===normalize(r.query)&&(!r.artist||x.artists.some(n=>normalize(n)===normalize(r.artist))));matches=matches.filter((x,i,list)=>list.findIndex(y=>y.url===x.url)===i);if(matches.length)break;await sleep(350,signal);}
   if(matches.length>1&&new Set(matches.map(x=>(x.artists||[]).map(normalize).sort().join('\u0001'))).size===1)matches=[matches[0]]; // same requested song/performers: use Spotify's top exact release
   if(matches.length!==1)return{ok:false,verified:false,text:matches.length?'พบเพลงชื่อนี้หลายรายการ ระบุศิลปินเพิ่มอีกนิดครับ':'ยังไม่พบเพลงชื่อตรงกันในผลค้นหาที่อ่านได้ ยังไม่ได้กดเล่น',clarification:matches.length?'artist':undefined,choices:matches.map(x=>({title:x.title,artists:x.artists})).slice(0,5)};
   expectedTrack=matches[0].url;await go(expectedTrack);
  }else if(r.collection==='playlist'){
   if(r.url)await go(r.url);
   else{
    if(!r.query&&/^\/playlist\//.test(new URL(observed.url).pathname)){}else{
     if(!r.query)return{ok:false,verified:false,text:'ต้องการเล่นเพลย์ลิสต์ไหนครับ? บอกชื่อหรือเปิดเพลย์ลิสต์นั้นก่อน',clarification:'playlist',choices:(observed.playlists||[]).map(x=>x.title).slice(0,5)};
     if(!observed.playlists?.length)await go('https://open.spotify.com/collection');
     const matches=(observed.playlists||[]).filter(x=>!r.query||normalize(x.title)===normalize(r.query));
     if(matches.length!==1)return{ok:false,verified:false,text:r.query?'ยังระบุเพลย์ลิสต์ชื่อนี้ในคลังที่อ่านได้ไม่ชัด ส่งลิงก์เพลย์ลิสต์หรือเปิดเพลย์ลิสต์นั้นก่อนครับ':'ต้องการเล่นเพลย์ลิสต์ไหนครับ? บอกชื่อ ส่งลิงก์ หรือเปิดเพลย์ลิสต์นั้นในแท็บที่เชื่อมอยู่',clarification:'playlist',choices:matches.map(x=>x.title).slice(0,5)};
     await go(matches[0].url);
    }
   }
  }
  for(let i=0;i<10;i++){observed=await inspect();if(observed.loggedOut)throw Error('กรุณาเข้าสู่ระบบ Spotify ก่อน ยังไม่ได้กดเล่น');const headingOK=r.collection==='liked'?/liked songs|เพลงที่(?:กด)?(?:ถูกใจ|ชอบ)|เพลงโปรด/i.test(observed.heading):r.collection==='track'||r.collection==='playlist'&&r.query?normalize(observed.heading)===normalize(r.query):true;if((r.collection==='current'?observed.ready:observed.canPlayCollection)&&headingOK)break;await sleep(350,signal);}
  if(r.collection==='current'&&!observed.track)return{ok:false,verified:false,text:'ยังไม่มีเพลงในตัวเล่น บอกชื่อเพลงหรือสั่งเล่น Liked Songs ได้เลยครับ'};
  if(r.collection==='liked'&&!/liked songs|เพลงที่(?:กด)?(?:ถูกใจ|ชอบ)|เพลงโปรด/i.test(observed.heading))throw Error('ยังไม่พบหน้า Liked Songs ที่พร้อมเล่น ยังไม่ได้กดเล่น');
  if((r.collection==='track'||r.collection==='playlist'&&r.query)&&normalize(observed.heading)!==normalize(r.query))throw Error('หน้าที่เปิดไม่ตรงกับชื่อเพลง ยังไม่ได้กดเล่น');
  onProgress('พบรายการแล้ว กำลังกดเล่นและตรวจตัวเล่น');
  const played=await browser.spotify({action:'play',current:r.collection==='current',expectedUrl:observed.url,expectedHeading:observed.heading},signal);clicked=played.clicked===true;
  let baseline=null;
  for(let i=0;i<maxChecks;i++){
   await sleep(700,signal);observed=await inspect();if(observed.loggedOut)throw Error('Spotify ขอให้เข้าสู่ระบบ');
   if(observed.alerts)onProgress(observed.alerts);
   const correct=r.collection!=='track'||normalize(observed.track)===normalize(r.query)&&(!r.artist||(observed.artists||[]).some(n=>normalize(n)===normalize(r.artist)))&&(!observed.trackUrl||new URL(observed.trackUrl).pathname===new URL(expectedTrack).pathname);
   if(observed.playing&&observed.track&&correct&&Number.isFinite(observed.position)){
    if(baseline&&baseline.kind===observed.positionKind&&normalize(baseline.track)===normalize(observed.track)&&observed.position>baseline.position)return{ok:true,verified:true,text:'ตัวเล่น Spotify แสดงว่ากำลังเล่น '+observed.track+' และเวลาเพลงเดินแล้ว',track:observed.track,collection:r.collection,evidence:{playing:true,positionBefore:baseline.position,positionAfter:observed.position,kind:observed.positionKind}};
    baseline={position:observed.position,kind:observed.positionKind,track:observed.track};
   }else baseline=null;
  }
  return{ok:false,verified:false,text:(clicked?'ส่งคำสั่งเล่นแล้ว':'ตัวเล่นมีสถานะเล่นอยู่')+' แต่ยังไม่พบหลักฐานว่าเวลาเพลงเดิน จึงยังไม่ยืนยันว่าเล่นสำเร็จ ไม่กดซ้ำอัตโนมัติ'+(observed.alerts?' ข้อความจาก Spotify: '+observed.alerts:'')};
 }catch(error){if(signal?.aborted)throw error;return{ok:false,verified:false,text:error.message+(clicked?' — มีการส่งคำสั่งเล่นไปแล้ว แต่ยังไม่ยืนยันผล':''),clicked};}
}
module.exports={validateMedia,destination,runSpotify};
