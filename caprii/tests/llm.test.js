'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const llm=require('../src/main/llm');
test('SSE preserves fragmented Thai UTF-8 and a final line without newline',async t=>{
 const original=global.fetch;t.after(()=>{global.fetch=original;});
 const bytes=new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:'สวัสดี'}}]}));
 global.fetch=async()=>new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=2)c.enqueue(bytes.slice(i,i+2));c.close();}}));
 let streamed='';const text=await llm.chat('gemini',{apiKeys:{gemini:'not-a-real-key'}},{model:'test',messages:[]},s=>streamed+=s,AbortSignal.timeout(1000));
 assert.equal(text,'สวัสดี');assert.equal(streamed,text);
});
test('provider failures redact keys and classify quota, unavailable and missing model',async t=>{
 const original=global.fetch;t.after(()=>{global.fetch=original;});
 const key='not-real-secret-key-12345678901234567890';
 for(const [status,code] of [[429,'busy'],[503,'busy'],[404,'gone'],[401,null]]){
  global.fetch=async()=>new Response(JSON.stringify({error:{message:'Invalid key '+key}}),{status});
  await assert.rejects(llm.chat('gemini',{apiKeys:{gemini:key}},{model:'test',messages:[]},()=>{},AbortSignal.timeout(1000)),e=>e.code===code&&e.status===status&&!e.message.includes(key));
 }
});
test('Gemini prefers stable low-cost chat models and filters non-chat models',async t=>{
 const original=global.fetch;t.after(()=>{global.fetch=original;});
 global.fetch=async()=>Response.json({data:['gemini-3.8-flash','gemini-3.5-flash-lite','gemini-3.5-transcribe','gemini-nano-banana-2.1','gemini-3.5-flash-preview'].map(id=>({id}))});
 const models=await llm.models('gemini',{apiKeys:{gemini:'test'}});
 assert.equal(models[0],'gemini-3.5-flash-lite');assert.ok(!models.some(m=>/transcribe|banana/.test(m)));
});
