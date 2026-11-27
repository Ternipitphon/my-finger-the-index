'use strict';
// Fixed Spotify UI actions only. The page supplies observations, never executable instructions.
function createSpotifyDOMBridge(){
 const documentId=globalThis.crypto?.randomUUID?.()||String(Math.random());
 const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&!el.closest('[hidden],[aria-hidden="true"]');};
 const all=(selector,root=document)=>Array.from(root.querySelectorAll(selector)).filter(visible);
 const label=el=>(el?.getAttribute('aria-label')||el?.textContent||'').trim();
 const norm=s=>String(s||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s“”"']+/g,' ').trim();
 const playing=el=>/pause|หยุดชั่วคราว/i.test(label(el));
 const playable=el=>!el.disabled&&el.getAttribute('aria-disabled')!=='true';
 const clock=text=>/^\d+(?::\d{1,2}){1,2}$/.test(String(text||'').trim())?String(text).trim().split(':').reduce((total,n)=>total*60+Number(n),0):null;
 const localDevices=()=>all('[role="dialog"] button,[role="menu"] button,[role="menuitem"],[data-testid="connect-device-list"] button,[data-testid="connect-device-picker"] button').filter(b=>/^(?:this web browser|this browser|เว็บเบราว์เซอร์นี้|เบราว์เซอร์นี้)$/i.test(label(b)));
 function playerControls(){
  const known=all('button[data-testid="control-button-playpause"]');if(known.length)return known;
  const roots=all('footer,[role="contentinfo"],[data-testid="now-playing-bar"]');
  return [...new Set(roots.filter(root=>root.querySelector('[data-testid="playback-position"],[data-testid="playback-progressbar"],[aria-label="Playback position"]')).flatMap(root=>all('button',root).filter(b=>/^(?:play|pause|เล่น|หยุดชั่วคราว)$/i.test(label(b)))))];
 }
 function inspect(){
  if(location.origin!=='https://open.spotify.com')throw Error('แท็บนี้ไม่ใช่ Spotify');
  const candidates=playerControls(),control=candidates.length===1?candidates[0]:null;
  const widgets=all('[data-testid="now-playing-widget"]');
  const widget=widgets.length===1?widgets[0]:null;
  const bar=control?.closest('footer,[role="contentinfo"],[data-testid="now-playing-bar"]');
  const scope=bar||widget;
  // Read only the player, never a recommendation/search result or the large right-hand detail panel.
  const links=scope?all('a[href*="/track/"]',scope).filter(a=>{try{const u=new URL(a.href);return u.origin===location.origin&&/^\/(?:intl-[a-z]{2}\/)?track\/[A-Za-z0-9]+\/?$/.test(u.pathname);}catch{return false;}}):[];
  const unique=[...new Set(links.map(a=>{const u=new URL(a.href);u.search='';u.hash='';return u.href;}))];
  const trackLink=unique.length===1?links.find(a=>a.textContent.trim()||a.getAttribute('title'))||links[0]:null;
  const titleNode=scope?all('[data-testid="context-item-info-title"],[data-testid="context-item-link"],[data-testid="nowplaying-track-link"]',scope).find(el=>el.textContent.trim()):null;
  const title=trackLink?(trackLink.textContent.trim()||trackLink.getAttribute('title')||''):links.length===0?titleNode?.textContent?.trim()||'':'';
  const trackURL=trackLink?unique[0]:'';
  const media=Array.from(document.querySelectorAll('audio'));const audio=media.find(a=>!a.paused&&!a.ended);const localMedia=audio||(media.length===1?media[0]:null);
  const deviceText=all('[data-testid="connect-bar"],[data-testid="connect-bar-player"]').map(label).join(' ');
  const progress=document.querySelector('[data-testid="playback-progressbar"] input[type="range"], [data-testid="playback-progressbar"] [aria-valuenow], [data-testid="playback-progressbar"][aria-valuenow], input[aria-label="Playback position"], [aria-label="Playback position"][aria-valuenow]');
  const raw=progress?.getAttribute('aria-valuenow')??progress?.value;
  const seconds=document.querySelector('[data-testid="playback-position"]')?.textContent?.trim();
  const time=seconds&&/^(?:\d+:)?\d+:\d+$/.test(seconds)?seconds.split(':').reduce((a,n)=>a*60+Number(n),0):null;
  const position=audio?audio.currentTime:raw!=null&&raw!==''&&Number.isFinite(Number(raw))?Number(raw):time;
  const duration=clock(document.querySelector('[data-testid="playback-duration"]')?.textContent);
  const playerLoaded=!!control&&playable(control)&&(!!title||!!trackURL||Number.isFinite(position)&&position>0||Number.isFinite(duration)&&duration>0);
  const rows=all('[data-testid="tracklist-row"], [role="row"]').map(row=>{const link=row.querySelector('a[href*="/track/"]');if(!link)return null;return{title:link.textContent.trim(),url:link.href,artists:Array.from(row.querySelectorAll('a[href*="/artist/"]')).map(a=>a.textContent.trim())};}).filter(Boolean).slice(0,100);
  const playlists=all('a[href*="/playlist/"]').map(a=>({title:label(a),url:a.href})).filter(a=>a.title).filter((a,i,list)=>list.findIndex(b=>b.url===a.url)===i).slice(0,80);
  return{documentId,documentReady:document.readyState,remoteDevice:/listening on|กำลังฟังบน|กำลังเล่นบน/i.test(deviceText),canChooseLocal:localDevices().length===1,localAudio:localMedia?{paused:localMedia.paused,muted:localMedia.muted,volume:localMedia.volume,readyState:localMedia.readyState,error:localMedia.error?.code||null}:null,canPlayCollection:all('main button[data-testid="play-button"]').filter(b=>!b.closest('[data-testid="tracklist-row"],[role="row"]')).length===1,ready:!!control&&playable(control),playerLoaded,duration,url:location.href,heading:document.querySelector('main h1')?.textContent?.trim()||'',loggedOut:all('[data-testid="login-button"],a[href*="accounts.spotify.com/login"],a[href^="/login"]').length>0,track:title,trackUrl:trackURL,artists:scope?all('a[href*="/artist/"]',scope).map(a=>a.textContent.trim()).filter(Boolean):[],playing:!!(audio||control&&playing(control)),position,positionKind:audio?'audio':raw!=null?'progress':time!=null?'clock':null,rows,playlists,alerts:all('[role="alert"]').map(label).join(' ').slice(0,500)};
 }
 async function execute(a={}){
  const before=inspect();if(a.action==='inspect')return before;
  if(!['play','pause','next','previous','open-device-picker','choose-local'].includes(a.action))throw Error('Unsupported Spotify operation');
  if(before.documentReady!=='complete')throw Error('Spotify ยังโหลดไม่เสร็จ ยังไม่ได้กดปุ่ม');
  if(before.loggedOut)throw Error('กรุณาเข้าสู่ระบบ Spotify ในแท็บนี้ก่อน ยังไม่ได้กดเล่น');
  if(a.expectedDocumentId&&before.documentId!==a.expectedDocumentId)throw Error('เอกสาร Spotify เปลี่ยนไป อ่านตัวเล่นใหม่ก่อน');
  if(before.url!==a.expectedUrl||a.expectedHeading&&norm(before.heading)!==norm(a.expectedHeading))throw Error('หน้า Spotify เปลี่ยนไปแล้ว อ่านหน้าใหม่ก่อนเล่น');
  let controls;
  if(a.action==='pause'){
   if(!before.playing)return{clicked:false,alreadyPaused:true,observed:before};
   controls=playerControls();
   if(controls.length===1&&!playing(controls[0]))throw Error('สถานะปุ่มหยุดไม่ตรงกับตัวเล่น อ่านใหม่ก่อน');
  }else if(a.action==='next'||a.action==='previous')controls=all('button[data-testid="'+(a.action==='next'?'control-button-skip-forward':'control-button-skip-back')+'"]');
  else if(a.action==='open-device-picker')controls=all('button[data-testid="control-button-connect"],button[data-testid="connect-device-button"],button[aria-label="Connect to a device"],button[aria-label="เชื่อมต่อกับอุปกรณ์"]');
  else if(a.action==='choose-local')controls=localDevices();
  else if(a.current)controls=playerControls();
  else{
   controls=all('main [data-testid="action-bar-row"] button[data-testid="play-button"]');
   if(!controls.length)controls=all('main button[data-testid="play-button"]').filter(b=>!b.closest('[data-testid="tracklist-row"],[role="row"]'));
  }
  if(controls.length!==1)throw Error(['open-device-picker','choose-local'].includes(a.action)?'ยังเลือกอุปกรณ์ในเว็บไม่ได้ เลือก This web browser ใน Spotify ก่อน':'ไม่พบปุ่มควบคุม Spotify ที่ระบุได้ชัดเจน ยังไม่ได้กดปุ่ม');
  const button=controls[0];if(!playable(button))throw Error('Spotify ยังไม่อนุญาตให้ใช้ปุ่มเล่น '+before.alerts);
  if(a.action==='play'&&playing(button))return{clicked:false,alreadyPlaying:true,observed:before};
  // Only fixed playback controls, or an exact This Web Browser option in the device picker. No like/save/shuffle/account changes.
  button.scrollIntoView({block:'center'});button.click();
  return{clicked:true,observed:inspect()};
 }
 return{execute};
}
if(typeof module!=='undefined')module.exports=createSpotifyDOMBridge;else{globalThis.createCapriiSpotifyDOMBridge=createSpotifyDOMBridge;globalThis.__capriiSpotifyDriver=7;}
void 0;
