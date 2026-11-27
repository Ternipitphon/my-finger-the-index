'use strict';
// This snapshot uses only metadata from the already-authorized Chrome connection.
// It does not enumerate windows, capture a screen, or read page content in the background.
function decisionContext(chrome={},now=Date.now()){
 const live=chrome.connected===true&&chrome.responsive!==false;
 if(!live)return{capturedAt:now,screenObserved:false,windowsObserved:false,tab:null};
 let url;try{url=new URL(chrome.url);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid URL');url.search='';url.hash='';}catch{return{capturedAt:now,screenObserved:false,windowsObserved:false,tab:null};}
 return{capturedAt:now,screenObserved:false,windowsObserved:false,tab:{url:url.href.slice(0,2000),title:String(chrome.title||'').replace(/[\x00-\x1f]/g,' ').slice(0,200),source:'authorized-chrome-metadata',pageContentObserved:false}};
}
function validateAssessment(value){
 if(value===undefined)return null; // older/custom models may omit optional metadata
 if(!value||typeof value!=='object'||typeof value.outcome!=='string'||!value.outcome.trim()||value.outcome.length>500||!Array.isArray(value.missing)||value.missing.length>8||value.missing.some(x=>typeof x!=='string'||!x.trim()||x.length>120)||typeof value.ambiguous!=='boolean'||!['current-message','conversation','connected-tab','unspecified'].includes(value.targetSource))throw Error('Invalid decision assessment');
 return{outcome:value.outcome,missing:value.missing,ambiguous:value.ambiguous,targetSource:value.targetSource};
}
module.exports={decisionContext,validateAssessment};
