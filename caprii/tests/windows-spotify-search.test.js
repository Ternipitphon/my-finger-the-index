'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {select,searchWindowsSpotify}=require('../src/main/windows-spotify-search');
const row=(artist='FLAVOR FOLEY',id='1')=>({id,button:'10',buttonName:'Play weathergirl',texts:['1','weathergirl',artist,'Album']});
const session=(changes={})=>({sourceAppId:'Spotify.exe',status:'Playing',title:'weathergirl',artist:'FLAVOR FOLEY',album:'Album',positionMs:100,controls:{play:true,pause:true,next:true,previous:true},...changes});
function fixture({rows=[row()],sessionValue=session(),changed=false,signal}={}){const calls=[],opened=[];return{calls,opened,run:()=>searchWindowsSpotify({query:'weathergirl',artist:'FLAVOR FOLEY',platform:'win32',signal,sleep:async()=>{},open:async u=>opened.push(u),run:async(file,args,options)=>{const payload=JSON.parse(options.input);calls.push({args,options,payload});return{passed:true,stdout:JSON.stringify(payload.kind==='inspect'?{ok:true,window:'123:456:789',rows}:payload.kind==='invoke'?{ok:!changed,invoked:!changed}:{ok:true,session:sessionValue})};}})};}
test('exact title and artist disambiguate rows; never choose the first duplicate or fuzzy title',()=>{
 assert.equal(select([row('Other'),row()],'weathergirl','FLAVOR FOLEY').texts[2],'FLAVOR FOLEY');
 assert.equal(select([row(),row('FLAVOR FOLEY','2')],'weathergirl'),null);
 assert.equal(select([row()],'weather'),null);assert.equal(select([row()],'weathergirl','Other'),null);
});
test('opens fixed encoded desktop search URI then invokes one observed result and verifies two Spotify Playing snapshots',async()=>{
 const f=fixture(),r=await f.run();assert.equal(r.verified,true);assert.equal(r.audioVerified,false);assert.equal(r.backend,'windows-smtc');assert.equal(r.track,'weathergirl');assert.deepEqual(f.opened,['spotify:search:weathergirl%20FLAVOR%20FOLEY']);assert.deepEqual(f.calls.map(c=>c.payload.kind||c.payload.action),['inspect','invoke','inspect','inspect']);assert.equal(f.calls[1].payload.window,'123:456:789');assert.ok(f.calls.every(c=>c.args.includes('-File')));
});
test('ambiguous results and changed windows never trigger playback',async()=>{
 const f=fixture({rows:[row(),row('FLAVOR FOLEY','2')]});assert.equal((await f.run()).code,'spotify_search_no_unique_match');assert.ok(f.calls.every(c=>c.payload.kind==='inspect'));
 const g=fixture({changed:true});assert.equal((await g.run()).code,'spotify_search_changed');assert.equal(g.calls.filter(c=>c.payload.kind==='invoke').length,1);
});
test('wrong song, wrong artist, paused state or Chrome session cannot count as success or replay the invocation',async()=>{
 for(const change of [{title:'Other'},{artist:'Other'},{status:'Paused'},{sourceAppId:'chrome.exe'}]){const f=fixture({sessionValue:session(change)});assert.equal((await f.run()).verified,false);assert.equal(f.calls.filter(c=>c.payload.kind==='invoke').length,1);}
});
test('abort stops before opening app; helper uses neither shell text interpolation nor global keyboard/mouse fallback',async()=>{
 const abort=new AbortController();abort.abort(Error('cancelled'));const f=fixture({signal:abort.signal});await assert.rejects(f.run(),/cancelled/);assert.equal(f.opened.length,0);assert.equal(f.calls.length,0);
 const fs=require('node:fs'),ps=fs.readFileSync(require.resolve('../src/main/windows-spotify-search.ps1'),'utf8');assert.doesNotMatch(ps,/SendKeys|SendInput|SetForegroundWindow|Invoke-Expression|mouse_event/);assert.match(ps,/Search result changed/);assert.match(ps,/StartTime/);
});
