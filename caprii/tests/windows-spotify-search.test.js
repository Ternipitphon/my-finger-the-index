'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {select,searchWindowsSpotify}=require('../src/main/windows-spotify-search');
const row=(artist='FLAVOR FOLEY',id='1')=>({id,kind:'row',order:0,button:'10',buttonName:'Play weathergirl',texts:['1','weathergirl',artist,'Album']});
const session=(changes={})=>({sourceAppId:'Spotify.exe',status:'Playing',title:'weathergirl',artist:'FLAVOR FOLEY',album:'Album',positionMs:100,controls:{play:true,pause:true,next:true,previous:true},...changes});
function fixture({rows=[row()],sessionValue=session(),changed=false,signal,artist='FLAVOR FOLEY',alreadyPlaying=false}={}){const calls=[],opened=[];let invoked=false;return{calls,opened,run:()=>searchWindowsSpotify({query:'weathergirl',artist,platform:'win32',signal,sleep:async()=>{},open:async u=>opened.push(u),run:async(file,args,options)=>{const payload=JSON.parse(options.input);calls.push({args,options,payload});if(payload.kind==='invoke')invoked=true;return{passed:true,stdout:JSON.stringify(payload.kind==='inspect'?{ok:true,window:'123:456:789',rows}:payload.kind==='invoke'?{ok:!changed,invoked:!changed}:{ok:true,session:invoked||alreadyPlaying?sessionValue:session({status:'Paused'})})};}})};}
test('top matching title wins in Spotify order, while explicit artist and exact title remain constraints',()=>{
 assert.equal(select([row('Other'),row()],'weathergirl','FLAVOR FOLEY').texts[2],'FLAVOR FOLEY');
 assert.equal(select([row('Top artist','top'),row()],'weathergirl').id,'top');
 assert.equal(select([row(),row('FLAVOR FOLEY','2')],'weathergirl','FLAVOR FOLEY').id,'1');
 assert.equal(select([row()],'weather'),null);assert.equal(select([row()],'weathergirl','Other'),null);
});
test('opens fixed encoded desktop search URI then invokes one observed result and verifies two Spotify Playing snapshots',async()=>{
 const f=fixture(),r=await f.run();assert.equal(r.verified,true);assert.equal(r.audioVerified,false);assert.equal(r.backend,'windows-smtc');assert.equal(r.track,'weathergirl');assert.deepEqual(f.opened,['spotify:search:weathergirl%20FLAVOR%20FOLEY']);assert.deepEqual(f.calls.map(c=>c.payload.kind||c.payload.action),['inspect','inspect','inspect','invoke','inspect','inspect']);assert.equal(f.calls.find(c=>c.payload.kind==='invoke').payload.window,'123:456:789');assert.ok(f.calls.every(c=>c.args.includes('-File')));
});
test('duplicate matches play the first once, while changed windows stop playback',async()=>{
 const f=fixture({rows:[row(),row('FLAVOR FOLEY','2')]});assert.equal((await f.run()).verified,true);assert.equal(f.calls.filter(c=>c.payload.kind==='invoke').length,1);assert.equal(f.calls.find(c=>c.payload.kind==='invoke').payload.row.id,'1');
 const g=fixture({changed:true});assert.equal((await g.run()).code,'spotify_search_changed');assert.equal(g.calls.filter(c=>c.payload.kind==='invoke').length,1);
});
test('wrong song, wrong artist, paused state or Chrome session cannot count as success or replay the invocation',async()=>{
 for(const change of [{title:'Other'},{artist:'Other'},{status:'Paused'},{sourceAppId:'chrome.exe'}]){const f=fixture({sessionValue:session(change)});assert.equal((await f.run()).verified,false);assert.equal(f.calls.filter(c=>c.payload.kind==='invoke').length,1);}
});
test('abort stops before opening app; helper uses neither shell text interpolation nor global keyboard/mouse fallback',async()=>{
 const abort=new AbortController();abort.abort(Error('cancelled'));const f=fixture({signal:abort.signal});await assert.rejects(f.run(),/cancelled/);assert.equal(f.opened.length,0);assert.equal(f.calls.length,0);
 const fs=require('node:fs'),ps=fs.readFileSync(require.resolve('../src/main/windows-spotify-search.ps1'),'utf8');assert.doesNotMatch(ps,/SendKeys|SendInput|SetForegroundWindow|Invoke-Expression|mouse_event/);assert.match(ps,/Search result changed/);assert.match(ps,/StartTime/);
});

test('artist omitted uses first matching row but verifies that selected artist, not just a shared title',async()=>{
 const args={query:'weathergirl',platform:'win32',open:async()=>{},sleep:async()=>{}};
 for(const actualArtist of ['Top artist','Other artist']){
  let invokes=0;const r=await searchWindowsSpotify({...args,run:async(_file,_argv,options)=>{const q=JSON.parse(options.input);if(q.kind==='invoke')invokes++;return{passed:true,stdout:JSON.stringify(q.kind==='inspect'?{ok:true,window:'123',rows:[row('Top artist','top'),row()]}:q.kind==='invoke'?{ok:true,invoked:true}:{ok:true,session:session({artist:actualArtist,status:invokes?'Playing':'Paused'})})};}});
  assert.equal(r.verified,actualArtist==='Top artist');assert.equal(invokes,1);
 }
});
test('a top matching row without a Play control never silently skips to a lower result',async()=>{
 const top={...row(),button:null,buttonName:null};const f=fixture({rows:[top,row('FLAVOR FOLEY','second')]});assert.equal((await f.run()).code,'spotify_search_control_unavailable');assert.ok(f.calls.every(c=>c.payload.kind!=='invoke'));
});

test('screenshot-shaped top-result card Play is selected outside song rows and confirms the artist role label',async()=>{
 const card={...row(),id:'card',kind:'card',texts:['weathergirl','เพลง • FLAVOR FOLEY']};const f=fixture({rows:[card,{...row(),button:null,buttonName:null}],artist:undefined});const r=await f.run();assert.equal(r.verified,true);assert.equal(f.calls.find(c=>c.payload.kind==='invoke').payload.row.kind,'card');
});
test('an already Playing requested track is confirmed twice without requiring Play or invoking any control',async()=>{
 const f=fixture({rows:[{...row(),button:null,buttonName:null}],alreadyPlaying:true});const r=await f.run();assert.equal(r.verified,true);assert.equal(r.evidence.alreadyPlaying,true);assert.equal(f.calls.filter(c=>c.payload.kind==='invoke').length,0);assert.equal(f.calls.filter(c=>c.payload.action==='inspect').length,2);
});
test('a different artist or paused track cannot bypass a missing search Play control',async()=>{
 for(const change of [{artist:'Different Artist'},{status:'Paused'}]){const f=fixture({rows:[{...row(),button:null,buttonName:null}],alreadyPlaying:true,sessionValue:session(change)});assert.equal((await f.run()).code,'spotify_search_control_unavailable');assert.equal(f.calls.filter(c=>c.payload.kind==='invoke').length,0);}
});
