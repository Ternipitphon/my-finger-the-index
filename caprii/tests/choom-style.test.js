'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {personalityMessages,CHOOM_RULE}=require('../src/main/personality');
const {thaiResponse,needsThai}=require('../src/main/thai-language');
test('Playful uses choom without changing Normal or Caring preferences',()=>{
 const messages=[{role:'system',content:'Reply ONLY JSON'},{role:'user',content:'กรอกข้อความว่า สวัสดีครับ และเลข 126'}];
 const playful=personalityMessages(messages,{personalityStyle:'playful'});assert.ok(playful[0].content.includes(CHOOM_RULE));assert.equal(playful[1].content,messages[1].content);assert.equal(messages[0].content,'Reply ONLY JSON');
 for(const personalityStyle of ['normal','caring'])assert.doesNotMatch(personalityMessages(messages,{personalityStyle})[0].content,/choom/i);
});
test('isolated Playful repair retains only the choom address rule, not old persona history',async()=>{
 let calls=0;const result=await thaiResponse({personality:{personalityStyle:'playful'},messages:[{role:'system',content:'OLD_PERSONA_HISTORY'}],request:async m=>{
  if(++calls===1)return 'มึง เลขรับเรื่อง 126';
  assert.ok(m[0].content.includes(CHOOM_RULE));assert.doesNotMatch(m[0].content,/OLD_PERSONA_HISTORY/);return 'เลขรับเรื่องคือ 126 นะ choom';
 }});assert.equal(result,'เลขรับเรื่องคือ 126 นะ choom');assert.equal(calls,2);
});
test('Normal and Caring repairs do not inherit the Playful nickname rule',async()=>{
 for(const personalityStyle of ['normal','caring']){let calls=0;await thaiResponse({personality:{personalityStyle},messages:[],request:async m=>{if(++calls===1)return 'มึง เลขรับเรื่อง 126';assert.doesNotMatch(m[0].content,/choom/i);return 'เลขรับเรื่องคือ 126';}});}
});
test('choom alone is an allowed address while ordinary English prose still needs Thai',()=>{
 assert.equal(needsThai('choom!'),false);assert.equal(needsThai('Choom'),false);assert.equal(needsThai('I can help you, choom'),true);
});
test('attached-image style preserves literal requested data while applying the selected voice',()=>{
 const m=require('../src/main/image-attachments').imageMessages({prompt:'อ่านรหัส 126',persona:'You are Caprii.',dataURL:'data:image/png;base64,test',personality:{personalityStyle:'playful'}});assert.ok(m[0].content.includes(CHOOM_RULE));assert.equal(m[1].content[0].text,'อ่านรหัส 126');
});
test('semantic clarification receives choom wording without changing the action request',async()=>{
 const {interpretCommand}=require('../src/main/command-interpreter');let seen;
 const r=await interpretCommand({text:'เอาอันนี้ให้หน่อย',personality:{personalityStyle:'playful'},request:async m=>{seen=m;return JSON.stringify({route:'clarify',confidence:.7});}});
 assert.ok(seen[0].content.includes(CHOOM_RULE));assert.equal(JSON.parse(seen[1].content).current,'เอาอันนี้ให้หน่อย');assert.match(r.question,/choom/);assert.doesNotMatch(r.question,/ครับ|ค่ะ/);
 const missing=await interpretCommand({text:'ใช้แท็บนี้',connected:false,personality:{personalityStyle:'playful'},request:async()=>JSON.stringify({route:'selected-tab',confidence:1})});assert.match(missing.question,/choom/);
});
