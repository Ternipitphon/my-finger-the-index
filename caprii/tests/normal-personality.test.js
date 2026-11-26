'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {personalityMenu,personalityMessages,NORMAL_RULE}=require('../src/main/personality');
test('personality menu chooses Normal and preserves that selection after rebuild',()=>{
 let cfg={rebeccaPersonality:true};const change=value=>cfg.rebeccaPersonality=value;
 const menu=personalityMenu(cfg.rebeccaPersonality,change);assert.equal(menu.label,'นิสัย');assert.equal(menu.submenu[1].checked,true);
 menu.submenu[0].click();const rebuilt=personalityMenu(cfg.rebeccaPersonality,change,'en');assert.equal(rebuilt.submenu[0].label,'Normal');assert.equal(rebuilt.submenu[0].checked,true);assert.equal(rebuilt.submenu[1].checked,false);rebuilt.submenu[1].click();assert.equal(cfg.rebeccaPersonality,true);
});
test('Normal adds style without changing exact commands, JSON contracts, or image data',()=>{
 const image={type:'image_url',image_url:{url:'data:image/png;base64,test'}};
 const source=[{role:'system',content:'Reply ONLY JSON. Never submit without permission.'},{role:'user',content:[{type:'text',text:'ห้ามส่ง'},image]}];
 const result=personalityMessages(source,false);assert.ok(result[0].content.includes(NORMAL_RULE));assert.match(result[0].content,/Reply ONLY JSON/);assert.deepEqual(result[1],source[1]);assert.equal(source[0].content,'Reply ONLY JSON. Never submit without permission.');
 const messages=require('../src/main/image-attachments').imageMessages({prompt:'อ่านรหัส',persona:'You are Caprii.',dataURL:'data:image/png;base64,test',personality:false});assert.match(messages[0].content,/บุคลิกปกติ/);
});
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
function moduleUrl(file){const s=fs.readFileSync(file,'utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${moduleUrl(path.resolve(path.dirname(file),p))}'`);return'data:text/javascript;base64,'+Buffer.from(s).toString('base64');}
test('Normal avoids legacy roleplay even with Focus disabled; Playful is still available',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));
 const c=new Chat({capri:{},panel:{},voice:{},brain:{lang:'th'},host:{onChatDelta(){}}});
 c.characterMode=false;c.focusedAssistant=false;c.bond={persona(){throw Error('Normal must not receive mood roleplay');},moodLine(){throw Error('Normal must not receive mood roleplay');}};
 assert.match(c.persona(),/นิสัยปกติ/);assert.doesNotMatch(c.persona(),/dream of|jealous/i);assert.match(c.lookPersona(),/นิสัยปกติ/);
 c.characterMode=true;assert.match(c.characterStyle(),/รีเบคก้า/);
});
