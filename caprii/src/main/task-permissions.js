"use strict";
// Permissions live only in this task; completion/abort revokes every grant.
function scopeFor(a) {
  if (['desktop.windows','desktop.expect'].includes(a.tool)) return 'windows';
  if(a.tool==='desktop.look' && a.displayId!=null) return 'screen:'+a.displayId;
  const w=a.target;
  if(a.tool==='desktop.input' && w?.processId && w?.processStart && !a.allowOutsideWindow && a.risk!=='sensitive'
    && !/powershell|terminal|command prompt|security|password|รหัสผ่าน/i.test(w.title)
    && ['move','click','doubleclick','rightclick','drag','type','scroll','focus','key'].includes(a.kind)
    && (a.kind!=='key'||['enter','tab','escape','backspace','up','down','left','right','home','end','pageup','pagedown','space','ctrl+a','ctrl+c','ctrl+f'].includes(a.key)))
    return 'window:'+JSON.stringify([w.handle,w.processId,w.processStart,w.title,a.displayId]);
  return null;
}
function createTaskPermissions({signal,prompt,now=Date.now,expiresAt=now()+300000,automatic=()=>false}) {
 const grants=new Set();let cleared=false;
 const active=()=>!cleared&&!signal.aborted&&now()<expiresAt;
 return {clear(){cleared=true;grants.clear();},async approve(action){
   if(!active())return false;
   if(automatic() && /^(?:desktop|browser|uia|launcher)\./.test(action.tool))return true;
   const scope=scopeFor(action);
   if(scope&&grants.has(scope))return true;
   const decision=await prompt(action,!!scope);
   if(!active())return false;
   if(decision==='task'&&scope){grants.add(scope);if(scope.startsWith('window:')){grants.add('windows');if(action.displayId!=null)grants.add('screen:'+action.displayId);}return true;}
   return decision==='once';
 }};
}
module.exports={scopeFor,createTaskPermissions};
