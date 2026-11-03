// During a hold, use Electron's native DIP cursor independently of DOM mouse forwarding.
export function trackDragCursor({capri,cursor,onHeld=()=>{},interval=32}){
 let pending=false,stopped=false;
 const tick=async()=>{
  if(stopped||pending||!capri.pointerHeld)return;
  pending=true;
  try{const at=await cursor();if(!stopped&&capri.pointerHeld&&at&&Number.isFinite(at.x)&&Number.isFinite(at.y)){onHeld();capri.dragTo(at);}}catch{}finally{pending=false;}
 };
 const timer=setInterval(tick,interval);
 return {tick,stop(){stopped=true;clearInterval(timer);}};
}
