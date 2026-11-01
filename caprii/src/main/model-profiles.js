'use strict';
const tier=model=>/flash-lite/i.test(model)?'lite':/flash/i.test(model)?'flash':/pro/i.test(model)?'pro':'other';
const version=model=>Number(/gemini-(\d+(?:\.\d+)?)/i.exec(model)?.[1]||0);
const stable=model=>!/preview|experimental|(?:^|-)exp(?:-|$)|customtools/i.test(model);
function candidates(models,profile){
 const valid=[...new Set(models||[])].filter(m=>/gemini/i.test(m)&&stable(m));
 const preferred=profile==='quality'?(valid.some(m=>tier(m)==='pro')?'pro':'flash'):profile==='balanced'?'flash':profile==='speed'?'lite':null;
 return valid.filter(m=>tier(m)===preferred).sort((a,b)=>version(b)-version(a));
}
function fallbackModels({provider,selected,models=[]}){
 if(provider!=='gemini')return[selected,...models];
 // A busy Lite must not silently become a potentially more expensive Pro, or vice versa.
 const family=tier(selected||'');return[selected,...models.filter(m=>m!==selected&&tier(m)===family&&stable(m))];
}
module.exports={candidates,fallbackModels,tier};
