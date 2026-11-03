(()=>{
 if(globalThis.__capriiPolling)return;globalThis.__capriiPolling=true;
 const dom=createCapriiDOMBridge();
 const spotify=createCapriiSpotifyDOMBridge();
 const poll=async()=>{
  try{
   const r=await chrome.runtime.sendMessage({type:'poll'});if(r?.stop||r?.error){globalThis.__capriiPolling=false;return;}
   if(r?.command){const c=r.command;let result,error;try{if(c.op==='media-navigate'){await chrome.runtime.sendMessage({type:'mediaNavigate',id:c.id,url:c.args.url});if(globalThis.__capriiPolling)setTimeout(poll,800);return;}result=c.op==='spotify'?await spotify.execute(c.args):await dom.execute(c.op,c.args);}catch(e){error=e.message;}
    await chrome.runtime.sendMessage({type:'reply',id:c.id,result,error});}
  }catch{globalThis.__capriiPolling=false;return;}
  if(globalThis.__capriiPolling)setTimeout(poll,800);
 };poll();
})();
