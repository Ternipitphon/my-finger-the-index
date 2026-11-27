'use strict';
// Native menus retain keyboard, check/radio state and the original handlers; only hierarchy changes.
function organizeMenu(items,{lang='th',version=''}={}){
 const en=lang==='en',label=(th,english)=>en?english:th;
 const remaining=new Set(items.filter(item=>item.type!=='separator'));
 const take=id=>{const item=items.find(item=>item.id===id);if(item)remaining.delete(item);return item;};
 const takeMany=ids=>ids.map(take).filter(Boolean);
 const group=(id,name,children)=>children.length?{id,label:name,submenu:children}:null;
 const separator=()=>({type:'separator'});
 const rename=(item,name)=>item?{...item,label:name}:null;
 const quick=[rename(take('caprii-talk'),label('คุยกับ Caprii','Talk to Caprii')),rename(take('caprii-look'),label('ดูหน้าจอตอนนี้','Look at screen')),rename(take('caprii-pickup'),label('ย้ายตัวละคร','Move character')),take('caprii-visibility')].filter(Boolean);
 const personality=group('caprii-group-personality',label('นิสัยและเสียง','Personality & audio'),takeMany(['caprii-personality','caprii-response-length','caprii-speech','caprii-sound','caprii-idle-chatter']));
 const chrome=group('caprii-group-chrome',label('Chrome และเพลง','Chrome & music'),takeMany(['caprii-pair','caprii-forget-chrome','caprii-extension','caprii-spotify-desktop','caprii-spotify-auto']));
 let model=take('caprii-model');
 if(model?.submenu){
  const sections=[[]];for(const item of model.submenu){if(item.type==='separator')sections.push([]);else sections.at(-1).push(item);}
  if(sections.length===4)model={...model,submenu:[...sections[0],separator(),group('caprii-providers',label('ผู้ให้บริการ AI','AI provider'),sections[1]),group('caprii-models',label('เลือกรุ่นโมเดล','Choose model'),sections[2]),separator(),...sections[3]].filter(Boolean)};
 }
 const codingItems=takeMany(['caprii-watch','caprii-report','caprii-hooks-status','caprii-hooks-remove']);
 const coding=group('caprii-coding-tools',label('ผู้ช่วยเขียนโค้ด','Coding assistants'),codingItems);
 const ai=group('caprii-group-ai',label('AI และงาน','AI & tasks'),[model,...takeMany(['caprii-model-profile','caprii-auto-actions','caprii-task-window','caprii-focus','caprii-screen-commentary']),coding].filter(Boolean));
 const behavior=group('caprii-character-behavior',label('พฤติกรรมตัวละคร','Character behavior'),takeMany(['caprii-wander','caprii-possess','caprii-jealous','caprii-pc-react']));
 const effects=group('caprii-character-effects',label('ลูกเล่นตัวละคร','Character effects'),takeMany(['caprii-task-animations','caprii-teleport','caprii-satellite','caprii-demo']));
 const character=group('caprii-group-character',label('ตัวละครและหน้าจอ','Character & display'),[...takeMany(['caprii-custom','caprii-size','caprii-screen','caprii-rest','caprii-motion']),behavior,effects].filter(Boolean));
 const diagnostics=group('caprii-diagnostics',label('ทดสอบและแก้ปัญหา','Tests & troubleshooting'),takeMany(['caprii-lab','caprii-desktop-test','caprii-reach','caprii-display']));
 const about=group('caprii-about',label('เกี่ยวกับ Caprii','About Caprii'),takeMany(['caprii-version','caprii-online','caprii-bond']));
 const settingsItems=takeMany(['caprii-language','caprii-startup','caprii-reminders','caprii-help']);
 const quit=take('caprii-quit');
 // New/future actions are kept reachable rather than silently disappearing.
 const extra=group('caprii-extra',label('เพิ่มเติม','More'),[...remaining]);
 const settings=group('caprii-group-settings',label('ตั้งค่าและช่วยเหลือ','Settings & help'),[...settingsItems,separator(),diagnostics,about,extra].filter(Boolean));
 const groups=[personality,chrome,ai,character,settings].filter(Boolean);
 return[{id:'caprii-menu-header',label:'Caprii'+(version?' · '+version:''),enabled:false},separator(),...quick,separator(),...groups,...(quit?[separator(),quit]:[])];
}
module.exports={organizeMenu};
