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

test('task JSON is requested for Gemini actions, while ordinary chat and summary repair stay text', async t=>{
 const original=global.fetch;t.after(()=>{global.fetch=original;});const seen=[];
 global.fetch=async(_url,options)=>{seen.push(JSON.parse(options.body));return new Response('data: '+JSON.stringify({choices:[{delta:{content:'{"tool":"finish","summary":"พร้อม"}'}}]})+'\n\ndata: [DONE]\n\n');};
 const base={model:'gemini-test',messages:[{role:'system',content:'Reply ONLY with one JSON object each turn'}]};
 assert.equal(llm.isTaskActionRequest(base.messages,true),true);
 assert.equal(llm.isTaskActionRequest([{role:'user',content:base.messages[0].content}],true),false);
 assert.equal(llm.isTaskActionRequest([{role:'system',content:'ตอบเฉพาะข้อความสรุป ไม่ใช่ JSON'}],true),false);
 await llm.chat('gemini',{apiKeys:{gemini:'fake'}},{...base,jsonMode:true},()=>{},AbortSignal.timeout(1000));
 await llm.chat('gemini',{apiKeys:{gemini:'fake'}},base,()=>{},AbortSignal.timeout(1000));
 await llm.chat('openai',{apiKeys:{openai:'fake'}},{...base,jsonMode:true},()=>{},AbortSignal.timeout(1000));
 assert.deepEqual(seen[0].response_format,{type:'json_object'});
 assert.equal(seen[1].response_format,undefined);assert.equal(seen[2].response_format,undefined);
});
test('an explicit unsupported JSON format can use legacy mode once, but failures are not replayed',async t=>{
 const original=global.fetch;t.after(()=>{global.fetch=original;});let requests=[];
 global.fetch=async(_url,options)=>{const body=JSON.parse(options.body);requests.push(body);return body.response_format?new Response(JSON.stringify({error:{message:'response_format json_object unsupported'}}),{status:400}):new Response('data: '+JSON.stringify({choices:[{delta:{content:'{"tool":"finish"}'}}]})+'\n\ndata: [DONE]\n\n');};
 await llm.chat('gemini',{apiKeys:{gemini:'fake'}},{model:'test',messages:[],jsonMode:true},()=>{},AbortSignal.timeout(1000));
 assert.equal(requests.length,2);assert.equal(requests[1].response_format,undefined);
 requests=[];global.fetch=async()=>{requests.push(1);return new Response('unavailable',{status:503});};
 await assert.rejects(llm.chat('gemini',{apiKeys:{gemini:'fake'}},{model:'test',messages:[],jsonMode:true},()=>{},AbortSignal.timeout(1000)));
 assert.equal(requests.length,1);
});
