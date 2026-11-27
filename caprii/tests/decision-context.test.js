'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {decisionContext,validateAssessment}=require('../src/main/decision-context');
const {interpretCommand}=require('../src/main/command-interpreter');
test('decision context exposes only already-authorized live Chrome metadata, no query, fragment or credentials',()=>{
 assert.equal(decisionContext({url:'https://example.org/private',connected:false},1).tab,null);
 assert.equal(decisionContext({connected:true,responsive:false,url:'https://example.org/'},1).tab,null);
 assert.equal(decisionContext({connected:true,url:'https://u:p@example.org/'},1).tab,null);
 const r=decisionContext({connected:true,url:'https://example.org/form?token=secret#private',title:'Test'},1);assert.equal(r.tab.url,'https://example.org/form');assert.equal(r.tab.pageContentObserved,false);assert.equal(r.screenObserved,false);assert.equal(r.windowsObserved,false);assert.equal(r.capturedAt,1);
});
test('structured uncertainty blocks actions even when the model chooses an action with high confidence',async()=>{
 for(const assessment of [{outcome:'เปิดสิ่งที่หมายถึง',targetSource:'unspecified',missing:['target'],ambiguous:false},{outcome:'เลือกหนึ่งรายการ',targetSource:'conversation',missing:[],ambiguous:true}]){
 const r=await interpretCommand({text:'เปิดอันนั้น',request:async()=>JSON.stringify({route:'agent',confidence:1,assessment})});assert.equal(r.route,'clarify');assert.equal(r.goal,undefined);
 }
 assert.throws(()=>validateAssessment({outcome:'x',missing:'none',ambiguous:false,targetSource:'current-message'}));
});
test('model context contains authorized metadata and diverse train examples without inspecting windows or page contents',async()=>{
 let seen;const r=await interpretCommand({text:'เปิดเพลง',environment:{connected:true,url:'https://open.spotify.com/?secret=x',title:'Spotify'},connected:true,request:async m=>{seen=JSON.parse(m[1].content);return JSON.stringify({route:'media',confidence:1,assessment:{outcome:'เล่นเพลงที่ค้าง',targetSource:'current-message',missing:[],ambiguous:false},media:{service:'spotify',action:'play',collection:'current'}});}});
 assert.equal(r.media.collection,'current');assert.equal(seen.environment.tab.url,'https://open.spotify.com/');assert.ok(seen.examples.some(x=>x.result.route==='clarify'));assert.equal(seen.environment.screenObserved,false);
});
test('a claimed paired-tab target cannot bypass an absent browser connection',async()=>{
 const r=await interpretCommand({text:'ใส่ชื่อในแท็บนี้',connected:false,request:async()=>JSON.stringify({route:'agent',confidence:1,assessment:{outcome:'ใส่ชื่อ',targetSource:'connected-tab',missing:[],ambiguous:false}})});assert.equal(r.route,'clarify');
});
test('a continued website reference accepts only the literal latest user URL, not an assistant invention or an unrelated old link',async()=>{
 const value={route:'website',confidence:1,target:'https://example.org/guide',continuation:true,assessment:{outcome:'เปิดลิงก์ที่เพิ่งบอก',targetSource:'conversation',missing:[],ambiguous:false}};
 const call=(history,change={})=>interpretCommand({text:'เปิดอันเมื่อกี้',history,request:async()=>JSON.stringify({...value,...change})});
 assert.equal((await call([{role:'user',content:'หน้า https://example.org/guide น่าสนใจ'}])).website.url,'https://example.org/guide');
 assert.equal((await call([{role:'assistant',content:'https://example.org/guide'}])).route,'clarify');
 assert.equal((await call([{role:'user',content:'https://example.org/guide'},{role:'user',content:'เปลี่ยนไปคุยเรื่องอื่น'}])).route,'clarify');
 assert.equal((await call([{role:'user',content:'https://example.org/guide'}],{continuation:false})).route,'clarify');
});
