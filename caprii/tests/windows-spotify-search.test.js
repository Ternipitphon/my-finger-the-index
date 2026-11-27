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

test('long title spacing and multiple artists match the selected song without admitting another recording or artist',()=>{
 const {titleKey,artistEvidence}=require('../src/main/windows-spotify-search');
 const title='I Really Want to Stay at Your House',card={...row(),texts:[title,'Rosa Walton','Hallie Coggins']};
 assert.equal(select([card],'ireallywanttostayatyourhouse'),card);assert.equal(select([card],title,'Rosa Walton, Hallie Coggins'),card);
 assert.equal(artistEvidence(card,'Rosa Walton, Hallie Coggins'),true);assert.equal(artistEvidence(card,'Rosa Walton, Different Artist'),false);
 assert.notEqual(titleKey(title),titleKey(title+' - Instrumental'));assert.notEqual(titleKey(title),titleKey(title+' 1 HOUR'));
});
test('plus-encoded search input is repaired once, then only the requested long song is accepted over current Magnolia',async()=>{
 const title='I Really Want to Stay at Your House',calls=[];let corrected=false,invoked=false;
 const card={...row(),kind:'card',buttonName:'เล่นเพลง',texts:[title,'Rosa Walton','Hallie Coggins']};
 const r=await searchWindowsSpotify({query:title,platform:'win32',open:async()=>{},sleep:async()=>{},run:async(_f,_a,options)=>{
  const q=JSON.parse(options.input);calls.push(q);
  let data;if(q.kind==='inspect')data={ok:true,window:'1:2:3',rows:corrected?[card]:[],search:corrected?null:{id:'field',value:title.replaceAll(' ','+'),needsCorrection:true}};
  else if(q.kind==='prepare'){corrected=true;data={ok:true,confirmed:true};}
  else if(q.kind==='invoke'){invoked=true;data={ok:true,invoked:true};}
  else data={ok:true,session:session(invoked?{title,artist:'Rosa Walton, Hallie Coggins'}:{title:'Magnolia',artist:'Magnolia Celebration'})};
  return{passed:true,stdout:JSON.stringify(data)};
 }});
 assert.equal(r.verified,true);assert.equal(r.track,title);assert.equal(calls.filter(q=>q.kind==='prepare').length,1);assert.equal(calls.filter(q=>q.kind==='invoke').length,1);assert.equal(calls.find(q=>q.kind==='prepare').field.id,'field');
});
test('an uncertain query correction is never retried or followed by playback',async()=>{
 const calls=[];const r=await searchWindowsSpotify({query:'long song',platform:'win32',open:async()=>{},sleep:async()=>{},run:async(_f,_a,options)=>{const q=JSON.parse(options.input);calls.push(q);return{passed:true,stdout:JSON.stringify(q.kind==='inspect'?{ok:true,window:'w',rows:[],search:{id:'field',value:'long+song',needsCorrection:true}}:{ok:false})};}});assert.equal(r.code,'spotify_search_input_unconfirmed');assert.deepEqual(calls.map(q=>q.kind),['inspect','prepare']);
});

test('an already visible matching song can play immediately without editing an encoded search field',async()=>{
 const calls=[];let invoked=false;const r=await searchWindowsSpotify({query:'long song',platform:'win32',open:async()=>{},sleep:async()=>{},run:async(_f,_a,o)=>{const q=JSON.parse(o.input);calls.push(q);if(q.kind==='invoke')invoked=true;return{passed:true,stdout:JSON.stringify(q.kind==='inspect'?{ok:true,window:'w',rows:[{...row(),texts:['long song','Artist']}],search:{id:'field',value:'long+song',needsCorrection:true}}:q.kind==='invoke'?{ok:true,invoked:true}:{ok:true,session:session(invoked?{title:'long song',artist:'Artist'}:{title:'Magnolia',artist:'Magnolia Celebration'})})};}});assert.equal(r.verified,true);assert.equal(calls.filter(q=>q.kind==='prepare').length,0);assert.equal(calls.filter(q=>q.kind==='invoke').length,1);
});
