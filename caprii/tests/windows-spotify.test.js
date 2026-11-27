'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {runWindowsSpotify,spotifySource}=require('../src/main/windows-spotify');
const sample=(changes={})=>({sourceAppId:'Spotify.exe',status:'Paused',title:'weathergirl',artist:'FLAVOR FOLEY',album:'Album',positionMs:125000,controls:{play:true,pause:true,next:true,previous:true},...changes});
function fixture({action='play',initial=sample(),observations,accepted=true,code,openNeeded=false,signal}={}){
 const calls=[],opened=[];let missing=openNeeded;return{calls,opened,run:()=>runWindowsSpotify({action,platform:'win32',signal,sleep:async()=>{},open:async()=>{opened.push('spotify:');missing=false;},run:async(file,args,options)=>{
  const input=JSON.parse(options.input);calls.push({file,args,options,input});
  if(input.action==='inspect')return{passed:true,stdout:JSON.stringify(missing?{ok:false,code:'spotify_session_missing'}:{ok:true,session:initial})};
  return{passed:true,stdout:JSON.stringify(code?{ok:false,code}:{ok:true,accepted,requested:true,before:initial,observations:observations||[sample({status:'Playing'}),sample({status:'Playing'})]})};
 }})};
}
test('only explicit Spotify desktop session IDs are accepted, never Chrome or a title containing Spotify',()=>{
 for(const id of ['Spotify','Spotify.exe','SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify'])assert.equal(spotifySource(id),true);
 for(const id of ['chrome.exe','msedge.exe','YouTube Spotify','OtherSpotify.exe','SpotifyAB.SpotifyMusic_unknown!Spotify'])assert.equal(spotifySource(id),false);
});
test('play targets Spotify without foreground focus or key presses and verifies actual session state twice',async()=>{
 const f=fixture(),r=await f.run();assert.equal(r.verified,true);assert.equal(r.backend,'windows-smtc');assert.equal(r.audioVerified,false);assert.equal(r.track,'weathergirl');assert.deepEqual(f.calls.map(c=>c.input.action),['inspect','play']);assert.equal(f.calls[1].input.sourceAppId,'Spotify.exe');assert.ok(f.calls.every(c=>c.args.includes('-File')));assert.equal(f.opened.length,0);
});
test('pause, next and previous verify status, changed metadata or restart position instead of accepting a click',async()=>{
 const pause=fixture({action:'pause',initial:sample({status:'Playing'}),observations:[sample(),sample()]});assert.equal((await pause.run()).verified,true);
 const next=fixture({action:'next',observations:[sample({title:'Next song',status:'Playing'})]});assert.equal((await next.run()).verified,true);
 const previous=fixture({action:'previous',observations:[sample({positionMs:0})]});assert.equal((await previous.run()).verified,true);
});
test('accepted commands without an observed state change fail without replay or fallback',async()=>{
 const f=fixture({observations:[sample(),sample()]});const r=await f.run();assert.equal(r.verified,false);assert.equal(r.code,'spotify_not_confirmed');assert.equal(f.calls.length,2);assert.equal(f.opened.length,0);
});
test('non-Spotify and changed-source observations cannot be used as successful control evidence',async()=>{
 const f=fixture({initial:sample({sourceAppId:'chrome.exe'})});assert.equal((await f.run()).verified,false);assert.equal(f.calls.length,1);
 const g=fixture({observations:[sample({sourceAppId:'msedge.exe',status:'Playing'}),sample({sourceAppId:'msedge.exe',status:'Playing'})]});assert.equal((await g.run()).verified,false);assert.equal(g.calls.length,2);
});
test('disabled and rejected controls stop without retrying the mutation',async()=>{
 const f=fixture({initial:sample({controls:{play:false,pause:true,next:true,previous:true}})});assert.equal((await f.run()).code,'spotify_control_disabled');assert.equal(f.calls.length,1);
 const g=fixture({code:'spotify_control_rejected'});assert.equal((await g.run()).code,'spotify_control_rejected');assert.equal(g.calls.length,2);
});
test('missing session may open the requested Spotify app once and never opens a web page',async()=>{
 const f=fixture({openNeeded:true});assert.equal((await f.run()).verified,true);assert.deepEqual(f.opened,['spotify:']);assert.deepEqual(f.calls.map(c=>c.input.action),['inspect','inspect','play']);
});
test('unavailable Windows APIs and ambiguous Spotify sessions return explicit errors without controlling another player',async()=>{
 for(const code of ['spotify_session_missing','spotify_session_ambiguous','windows_media_unavailable']){let calls=0;const r=await runWindowsSpotify({action:'pause',platform:'win32',run:async()=>{calls++;return{passed:true,stdout:JSON.stringify({ok:false,code})};}});assert.equal(r.code,code);assert.equal(calls,1);}
});
test('cancellation and unsupported actions never fall back to Space or global media keys',async()=>{
 let calls=0;const a=new AbortController();a.abort(Error('stopped'));await assert.rejects(runWindowsSpotify({action:'play',platform:'win32',signal:a.signal,run:async()=>calls++}),/stopped/);assert.equal(calls,0);
 await assert.rejects(runWindowsSpotify({action:'delete',run:async()=>calls++}),/Invalid/);assert.equal(calls,0);
 assert.equal((await runWindowsSpotify({action:'play',platform:'linux',run:async()=>calls++})).verified,false);assert.equal(calls,0);
 const ps=fs.readFileSync(require.resolve('../src/main/windows-spotify.ps1'),'utf8');assert.doesNotMatch(ps,/SendKeys|keybd_event|SendInput|SetForegroundWindow|TryTogglePlayPauseAsync|Invoke-Expression/);assert.match(ps,/TryPlayAsync/);assert.match(ps,/TryPauseAsync/);
});
test('metadata is passed as JSON stdin, never interpolated into PowerShell commands',async()=>{
 const title='song ` $(do-not-run) "quoted"';const f=fixture({initial:sample({title}),observations:[sample({title,status:'Playing'}),sample({title,status:'Playing'})]});assert.equal((await f.run()).verified,true);assert.equal(f.calls[1].input.expectedTitle,title);assert.ok(!f.calls[1].args.some(a=>a.includes(title)));assert.ok(!Object.keys(f.calls[1].options.env).some(k=>/API_?KEY|TOKEN|SECRET|PASSWORD/i.test(k)));
});
