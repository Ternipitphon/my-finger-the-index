"use strict";
function createOverlayInput(getWindow){
 let held=false,interactive=false;
 const apply=()=>{const window=getWindow();if(window&&!window.isDestroyed())window.setIgnoreMouseEvents(!(held||interactive),{forward:true});};
 return {get held(){return held;},setInteractive(on){interactive=on===true;apply();},hold(on){held=on===true;apply();},reset(){held=false;interactive=false;apply();},rearm(){if(held){apply();return false;}const window=getWindow();if(!window||window.isDestroyed())return false;window.setIgnoreMouseEvents(false);interactive=false;apply();return true;}};
}
module.exports={createOverlayInput};
