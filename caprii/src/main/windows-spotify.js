'use strict';
const path=require('node:path');
const {runProcess,scriptEnvironment}=require('./agent-process');
const SOURCES=new Set(['spotify','spotify.exe','spotifyab.spotifymusic_zpdnekdrzrea0!spotify','spotifyab.spotifymusic_zpdnekdrzrea0!app']);
const ACTIONS=new Set(['play','pause','next','previous']);
function spotifySource(id){return typeof id==='string'&&SOURCES.has(id.toLowerCase());}
function state(value){
 if(!value||!spotifySource(value.sourceAppId)||!['Closed','Opened','Changing','Stopped','Playing','Paused'].includes(value.status))throw Error('Invalid Spotify session observation');
 for(const key of ['title','artist','album'])if(typeof value[key]!=='string'||value[key].length>2000)throw Error('Invalid media metadata');
 if(!value.controls||[...ACTIONS].some(k=>typeof value.controls[k]!=='boolean'))throw Error('Invalid Spotify controls');
 if(value.positionMs!==null&&(!Number.isFinite(value.positionMs)||value.positionMs<0))throw Error('Invalid media position');
 return value;
}
function verify(action,result,initial){
 if(result.ok!==true||result.accepted!==true||!Array.isArray(result.observations)||!result.observations.length||result.observations.length>8)return false;
 const before=state(result.before);if(before.sourceAppId!==initial.sourceAppId)return false;
 const observations=result.observations.map(state);if(observations.some(s=>s.sourceAppId!==before.sourceAppId))return false;
 if(action==='play'||action==='pause')return observations.length>=2&&observations.slice(-2).every(s=>action==='play'?s.status==='Playing':['Paused','Stopped'].includes(s.status));
 const last=observations.at(-1);if(last.title&&(last.title!==before.title||last.artist!==before.artist||last.album!==before.album))return true;
 return action==='previous'&&Number.isFinite(last.positionMs)&&Number.isFinite(before.positionMs)&&last.positionMs<before.positionMs-1000;
}
const messages={
 spotify_session_missing:['เปิดแอป Spotify บน Windows แล้วเล่นเพลงหนึ่งครั้งก่อน ตอนนี้ Windows ยังไม่พบตัวเล่น Spotify','Open the Windows Spotify app and play a song once. Windows has no Spotify media session yet.'],
 spotify_session_ambiguous:['พบตัวเล่น Spotify มากกว่าหนึ่งตัว ปิดให้เหลือตัวที่ต้องการก่อน','More than one Spotify session is open. Keep only the player you want to control.'],
 spotify_session_changed:['ตัวเล่น Spotify เปลี่ยนระหว่างสั่งงาน ยังไม่ได้ส่งคำสั่งใหม่','The Spotify session changed. No new command was sent.'],
 spotify_track_changed:['เพลงใน Spotify เปลี่ยนก่อนส่งคำสั่ง ยังไม่ได้กดซ้ำ','The Spotify track changed before the command. It was not repeated.'],
 spotify_control_disabled:['Spotify ยังไม่เปิดให้ใช้คำสั่งนี้ เลือกเพลงในแอปก่อน','Spotify has not enabled this control. Select a song in the app first.'],
 spotify_control_rejected:['Spotify ปฏิเสธคำสั่ง Windows ยังไม่ยืนยันผล','Spotify rejected the Windows media command.'],
 windows_media_unavailable:['ระบบสื่อของ Windows ยังไม่พร้อม ตรวจว่าใช้ Windows 10/11 และเปิดแอป Spotify อยู่','Windows media control is unavailable. Use Windows 10/11 with the Spotify app open.'],
};
async function runWindowsSpotify({action,lang='th',platform=process.platform,run=runProcess,signal,open,onProgress=()=>{},sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(!ACTIONS.has(action))throw Error('Invalid Spotify desktop action');
 const fail=code=>({ok:false,verified:false,backend:'windows-smtc',code,text:(messages[code]||messages.windows_media_unavailable)[lang==='en'?1:0]});
 if(platform!=='win32')return fail('windows_media_unavailable');
 const helper=path.join(__dirname,'windows-spotify.ps1').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
 async function request(payload){
  signal?.throwIfAborted();const result=await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',helper],{input:JSON.stringify(payload),signal,timeoutMs:12000,maxBytes:64000,env:scriptEnvironment()});
  signal?.throwIfAborted();if(!result.passed)throw Error('Windows media helper failed');return JSON.parse(result.stdout.replace(/^\uFEFF/,'').trim());
 }
 try{
  onProgress(lang==='en'?'Checking the Spotify app…':'กำลังตรวจตัวเล่นในแอป Spotify…');
  let first=await request({action:'inspect'});
  if(!first.ok&&first.code==='spotify_session_missing'&&action==='play'&&open){
   onProgress(lang==='en'?'Opening the Spotify app…':'กำลังเปิดแอป Spotify…');await open();
   for(let i=0;i<6;i++){signal?.throwIfAborted();await sleep(400);signal?.throwIfAborted();first=await request({action:'inspect'});if(first.ok||first.code!=='spotify_session_missing')break;}
  }
  if(first.ok!==true)return fail(first.code);const initial=state(first.session);
  const already=action==='play'&&initial.status==='Playing'||action==='pause'&&['Paused','Stopped'].includes(initial.status);
  if(!already&&!initial.controls[action])return fail('spotify_control_disabled');
  onProgress(lang==='en'?'Sending the command to Spotify…':'กำลังส่งคำสั่งไปที่แอป Spotify…');
  const result=await request({action,sourceAppId:initial.sourceAppId,expectedTitle:initial.title,expectedArtist:initial.artist});
  if(result.ok!==true)return fail(result.code);
  const confirmed=verify(action,result,initial),observed=result.observations?.at(-1);
  if(!confirmed)return{ok:false,verified:false,backend:'windows-smtc',code:'spotify_not_confirmed',text:lang==='en'?'The command was sent once, but Spotify has not confirmed the requested change. It was not repeated.':'ส่งคำสั่งครั้งเดียวแล้ว แต่ Spotify ยังไม่ยืนยันการเปลี่ยนสถานะ จึงไม่กดซ้ำ'};
  const title=observed.title,verb=lang==='en'?({play:'Spotify reports playing',pause:'Spotify reports paused',next:'Spotify changed track',previous:'Spotify changed track or restarted the current song'})[action]:({play:'แอป Spotify แสดงสถานะกำลังเล่น',pause:'แอป Spotify แสดงสถานะหยุดแล้ว',next:'แอป Spotify เปลี่ยนเพลงแล้ว',previous:'แอป Spotify เปลี่ยนเพลงหรือเริ่มเพลงเดิมใหม่แล้ว'})[action];
  return{ok:true,verified:true,audioVerified:false,backend:'windows-smtc',verification:'windows-session-status',track:title,artists:observed.artist?[observed.artist]:[],text:verb+(title?' — '+title:'')+(action==='play'?(lang==='en'?'. Speaker output is not verified.':' ยังตรวจเสียงลำโพงไม่ได้'):''),evidence:{sourceAppId:observed.sourceAppId,status:observed.status,requested:result.requested===true}};
 }catch(error){if(signal?.aborted)throw signal.reason;return fail('windows_media_unavailable');}
}
module.exports={runWindowsSpotify,spotifySource,state,verify};
