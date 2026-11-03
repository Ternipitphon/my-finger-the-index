"use strict";
// A stale helper sample must be unknown, never an invented mouse-up.
function createMouseButtonState({now=Date.now,maxAge=320}={}){
 let sample=null;
 return {update(message){if(message?.kind!=="mouse-button"||typeof message.primaryDown!=="boolean")return false;sample={down:message.primaryDown,at:now()};return true;},clear(){sample=null;},value(){if(!sample||now()-sample.at>maxAge)return null;return sample.down;}};
}
module.exports={createMouseButtonState};
