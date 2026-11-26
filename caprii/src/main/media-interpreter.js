'use strict';
const {validateMedia}=require('./media-player');
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
function previousMedia(value){
 if(!value||value.service!=='spotify'||value.url!==undefined&&(typeof value.url!=='string'||value.url.length>4000))return null;
 if(value.action==='search'&&typeof value.query==='string'&&value.query.trim()&&value.query.length<=300)return{service:'spotify',action:'play',collection:'track',query:value.query};
 try{return{...validateMedia(value),...(['artist','playlist'].includes(value.awaiting)?{awaiting:value.awaiting}:{})};}catch{return null;}
}
async function interpretMedia({text,previous=null,lang='th',request,signal,timeoutMs=15000}){
 if(typeof text!=='string'||!text.trim()||text.length>8000)throw Error('Invalid media interpretation input');
 const old=previousMedia(previous),deadline=AbortSignal.timeout(timeoutMs),combined=signal?AbortSignal.any([signal,deadline]):deadline;
 const clarify=question=>({route:'clarify',question:question||(lang==='en'?'Please say which song or collection to play, or ask me to resume the current song.':'ต้องการเล่นเพลงไหนหรือรายการไหนครับ ถ้าเป็นเพลงที่ค้างอยู่ บอกว่าเล่นต่อได้เลย')});
 const messages=[{role:'system',content:`You interpret music requests in Thai, English or mixed language, independently of the selected reply language. Do NOT execute anything. Return only JSON: {"route":"media|chat|clarify","confidence":0.0,"question":"","continuation":false,"media":{"service":"spotify|youtube","action":"play|pause|next|previous|search","collection":"current|liked|playlist|track","query":"","artist":""}}. Do not include empty optional fields. Use chat for explanations, hypothetical examples, discussion, prohibitions, or capability questions; never turn these into playback. A polite request like 'Could you play my liked songs?' is an action. For actual Spotify requests: 'เปิดเพลง', 'play some music', 'resume', 'play the last song' mean play/current, never a made-up song or random collection. 'เพลงที่ผมกดชอบ', 'เพลงที่ถูกใจ', 'my liked songs', 'songs I liked', 'favorites' mean play/liked. A playlist uses playlist and the exact user-provided title, if any; named songs use track with exact title and optional artist. Do not translate or invent names, IDs or URLs. A bare request to open a website is not permission to override its autoplay setting. Missing details use clarify in ${lang==='en'?'English':'Thai'}. Set continuation true ONLY for an unambiguous continuation or answer to a clarification; use previous only in that case, never replay an old command when the user changes topics. Pause/next/previous use collection current. For YouTube only search is supported, using the exact query. For Spotify search use search with exact query. When the request has multiple unrelated actions, clarify instead of silently doing only one. Existing browser pairing, playback checks and permission rules still apply. No prose or other tool commands.`},{role:'user',content:JSON.stringify({text,previousMedia:old})}];
 let listener;
 try{
  combined.throwIfAborted();
  const raw=await Promise.race([Promise.resolve().then(()=>request(messages,combined)),new Promise((_,reject)=>{listener=()=>reject(combined.reason);combined.addEventListener('abort',listener,{once:true});if(combined.aborted)listener();})]);
  if(typeof raw!=='string'||raw.length>4000)throw Error('Invalid media interpretation');
  const result=JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,''));
  if(!result||!['media','chat','clarify'].includes(result.route)||typeof result.confidence!=='number'||!Number.isFinite(result.confidence)||result.confidence<0||result.confidence>1)throw Error('Invalid media route');
  if(/^(?:(?:ช่วย|กรุณา|please)\s*)?(?:(?:อย่า|ห้าม|ไม่ต้อง|do not|don't)\s*(?:เปิด|เล่น|หยุด|ข้าม|play|open|pause|stop|skip)|สอน|อธิบาย|ยกตัวอย่าง|how to|explain)/i.test(text.trim()))return{route:'chat'};
  if(result.route==='chat')return{route:'chat'};
  if(result.route==='clarify'||result.confidence<.85)return clarify(typeof result.question==='string'?result.question.trim().slice(0,300):'');
  const media=result.media;if(!media||typeof media!=='object')throw Error('No media intent');
  // Names must come from the user's words or an explicitly continued media request.
  for(const key of ['query','artist'])if(media[key]!==undefined&&(typeof media[key]!=='string'||!media[key].trim()||media[key].length>300||!norm(text).includes(norm(media[key]))&&!(result.continuation===true&&norm(media[key])===norm(old?.[key]))))throw Error('Unspecified media name');
  const search=media.action==='search';
  if(search){
   if(!['spotify','youtube'].includes(media.service)||!media.query)throw Error('Invalid search');
   return{route:'media',media:{service:media.service,action:'search',query:media.query,url:media.service==='youtube'?'https://www.youtube.com/results?search_query='+encodeURIComponent(media.query):'https://open.spotify.com/search/'+encodeURIComponent(media.query)}};
  }
  // The model cannot invent a URL. Only a link actually supplied in this message is accepted.
  const supplied=text.match(/https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:playlist|track)\/[A-Za-z0-9]+/i)?.[0];
  const value=validateMedia({service:media.service,action:media.action,collection:media.collection,...(media.query?{query:media.query}:{}),...(media.artist?{artist:media.artist}:{}),...(supplied?{url:supplied}:result.continuation===true&&old?.url?{url:old.url}:{})});
  return{route:'media',media:value};
 }catch(error){if(signal?.aborted)throw signal.reason;return clarify(lang==='en'?'I could not understand the music request yet. No playback command was sent. Try naming the song, Liked Songs, or say resume.':'ยังตีความคำสั่งเพลงไม่สำเร็จ ยังไม่ได้สั่งเล่นครับ ลองระบุชื่อเพลง เพลงที่ถูกใจ หรือเล่นต่อ');}
 finally{if(listener)combined.removeEventListener('abort',listener);}
}
module.exports={interpretMedia};
