'use strict';
// This factory runs only in an isolated browser/extension world. No eval or page-provided code.
function createDOMBridge() {
 let elements=[],generation='',descriptions=[];
 const describe=el=>({tag:el.tagName.toLowerCase(),type:el.type||'',label:(el.getAttribute('aria-label')||Array.from(el.labels||[]).map(x=>x.innerText).join(' ')||el.innerText||el.placeholder||el.name||'').slice(0,150),disabled:!!el.disabled||el.getAttribute('aria-disabled')==='true',readOnly:!!el.readOnly,editable:el.isContentEditable||(['INPUT','TEXTAREA'].includes(el.tagName)&&!el.readOnly&&!el.disabled&&!['password','file','hidden'].includes(el.type)),value:el.type==='password'?undefined:(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)?String(el.value).slice(0,4000):el.isContentEditable?el.textContent.slice(0,4000):undefined),href:el.tagName==='A'?el.href:undefined});
 function read(){
  elements=Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"],[contenteditable="true"]')).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}).slice(0,80);
  descriptions=elements.map(describe);generation=Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>n.toString(16).padStart(2,'0')).join('');
  return{title:document.title,url:location.href,text:(document.body?.innerText||'').slice(0,14000),generation:String(generation),elements:descriptions.map((e,id)=>({id,...e}))};
 }
 async function execute(op,a={}){
  if(op==='read')return read();
  if(!['click','type','verify'].includes(op))throw Error('Unsupported DOM operation');
  if(a.generation!==String(generation))throw Error('หน้าเว็บเปลี่ยนแล้ว กรุณาอ่านหน้าใหม่');
  const el=elements[a.id];if(!el?.isConnected||el.disabled)throw Error('ไม่พบช่องหรือปุ่มเดิม กรุณาอ่านหน้าใหม่');
  if(el.type==='password'||el.type==='file')throw Error('ไม่รองรับช่องรหัสผ่านหรืออัปโหลดไฟล์');
  const now=describe(el),old=descriptions[a.id];if(now.disabled)throw Error('ปุ่มหรือช่องนี้ยังใช้งานไม่ได้');if(now.label!==old.label||now.tag!==old.tag||now.type!==old.type)throw Error('ปุ่มหรือช่องเปลี่ยนไปแล้ว กรุณาอ่านหน้าใหม่');
  if(op==='verify'){const actual=el.isContentEditable?el.textContent:el.value;return{passed:actual===a.value,expected:a.value,observedValue:String(actual??'').slice(0,4000),observed:read()};}
  if(op==='click'){el.scrollIntoView({block:'center',inline:'nearest'});el.focus({preventScroll:true});el.click();}
  else{
   if(!now.editable)throw Error('ช่องนี้พิมพ์ตรง ๆ ไม่ได้หรือเป็น read-only ให้ใช้ปุ่มแป้นคำตอบบนเว็บ');
   if(typeof a.value!=='string'||a.value.length>4000)throw Error('ข้อความยาวเกินกำหนด');
   el.scrollIntoView({block:'center',inline:'nearest'});el.focus({preventScroll:true});
   if(el.isContentEditable)el.textContent=a.value;
   else Object.getOwnPropertyDescriptor(el.tagName==='INPUT'?HTMLInputElement.prototype:HTMLTextAreaElement.prototype,'value').set.call(el,a.value);
   el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  await new Promise(resolve=>setTimeout(resolve,180));
  const inputConfirmed=op==='type'?(el.isConnected&&(el.isContentEditable?el.textContent:el.value)===a.value):undefined;
  if(inputConfirmed===false)throw Error('ช่องเว็บไม่เก็บข้อความที่กรอก กรุณาอ่านหน้าใหม่และใช้แป้นบนเว็บหากจำเป็น');
  return{performed:true,inputConfirmed,observed:read()};
 }
 return{execute};
}
if(typeof module!=='undefined')module.exports=createDOMBridge;
else globalThis.createCapriiDOMBridge=createDOMBridge;

void 0; // Chrome injection must not return a function-valued object.
