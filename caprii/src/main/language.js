'use strict';
function resolveLanguage(setting,locale='th'){if(setting==='auto')return /^th(?:-|$)/i.test(locale)?'th':'en';return setting==='en'?'en':'th';}
function languageMenu(setting,onSelect){return [['th','ไทย — ภาษาหลัก'],['en','English — primary language']].map(([value,label])=>({id:'caprii-language-'+value,label,type:'radio',checked:resolveLanguage(setting)===value,click:()=>onSelect(value)}));}
module.exports={resolveLanguage,languageMenu};
