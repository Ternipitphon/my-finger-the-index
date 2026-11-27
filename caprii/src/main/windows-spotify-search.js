'use strict';
const path=require('node:path');
const {runProcess,scriptEnvironment}=require('./agent-process');
const {state}=require('./windows-spotify');
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
const titleKey=s=>norm(s).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[\s\u200b-\u200d]/g,'');
function artistText(value){return norm(value).replace(/^(?:song|เพลง)\s*[•·]\s*/, '');}
function artistEvidence(row,value){
 const whole=artistText(value),texts=row.texts.map(artistText);
 if(texts.includes(whole))return true;
 const names=whole.split(/\s*[,;]\s*|\s+&\s+/).filter(Boolean);
 return names.length>1&&names.every(name=>texts.includes(name));
}
function select(rows,query,artist){
 if(!Array.isArray(rows)||rows.length>60)throw Error('Invalid search results');
 const matches=rows.filter(r=>r&&typeof r.id==='string'&&((typeof r.button==='string'&&typeof r.buttonName==='string')||(r.button===null&&r.buttonName===null))&&Array.isArray(r.texts)&&r.texts.length<=200&&r.texts.every(t=>typeof t==='string'&&t.length<=500)&&r.texts.some(t=>titleKey(t)===titleKey(query))&&(!artist||artistEvidence(r,artist)));
 // Spotify's promoted result card takes precedence over ordinary cover rows.
 // Never infer popularity/original recording from the currently playing session.
 return matches.find(r=>r.kind==='card')||matches[0]||null;
}
async function searchWindowsSpotify({query,artist,lang='th',platform=process.platform,open,signal,onProgress=()=>{},run=runProcess,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const en=lang==='en';
 const fail=(code,th,english)=>({ok:false,verified:false,backend:'windows-smtc',code,text:en?english:th});
 if(typeof query!=='string'||!query.trim()||query.length>300||artist!==undefined&&(typeof artist!=='string'||!artist.trim()||artist.length>300))throw Error('Invalid Spotify search');
 const searchQuery=query+(artist?' '+artist:'');
 if(platform!=='win32'||typeof open!=='function')return fail('spotify_search_unavailable','การค้นเพลงในแอปใช้ได้บน Windows เท่านั้น','Desktop song search requires Windows.');
 async function call(file,payload){signal?.throwIfAborted();const helper=path.join(__dirname,file).replace(/app\.asar([\\/])/,'app.asar.unpacked$1');const r=await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',helper],{input:JSON.stringify(payload),signal,timeoutMs:12000,maxBytes:128000,env:scriptEnvironment()});signal?.throwIfAborted();if(!r.passed)throw Error('Spotify inspection failed');return JSON.parse(r.stdout.replace(/^\uFEFF/,'').trim());}
 try{
  onProgress(en?'Searching in the Spotify app…':'กำลังค้นเพลงในแอป Spotify…');
  signal?.throwIfAborted();await open('spotify:search:'+encodeURIComponent(searchQuery));
  let snapshot,row,prepared=false;
  for(let i=0;i<8;i++){
   signal?.throwIfAborted();await sleep(500);snapshot=await call('windows-spotify-search.ps1',{kind:'inspect',query,searchQuery});
   if(snapshot.ok===true&&typeof snapshot.window==='string'){
    row=select(snapshot.rows,query,artist);if(row?.button)break;
    if(!row&&snapshot.search?.needsCorrection===true){
     if(prepared)return fail('spotify_search_input_unconfirmed','Spotify ยังไม่ยืนยันคำค้นแบบมีช่องว่าง จึงไม่กรอกซ้ำ','Spotify has not confirmed the spaced search query. It was not typed again.');
     prepared=true;const corrected=await call('windows-spotify-search.ps1',{kind:'prepare',query,searchQuery,window:snapshot.window,field:snapshot.search});
     if(corrected.ok!==true||corrected.confirmed!==true)return fail('spotify_search_input_unconfirmed','ยังยืนยันคำค้นใน Spotify ไม่ได้ จึงยังไม่สั่งเล่นและไม่กรอกซ้ำ','The Spotify search query could not be confirmed. Playback was not requested and typing was not repeated.');
     row=null;continue;
    }
   }
  }
  if(!row)return fail('spotify_search_no_match','ยังไม่พบเพลงชื่อตรงในผลค้นหา Spotify ลองตรวจชื่อเพลงอีกครั้ง','No matching song title was found in Spotify. Check the song name.');
  async function observePlaying(maxChecks,alreadyPlaying){
  let consecutive=0,last;
  for(let i=0;i<maxChecks;i++){
   signal?.throwIfAborted();await sleep(400);const r=await call('windows-spotify.ps1',{action:'inspect'});
   if(r.ok!==true){consecutive=0;continue;}
   const s=state(r.session),matches=titleKey(s.title)===titleKey(query)&&!!s.artist&&artistEvidence(row,s.artist)&&(!artist||artistText(s.artist)===artistText(artist)||artistEvidence({texts:artistText(s.artist).split(/\s*[,;]\s*|\s+&\s+/)},artist));
   consecutive=matches&&s.status==='Playing'&&(!last||last.sourceAppId===s.sourceAppId)?consecutive+1:0;last=s;
   if(consecutive>=2)return{ok:true,verified:true,audioVerified:false,backend:'windows-smtc',verification:'windows-session-status',track:s.title,artists:s.artist?[s.artist]:[],text:(alreadyPlaying?(en?'This song is already playing in Spotify: ':'เพลงนี้กำลังเล่นอยู่ใน Spotify แล้ว: '):(en?'Spotify reports playing: ':'แอป Spotify แสดงสถานะกำลังเล่น: '))+s.title+(s.artist?' — '+s.artist:'')+(en?'. Speaker output is not verified.':' ยังตรวจเสียงลำโพงไม่ได้'),evidence:{sourceAppId:s.sourceAppId,status:s.status,selection:row.kind==='card'?'promoted-matching-card':'first-matching-visible-row',alreadyPlaying}};
  }
  return null;
  }
  // A visible Pause button is not an absent player: verify a matching track before any mutation.
  const alreadyPlaying=await observePlaying(2,true);if(alreadyPlaying)return alreadyPlaying;
  if(!row.button)return fail('spotify_search_control_unavailable','พบเพลงตรงชื่อบนสุด แต่ยังอ่านปุ่ม Play ของแถวหรือการ์ดผลค้นหาไม่ได้ และยังยืนยันว่าเพลงนั้นกำลังเล่นไม่ได้','The top matching song was found, but neither its row nor card Play control is available, and matching playback is not confirmed.');
  onProgress(en?'Playing the matching Spotify result…':'กำลังเล่นผลค้นหาที่ตรงใน Spotify…');
  const invoked=await call('windows-spotify-search.ps1',{kind:'invoke',query,window:snapshot.window,row});
  if(invoked.ok!==true||invoked.invoked!==true)return fail('spotify_search_changed','ผลค้นหาหรือหน้าต่างเปลี่ยน จึงยังไม่กดเล่น','The result or window changed; playback was not invoked.');
  const playing=await observePlaying(8,false);if(playing)return playing;
  return fail('spotify_search_not_confirmed','กดผลค้นหาครั้งเดียวแล้ว แต่ยังไม่ยืนยันว่าเพลงที่ขอกำลังเล่น จึงไม่กดซ้ำ','The matching result was invoked once, but playback of the requested song is not confirmed. It was not repeated.');
 }catch(error){if(signal?.aborted)throw signal.reason;return fail('spotify_search_ui_unavailable','Spotify ยังไม่เปิดข้อมูลปุ่มค้นหาให้ใช้งาน ลองเปิดแอปและเข้าสู่ระบบก่อน การเล่นต่อ/หยุดยังใช้ได้ตามเดิม','Spotify search controls are unavailable. Open the app and sign in. Current-track controls remain available.');}
}
module.exports={searchWindowsSpotify,select,titleKey,artistEvidence};
