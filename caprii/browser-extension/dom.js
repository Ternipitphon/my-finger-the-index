'use strict';
// Runs in the isolated browser/extension world; page content is always data.
function createDOMBridge() {
 let elements=[],generation='',descriptions=[],pageURL='';
 const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return el.isConnected&&r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.visibility!=='collapse'&&s.display!=='none'&&!el.closest('[hidden],[inert],[aria-hidden="true"]');};
 const disabled=el=>!!el.disabled||el.matches(':disabled')||el.getAttribute('aria-disabled')==='true';
 const editable=el=>!disabled(el)&&!el.readOnly&&(el.isContentEditable||el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&['text','search','email','url','tel','number'].includes(el.type)));
 const describe=el=>({elementId:el.id||'',name:el.name||'',tag:el.tagName.toLowerCase(),type:el.type||'',label:(el.getAttribute('aria-label')||Array.from(el.labels||[]).map(x=>x.innerText).join(' ')||el.innerText||el.placeholder||el.name||'').slice(0,150),disabled:disabled(el),readOnly:!!el.readOnly,editable:editable(el),value:['password','file','hidden'].includes(el.type)?undefined:(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)?String(el.value).slice(0,4000):el.isContentEditable?el.textContent.slice(0,4000):undefined),checked:['checkbox','radio'].includes(el.type)?el.checked:undefined,options:el.tagName==='SELECT'?Array.from(el.options).slice(0,80).map(o=>({value:o.value,label:o.label,disabled:o.disabled||o.parentElement?.disabled===true,selected:o.selected})):undefined,href:el.tagName==='A'?el.href:undefined});
 function read(){
  elements=Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"],[contenteditable]:not([contenteditable="false"]),output,[role="status"],[role="alert"]')).filter(visible).slice(0,80);
  descriptions=elements.map(describe);pageURL=location.href;generation=Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>n.toString(16).padStart(2,'0')).join('');
  return{title:document.title,url:pageURL,text:(document.body?.innerText||'').slice(0,14000),generation,elements:descriptions.map((e,id)=>({id,...e}))};
 }
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function expectText(a){
  if(typeof a.contains!=='string'||!a.contains.length||a.contains.length>2000)throw Error('Invalid expected text');
  if(a.selector!==undefined&&(typeof a.selector!=='string'||!a.selector.length||a.selector.length>500))throw Error('Invalid result selector');
  const timeout=a.timeoutMs??2000;if(!Number.isInteger(timeout)||timeout<0||timeout>5000)throw Error('Invalid DOM wait timeout');
  const deadline=Date.now()+timeout;let actual='',passed=false;
  do{
   const nodes=a.selector?Array.from(document.querySelectorAll(a.selector)).filter(visible):[document.body].filter(Boolean);
   // Never concatenate unrelated matches to fabricate a matching result.
   const texts=nodes.map(el=>(el.innerText||'').slice(0,14000));
   passed=texts.some(t=>t.includes(a.contains));actual=texts.join('\n').slice(0,14000);
   if(passed||Date.now()>=deadline)break;await pause(Math.min(100,deadline-Date.now()));
  }while(true);
  return{passed,expected:a.contains,selector:a.selector,observedText:actual,observed:read()};
 }
 async function execute(op,a={}){
  if(op==='read')return read();
  if(op==='expect')return expectText(a);
  if(!['click','type','select','check','verify'].includes(op))throw Error('Unsupported DOM operation');
  if(!generation||a.generation!==generation||location.href!==pageURL)throw Error('หน้าเว็บเปลี่ยนแล้ว กรุณาอ่านหน้าใหม่');
  if(!Number.isInteger(a.id)||a.id<0||a.id>=elements.length)throw Error('Unknown DOM element');
  const el=elements[a.id];if(!visible(el))throw Error('ไม่พบช่องหรือปุ่มเดิม กรุณาอ่านหน้าใหม่');
  if(['password','file','hidden'].includes(el.type))throw Error('ไม่รองรับช่องรหัสผ่านหรืออัปโหลดไฟล์');
  const now=describe(el),old=descriptions[a.id];
  for(const key of ['elementId','name','label','tag','type','href'])if(now[key]!==old[key])throw Error('ปุ่มหรือช่องเปลี่ยนไปแล้ว กรุณาอ่านหน้าใหม่');
  if(now.options&&JSON.stringify(now.options.map(({selected,...o})=>o))!==JSON.stringify(old.options.map(({selected,...o})=>o)))throw Error('ตัวเลือกเปลี่ยนแล้ว กรุณาอ่านหน้าใหม่');
  if(now.disabled)throw Error('ปุ่มหรือช่องนี้ยังใช้งานไม่ได้');
  if(op==='verify'){
   const isChecked=a.checked!==undefined;
   if(isChecked&&(typeof a.checked!=='boolean'||!['checkbox','radio'].includes(el.type)))throw Error('Expected a checkbox or radio');
   if(!isChecked&&(typeof a.value!=='string'||a.value.length>4000||!['INPUT','TEXTAREA','SELECT'].includes(el.tagName)&&!el.isContentEditable))throw Error('Expected a form field and value');
   const actual=isChecked?el.checked:el.isContentEditable?el.textContent:el.value;
   return{passed:actual===(isChecked?a.checked:a.value),expected:isChecked?a.checked:a.value,observedValue:isChecked?actual:String(actual??'').slice(0,4000),observed:read()};
  }
  if(op==='type'&&(!now.editable||typeof a.value!=='string'||a.value.length>4000))throw Error('ช่องนี้พิมพ์ตรง ๆ ไม่ได้หรือเป็น read-only ให้ใช้ปุ่มแป้นคำตอบบนเว็บ');
  if(op==='select'){
   if(el.tagName!=='SELECT'||el.multiple||typeof a.value!=='string'||a.value.length>4000)throw Error('Expected a single select and exact option value');
   const option=Array.from(el.options).find(o=>o.value===a.value);
   if(!option||option.disabled||option.parentElement?.disabled===true)throw Error('Option is missing or disabled');
  }
  if(op==='check'&&(typeof a.checked!=='boolean'||!['checkbox','radio'].includes(el.type)||el.readOnly||(el.type==='radio'&&!a.checked)))throw Error('Expected a checkbox, or radio checked=true');
  const beforeText=document.body?.innerText||'';
  const before={url:location.href,text:beforeText.slice(0,14000),textTruncated:beforeText.length>14000};
  el.scrollIntoView({block:'center',inline:'nearest'});el.focus({preventScroll:true});
  if(op==='click')el.click();
  else if(op==='check'){if(el.checked!==a.checked)el.click();}
  else{
   if(el.isContentEditable)el.textContent=a.value;
   else Object.getOwnPropertyDescriptor(el.tagName==='INPUT'?HTMLInputElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLTextAreaElement.prototype,'value').set.call(el,a.value);
   el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  await pause(180);
  const inputConfirmed=op==='click'?undefined:el.isConnected&&(op==='check'?el.checked===a.checked:(el.isContentEditable?el.textContent:el.value)===a.value);
  if(inputConfirmed===false)throw Error('ช่องเว็บไม่เก็บค่าที่กรอก กรุณาอ่านหน้าใหม่และตรวจช่อง');
  return{performed:true,inputConfirmed,before,observed:read()};
 }
 return{execute};
}
if(typeof module!=='undefined')module.exports=createDOMBridge;
else globalThis.createCapriiDOMBridge=createDOMBridge;
void 0; // Chrome injection must not return a function-valued object.
