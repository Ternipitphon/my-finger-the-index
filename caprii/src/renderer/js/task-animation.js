// Visual reactions only. This adapter never captures a screen, grants access, retries a tool,
// changes its arguments/results, or moves focus. Manual demo/idle behaviour stays independent.
export class TaskAnimation {
 constructor({capri,reduced=()=>false,now=()=>performance.now(),schedule=(fn,ms)=>setInterval(fn,ms),unschedule=id=>clearInterval(id),onState=()=>{}}){
  Object.assign(this,{capri,reduced,now,schedule,unschedule,onState});this.enabled=true;this.active=null;this.timer=null;this.lastPose=-Infinity;this.ownedAct=null;
 }
 configure(cfg={}){this.enabled=cfg.taskAnimations!==false;if(!this.enabled||cfg.motion==='reduced'||cfg.visible===false||this.active?.automatic&&cfg.watchScreen===false)this.cancel();}
 pose(name){
  const c=this.capri;
  if(!this.enabled||this.reduced()||c.hidden||c.stowed||c.dormant||c.busy||c.sky||c.act||['held','fly','down','fall','peek'].includes(c.stance)||this.now()-this.lastPose<1200)return;
  try{this.lastPose=this.now();const before=c.act;const result=c.perform(name);if(c.act&&c.act!==before)this.ownedAct=c.act;Promise.resolve(result).catch(()=>{});}catch{}
 }
 safely(fn){try{return fn();}catch{try{this.cancel();}catch{}return null;}}
 state(value){try{this.onState(value);}catch{}}
 begin(kind,request={}){
  const id=request?.id??Symbol(kind),same=this.active&&this.active.id===id;
  const started=same?this.active.started:this.now();this.cancel();
  const token={id,kind,started,automatic:request?.automatic===true,phase:'working'};if(!this.enabled)return token;this.active=token;this.state('working');this.pose(kind==='look'?'look':'curious');
  let count=0;token.tick=()=>{if(this.active===token&&token.phase==='working')this.pose(++count%3===0?'split':'look');};if(!this.reduced())this.timer=this.schedule(token.tick,12000);
  return token;
 }
 phase({id,phase}={}){if(!this.active||this.active.id!==id)return;if(phase==='cancelled'){this.cancel();return;}if(!['working','waiting'].includes(phase))return;this.active.phase=phase;if(phase==='waiting'&&this.timer!==null){this.unschedule(this.timer);this.timer=null;}else if(phase==='working'&&this.timer===null&&!this.reduced())this.timer=this.schedule(this.active.tick,12000);this.state(phase);if(phase==='waiting')this.pose('curious');}
 finish(token,outcome='neutral'){
  if(this.active!==token)return;const long=token.kind==='agent'&&this.now()-token.started>=120000;
  this.cancel();this.state(outcome);
  if(outcome==='success')this.pose(long?'victory':'hop');
  else if(outcome==='failed')this.pose('flinch');
  else if(outcome==='reply'||outcome==='waiting')this.pose('curious');
 }
 cancel(){const timer=this.timer;this.timer=null;this.active=null;if(timer!==null){try{this.unschedule(timer);}catch{}}if(this.ownedAct&&this.capri.act===this.ownedAct){try{this.capri.endAct(false);}catch{}}this.ownedAct=null;this.state('idle');}
 wrapHost(raw){
  const wrapped={...raw};
  const kinds={commandInterpret:'decision',mediaInterpret:'decision',taskInterpret:'decision',mediaRun:'media',agentRun:'agent',chatSend:'chat',chatImageSend:'image',lookSnap:'look',lookSay:'look',openSite:'website'};
  for(const [name,kind] of Object.entries(kinds)){
   if(typeof raw[name]!=='function')continue;
   wrapped[name]=async(...args)=>{
    const request=typeof args[0]==='object'&&args[0]!==null?args[0]:{};
    const token=this.safely(()=>this.begin(kind,request));
    try{
     const result=await raw[name](...args);
     if(!token||this.active!==token)return result;
     if(name==='lookSnap'&&result?.ok===true){token.id=result.id;return result;}
     if(kind==='decision'&&result?.ok===true){
      if(result.route==='clarify'){this.safely(()=>this.finish(token,'waiting'));}
      else if(result.route==='chat'){this.safely(()=>this.finish(token,typeof result.reply==='string'&&result.reply.trim()?'reply':'neutral'));}
      // An interpretation is a plan, never proof that its requested action finished.
      return result;
     }
     const outcome=result?.canceled===true?'neutral':kind==='website'?'neutral':result?.clarification?'waiting':result?.ok!==true?'failed':
      ['media','agent'].includes(kind)?result.verified===true?'success':'neutral':typeof result.text==='string'&&result.text.trim()?'reply':'neutral';
     this.safely(()=>this.finish(token,outcome));return result;
    }catch(error){if(token&&this.active===token)this.safely(()=>this.finish(token,error?.name==='AbortError'?'neutral':'failed'));throw error;}
   };
  }
  if(typeof raw.chatStop==='function')wrapped.chatStop=(...args)=>{this.safely(()=>this.cancel());return raw.chatStop(...args);};
  if(typeof raw.lookWhere==='function')wrapped.lookWhere=(...args)=>{if(this.active)this.safely(()=>this.phase({id:this.active.id,phase:'waiting'}));return raw.lookWhere(...args);};
  return wrapped;
 }
}
