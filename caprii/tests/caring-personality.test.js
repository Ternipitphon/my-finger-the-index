'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {resolvePersonality,personalityMenu,personalityMessages}=require('../src/main/personality');
test('previous selections migrate and Playful remains the default',()=>{
 assert.equal(resolvePersonality({}), 'playful');assert.equal(resolvePersonality({rebeccaPersonality:true}),'playful');assert.equal(resolvePersonality({rebeccaPersonality:false}),'normal');assert.equal(resolvePersonality({personalityStyle:'caring',rebeccaPersonality:true}),'caring');
});
test('Caring selection saves through real config and survives a new config instance',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'caprii-personality-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 function load(){const box={module:{exports:{}},require:n=>n==='electron'?{app:{getPath:()=>dir}}:require(n),console};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/main/config.js'),'utf8'),box);return box.module.exports;}
 const config=load();assert.equal(resolvePersonality(config.load()),'playful');
 personalityMenu(config.load(),value=>{const mode=resolvePersonality(value);config.save({personalityStyle:mode,rebeccaPersonality:mode!=='normal'});}).submenu.find(x=>x.id==='caprii-personality-caring').click();
 const saved=load().load();assert.equal(resolvePersonality(saved),'caring');const menu=personalityMenu(saved,()=>{},'en');assert.equal(menu.submenu.filter(x=>x.checked).length,1);assert.equal(menu.submenu[2].label,'Caring');assert.equal(menu.submenu[2].checked,true);assert.equal(saved.watchScreen,false);
});
test('all styles retain Caprii, exact evidence, user messages and JSON contracts',()=>{
 const source=[{role:'system',content:'Reply ONLY JSON. Never submit without permission.'},{role:'user',content:'รหัสที่เห็นคือ 126 ห้ามส่ง'}];
 for(const personalityStyle of ['playful','caring','normal']){
  const r=personalityMessages(source,{personalityStyle});assert.match(r[0].content,/Caprii/);assert.match(r[0].content,/Reply ONLY JSON/);assert.match(r[0].content,/หลักฐาน/);assert.match(r[0].content,/คง JSON/);assert.equal(r[1].content,source[1].content);assert.equal(source[0].content,'Reply ONLY JSON. Never submit without permission.');
  const image=require('../src/main/image-attachments').imageMessages({prompt:'อ่านรหัส',persona:'You are Caprii.',dataURL:'data:image/png;base64,test',personality:{personalityStyle}});assert.match(image[0].content,personalityStyle==='caring'?/นิสัยเป็นห่วง/:personalityStyle==='normal'?/บุคลิกปกติ/:/กวนแบบเป็นมิตร/);
 }
});
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
function moduleUrl(file){const s=fs.readFileSync(file,'utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${moduleUrl(path.resolve(path.dirname(file),p))}'`);return'data:text/javascript;base64,'+Buffer.from(s).toString('base64');}
test('screen and chat personas use the selected style without old bond concern or jealousy leaking in',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 const c=new Chat({capri:{},panel:{},voice:{},brain:{lang:'th'},host:{onChatDelta(){}}});c.focusedAssistant=false;c.characterMode=true;
 c.bond={persona(){throw Error('Old bond persona must not override selected style');},moodLine(){throw Error('Old mood must not override selected style');}};c.jealousy={context(){throw Error('Old jealousy must not override selected style');}};
 c.personalityStyle='playful';assert.match(c.persona(),/ขี้แซว/);assert.match(c.lookPersona(),/ไม่แทรกความห่วง/);
 c.personalityStyle='caring';assert.match(c.persona(),/นิสัยเป็นห่วง/);assert.match(c.lookPersona(),/นิสัยเป็นห่วง/);
 c.personalityStyle='normal';c.characterMode=false;assert.match(c.persona(),/นิสัยปกติ/);
});
