'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {personalityMessages}=require('../src/main/personality');
const {createImageAttachments,imageMessages,MAX_FILE}=require('../src/main/image-attachments');
const PNG=Buffer.from([137,80,78,71,13,10,26,10,0]);
function nativeStub(size={width:320,height:180}){const image={isEmpty:()=>false,getSize:()=>size,toPNG:()=>PNG,toJPEG:()=>Buffer.from('jpeg'),toDataURL:()=> 'data:image/png;base64,'+PNG.toString('base64'),resize:options=>nativeStub({width:options.width,height:options.height}).createFromBuffer()};return{createFromBuffer:()=>image};}
function moduleUrl(file){const source=fs.readFileSync(file,'utf8').replace(/from '(\.\/[^']+)'/g,(_,relative)=>`from '${moduleUrl(path.resolve(path.dirname(file),relative))}'`);return 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');}
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
test('default personality adds friendly direct style without changing user data or tool requirements',()=>{
 const original=[{role:'system',content:'Reply ONLY JSON. Never submit without approval.'},{role:'user',content:'ห้ามส่ง'}];const result=personalityMessages(original);
 assert.match(result[0].content,/รีเบคก้า/);assert.match(result[0].content,/Reply ONLY JSON/);assert.match(result[0].content,/ไม่ใช้คำเหยียด/);assert.equal(result[1].content,'ห้ามส่ง');assert.equal(original[0].content,'Reply ONLY JSON. Never submit without approval.');
 assert.deepEqual(personalityMessages(original,false),original);
 const config=fs.readFileSync(path.join(__dirname,'../src/main/config.js'),'utf8');assert.match(config,/rebeccaPersonality:\s*true/);
});
test('attachments are bounded, resized, replace previous selections and expire without persisting pixels',()=>{
 let time=0;const store=createImageAttachments({nativeImage:nativeStub({width:3200,height:1800}),now:()=>time,ttl:10});
 const first=store.add(PNG,'sample.png');assert.equal(first.width,1600);assert.equal(first.height,900);assert.ok(!('dataURL'in first));assert.match(store.get(first.id),/^data:image\/png;base64,/);
 const second=store.add(PNG,'new.png');assert.throws(()=>store.get(first.id),/หมดอายุ/);store.remove(second.id);assert.throws(()=>store.get(second.id));
 const third=store.add(PNG);time=11;assert.throws(()=>store.get(third.id),/หมดอายุ/);
 assert.throws(()=>store.add(Buffer.from('<svg onload=evil>')),/PNG\/JPEG\/WebP/);assert.throws(()=>store.add(Buffer.alloc(MAX_FILE+1)),/15 MB/);
});
test('image questions contain actual pixels and isolate the attached picture from screenshots and old tasks',()=>{
 const messages=imageMessages({prompt:'อ่านรหัสในรูปนี้',persona:'Caprii',dataURL:'data:image/png;base64,abc'});
 assert.match(messages[0].content,/ไม่ใช่หน้าจอหรือรูปจากงานเก่า/);assert.match(messages[0].content,/รีเบคก้า/);assert.equal(messages[1].content[1].image_url.url,'data:image/png;base64,abc');
 assert.equal(messages.length,2);assert.throws(()=>imageMessages({prompt:'x'.repeat(4001),persona:'',dataURL:'x'}));
});
test('an attached picture routes image questions to image IPC instead of screen capture or desktop actions',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let request,saved;
 const chat=new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream(){},setFace(){},setAttachment(){}},voice:{},brain:{},host:{onChatDelta(){},chatImageSend:async r=>{request=r;return{ok:true,text:'เห็นรหัส CAP-57'};},chatRemember:history=>saved=history,agentRun(){throw Error('must not control desktop');},lookSnap(){throw Error('must not capture screen');}}});
 chat.open=true;chat.attachment={id:'image-token',name:'test.png',preview:'data:image/png;base64,fixture'};await chat.send('ดูจอแล้วหาคำตอบจากรูปที่ส่ง');
 assert.equal(request.attachmentId,'image-token');assert.match(request.persona,/รีเบคก้า/);assert.equal(chat.turn,0);assert.equal(chat.attachment,null);assert.ok(saved.every(m=>typeof m.content==='string'&&!m.content.includes('data:image')));
});
test('unsupported image request keeps the attachment for retry and never reports a fabricated analysis',async()=>{
 const {Chat}=await import(moduleUrl(path.join(__dirname,'../src/renderer/js/chat.js')));let displayed;
 const chat=new Chat({capri:{pulse(){}},panel:{setChatBusy(){},setActions(){},chatTurn(){},stream:text=>displayed=text},voice:{},brain:{},host:{onChatDelta(){},chatImageSend:async()=>({ok:false,error:'โมเดลนี้ดูรูปไม่ได้',code:'novision'})}});
 chat.open=true;chat.attachment={id:'token',name:'x.png'};await chat.send('รูปนี้คืออะไร');assert.equal(chat.attachment.id,'token');assert.equal(displayed,'โมเดลนี้ดูรูปไม่ได้');assert.equal(chat.history.length,0);
});

test('clipboard image import uses Electron ClipboardItem blobs and rejects text-only/oversized data',async()=>{
 const {clipboardImageBuffer}=require('../src/main/image-attachments');
 const got=await clipboardImageBuffer({read:async()=>[{types:['image/png'],getType:async()=>new Blob([PNG],{type:'image/png'})}]});assert.deepEqual(got,PNG);
 await assert.rejects(clipboardImageBuffer({read:async()=>[{types:['text/plain']}]}),/คลิปบอร์ดไม่มีรูป/);
 await assert.rejects(clipboardImageBuffer({read:async()=>[{types:['image/png'],getType:async()=>({size:MAX_FILE+1})}]}),/15 MB/);
});

test('unsupported vision errors stay explicit and cancellation never becomes fabricated success',()=>{
 const {imageError}=require('../src/main/image-attachments');assert.equal(imageError(Error('image input is not supported')).code,'novision');assert.match(imageError(Error('whatever'),true).error,/หยุด/);assert.equal(imageError(Error('quota exceeded')).error,'quota exceeded');
});
