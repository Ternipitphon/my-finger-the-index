'use strict';
const path=require('node:path');
const {runProcess,scriptEnvironment}=require('./agent-process');
const {state}=require('./windows-spotify');
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
function select(rows,query,artist){
 if(!Array.isArray(rows)||rows.length>60)throw Error('Invalid search results');
 const matches=rows.filter(r=>r&&typeof r.id==='string'&&typeof r.button==='string'&&typeof r.buttonName==='string'&&Array.isArray(r.texts)&&r.texts.length<=200&&r.texts.every(t=>typeof t==='string'&&t.length<=500)&&r.texts.some(t=>norm(t)===norm(query))&&(!artist||r.texts.some(t=>norm(t)===norm(artist))));
 return matches.length===1?matches[0]:null;
}
async function searchWindowsSpotify({query,artist,lang='th',platform=process.platform,open,signal,onProgress=()=>{},run=runProcess,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const en=lang==='en';
 const fail=(code,th,english)=>({ok:false,verified:false,backend:'windows-smtc',code,text:en?english:th});
 if(typeof query!=='string'||!query.trim()||query.length>300||artist!==undefined&&(typeof artist!=='string'||!artist.trim()||artist.length>300))throw Error('Invalid Spotify search');
 if(platform!=='win32'||typeof open!=='function')return fail('spotify_search_unavailable','การค้นเพลงในแอปใช้ได้บน Windows เท่านั้น','Desktop song search requires Windows.');
 async function call(file,payload){signal?.throwIfAborted();const helper=path.join(__dirname,file).replace(/app\.asar([\\/])/,'app.asar.unpacked$1');const r=await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',helper],{input:JSON.stringify(payload),signal,timeoutMs:12000,maxBytes:128000,env:scriptEnvironment()});signal?.throwIfAborted();if(!r.passed)throw Error('Spotify inspection failed');return JSON.parse(r.stdout.replace(/^\uFEFF/,'').trim());}
 try{
  onProgress(en?'Searching in the Spotify app…':'กำลังค้นเพลงในแอป Spotify…');
  signal?.throwIfAborted();await open('spotify:search:'+encodeURIComponent(query+(artist?' '+artist:'')));
  let snapshot,row;
  for(let i=0;i<8;i++){signal?.throwIfAborted();await sleep(500);snapshot=await call('windows-spotify-search.ps1',{kind:'inspect'});if(snapshot.ok===true&&typeof snapshot.window==='string'){row=select(snapshot.rows,query,artist);if(row)break;}}
  if(!row)return fail('spotify_search_no_unique_match','ยังเลือกเพลงที่ตรงอย่างชัดเจนไม่ได้ ลองระบุชื่อเพลงและศิลปินให้ครบ หรือเปิดผลค้นหาใน Spotify ตรวจดูก่อน','No unique playable match was found. Specify the exact song and artist, or check the search results in Spotify.');
  onProgress(en?'Playing the matching Spotify result…':'กำลังเล่นผลค้นหาที่ตรงใน Spotify…');
  const invoked=await call('windows-spotify-search.ps1',{kind:'invoke',window:snapshot.window,row});
  if(invoked.ok!==true||invoked.invoked!==true)return fail('spotify_search_changed','ผลค้นหาหรือหน้าต่างเปลี่ยน จึงยังไม่กดเล่น','The result or window changed; playback was not invoked.');
  let consecutive=0,last;
  for(let i=0;i<8;i++){
   signal?.throwIfAborted();await sleep(400);const r=await call('windows-spotify.ps1',{action:'inspect'});
   if(r.ok!==true){consecutive=0;continue;}
   const s=state(r.session),matches=norm(s.title)===norm(query)&&(!artist||norm(s.artist)===norm(artist));
   consecutive=matches&&s.status==='Playing'&&(!last||last.sourceAppId===s.sourceAppId)?consecutive+1:0;last=s;
   if(consecutive>=2)return{ok:true,verified:true,audioVerified:false,backend:'windows-smtc',verification:'windows-session-status',track:s.title,artists:s.artist?[s.artist]:[],text:(en?'Spotify reports playing: ':'แอป Spotify แสดงสถานะกำลังเล่น: ')+s.title+(s.artist?' — '+s.artist:'')+(en?'. Speaker output is not verified.':' ยังตรวจเสียงลำโพงไม่ได้'),evidence:{sourceAppId:s.sourceAppId,status:s.status}};
  }
  return fail('spotify_search_not_confirmed','กดผลค้นหาครั้งเดียวแล้ว แต่ยังไม่ยืนยันว่าเพลงที่ขอกำลังเล่น จึงไม่กดซ้ำ','The matching result was invoked once, but playback of the requested song is not confirmed. It was not repeated.');
 }catch(error){if(signal?.aborted)throw signal.reason;return fail('spotify_search_ui_unavailable','Spotify ยังไม่เปิดข้อมูลปุ่มค้นหาให้ใช้งาน ลองเปิดแอปและเข้าสู่ระบบก่อน การเล่นต่อ/หยุดยังใช้ได้ตามเดิม','Spotify search controls are unavailable. Open the app and sign in. Current-track controls remain available.');}
}
module.exports={searchWindowsSpotify,select};
