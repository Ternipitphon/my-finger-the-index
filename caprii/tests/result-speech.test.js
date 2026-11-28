'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {resultSpeech}=require('../src/main/result-speech');
const result={ok:true,verified:true,audioVerified:false,backend:'windows-smtc',track:'weathergirl',text:'เริ่มเล่นแล้ว ยังตรวจเสียงลำโพงไม่ได้',evidence:{status:'Playing'}};
const base={result,media:{action:'play'},config:{personalityStyle:'playful'},lang:'th'};
test('AI varies delivery after verified play without changing evidence or calling tools',async()=>{
 let calls=0;const r=await resultSpeech({...base,request:async(messages)=>{calls++;assert.match(messages[0].content,/personality|บุคลิก/);assert.match(messages[0].content,/speaker sound is NOT verified/);assert.equal(JSON.parse(messages[1].content).track,'weathergirl');return JSON.stringify({speech:'weathergirl มาแล้ว choom! {limit}'});}});
 assert.equal(calls,1);assert.equal(r.text,'weathergirl มาแล้ว choom! ยังตรวจเสียงจากลำโพงไม่ได้');assert.equal(r.evidence,result.evidence);assert.equal(r.audioVerified,false);assert.equal(r.evidenceText,result.text);assert.equal(result.speechGenerated,undefined);
});
test('English speech preserves Thai song names and an unverified speaker boundary',async()=>{
 const r=await resultSpeech({...base,lang:'en',result:{...result,track:'เพลงไทย'},request:async()=>JSON.stringify({speech:'เพลงไทย is rolling, choom. {limit}'})});assert.equal(r.text,'เพลงไทย is rolling, choom. Speaker output is not verified.');
});
test('invented sound, missing uncertainty, wrong track and malformed output fall back to the real result',async()=>{
 for(const speech of ['ได้ยิน weathergirl แล้ว {limit}','weathergirl has audible sound. {limit}','เพลงอื่นมาแล้ว {limit}','weathergirl มาแล้ว','weathergirl {limit} {limit}'])assert.equal(await resultSpeech({...base,request:async()=>JSON.stringify({speech})}),result);
 for(const raw of ['broken','{}'])assert.equal(await resultSpeech({...base,request:async()=>raw}),result);
});
test('failed/unverified/paused results never invoke the narrator',async()=>{
 let calls=0;for(const patch of [{result:{...result,ok:false}},{result:{...result,verified:false}},{media:{action:'pause'}}])await resultSpeech({...base,...patch,request:async()=>{calls++;}});assert.equal(calls,0);
});
test('timeout and cancellation return evidence once, without retrying narration or media',async()=>{
 let calls=0;const request=()=>{calls++;return new Promise(()=>{});};assert.equal(await resultSpeech({...base,timeoutMs:10,request}),result);assert.equal(calls,1);
 const stop=new AbortController();const pending=resultSpeech({...base,signal:stop.signal,request});stop.abort();assert.equal(await pending,result);assert.equal(calls,2);
});
