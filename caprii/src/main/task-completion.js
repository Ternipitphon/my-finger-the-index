'use strict';
function requirements(goal) {
 const current=goal.indexOf('\nคำสั่งตอนนี้:');if(current>=0)goal=goal.slice(current);
 const page=/(?:หน้าจอ|ดูจอ|บนจอ|บนหน้า|หน้าเว็บ|แท็บ|screen|page|\btab\b)/i.test(goal);
 const solvePage=page&&/(?:ทำ|แก้)โจท(?:ย์|ย)?|ทำข้อ/i.test(goal);
 const answerOnly=/หาคำตอบ|คิดคำตอบ/.test(goal)&&!/กรอก|พิมพ์|ใส่คำตอบ|เติมคำตอบ|กดส่ง|ส่งคำตอบ/.test(goal);
 const noInput=answerOnly||/(?:ไม่ต้อง|อย่า|ห้าม|do not|don't)\s*(?:ให้\s*)?(?:กรอก|พิมพ์|ใส่คำตอบ|เติมคำตอบ|fill|type)/i.test(goal);
 const noSubmit=answerOnly||/(?:ไม่ต้อง|อย่า|ห้าม|do not|don't)\s*(?:ให้\s*)?(?:กดส่ง|ส่งคำตอบ|submit)/i.test(goal);
 return {noInput,noSubmit,input:!noInput&&(solvePage||/(?:กรอก|พิมพ์|ใส่คำตอบ|เติมคำตอบ|\bfill\b|\btype\b)/i.test(goal)),submit:!noSubmit&&/(?:กดส่ง|ส่งคำตอบ|\bsubmit\b)/i.test(goal)};
}
function createCompletion(goal) {
 const wanted=requirements(goal);let input=false,submitted=false,target=null;
 return {wanted,record(a,r){
  const desktop=a.tool==='desktop.input'&&r?.text?.inputDelivered===true;
  const browser=['browser.type','browser.click'].includes(a.tool);
  if(!desktop&&!browser)return;
  const current=desktop?String(a.targetHandle||a.handle):'browser';
  if((desktop&&a.kind==='type')||a.tool==='browser.type'||(a.intent==='answer_key'&&(a.kind==='click'||a.tool==='browser.click'))){input=true;submitted=false;target=current;}
  const submit=(desktop&&a.kind==='key'&&a.key==='enter')||((a.kind==='click'||a.tool==='browser.click')&&a.intent==='submit');
  if(submit&&(!wanted.input||(input&&target===current)))submitted=true;
 },missing(){return [...(wanted.input&&!input?['กรอกคำตอบในช่องจริง (หรือคลิกแป้นคำตอบ)']:[]),...(wanted.submit&&!submitted?['กดส่งคำตอบ']:[])];},facts(){return{inputDelivered:input,submitDelivered:submitted};}};
}
module.exports={requirements,createCompletion};
