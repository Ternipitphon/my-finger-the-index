(()=>{
 if(globalThis.__capriiPolling)return;globalThis.__capriiPolling=true;
 const dom=createCapriiDOMBridge();
 const poll=async()=>{
  try{
   const r=await chrome.runtime.sendMessage({type:'poll'});if(r?.stop||r?.error){globalThis.__capriiPolling=false;return;}
   if(r?.command){const c=r.command;let result,error;try{result=await dom.execute(c.op,c.args);}catch(e){error=e.message;}
    await chrome.runtime.sendMessage({type:'reply',id:c.id,result,error});}
  }catch{globalThis.__capriiPolling=false;return;}
  if(globalThis.__capriiPolling)setTimeout(poll,800);
 };poll();
})();
