'use strict';
// Real Windows UI Automation against a local Spotify-shaped fixture, never a Spotify account.
const {app,BrowserWindow}=require('electron'),assert=require('node:assert/strict'),path=require('node:path');
const {runProcess,scriptEnvironment}=require('../src/main/agent-process');
const {select}=require('../src/main/windows-spotify-search');
app.commandLine.appendSwitch('force-renderer-accessibility');
const helper=path.resolve(__dirname,'../src/main/windows-spotify-search.ps1');
const code=`[Console]::InputEncoding=[Text.Encoding]::UTF8;[Console]::OutputEncoding=[Text.Encoding]::UTF8;$q=[Console]::In.ReadToEnd()|ConvertFrom-Json;. $q.helper -Library;try{$root=[System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]([long]$q.handle));$c=@(Get-CapriiSpotifyCandidates $root 'weathergirl');if($q.kind -eq 'inspect'){@{ok=$true;rows=@($c|ForEach-Object{ConvertTo-CapriiSpotifyPublic $_})}|ConvertTo-Json -Depth 6 -Compress}else{Invoke-CapriiSpotifyCandidate $c $q.row {if($q.block){throw 'fixture guard rejected'}};@{ok=$true}|ConvertTo-Json -Compress}}catch{@{ok=$false;reason=$_.Exception.Message}|ConvertTo-Json -Compress}`;
const timer=setTimeout(()=>app.exit(1),60000);
app.whenReady().then(async()=>{
 assert.equal(process.platform,'win32');
 const w=new BrowserWindow({width:800,height:650,webPreferences:{contextIsolation:true,nodeIntegration:false}});
 await w.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<!doctype html><html><head><style>body{font:20px Arial;background:#222;color:white}section{padding:20px;margin:15px;background:#333}button{font:20px Arial}footer{margin-top:30px}a{color:white}</style></head><body><section role="group" aria-label="Top result"><a href="#track" id="card-title">weathergirl</a><p>เพลง • FLAVOR FOLEY</p><button aria-label="Play" onclick="window.plays=(window.plays||0)+1">▶</button></section><div role="grid" aria-label="Songs"><div role="row"><span role="gridcell"><a href="#track">weathergirl</a></span><span role="gridcell">FLAVOR FOLEY</span></div><div role="row"><span role="gridcell">weathergirl</span><span role="gridcell">Other Artist</span></div></div><footer role="group" aria-label="Playback"><a href="#current">weathergirl</a><p>FLAVOR FOLEY</p><button aria-label="Previous">Previous</button><button aria-label="Play">Play</button><button aria-label="Next">Next</button><input type="range" aria-label="Seek"></footer></body></html>`));
 const handle=w.getNativeWindowHandle().readBigUInt64LE().toString();
 async function call(kind,row,block=false){const r=await runProcess('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',code],{input:JSON.stringify({helper,handle,kind,row,block}),env:scriptEnvironment(),timeoutMs:12000});assert.equal(r.passed,true,r.stderr);return JSON.parse(r.stdout.replace(/^\uFEFF/,'').trim());}
 let snapshot;
 for(let i=0;i<6;i++){snapshot=await call('inspect');if(snapshot.rows?.some(r=>r.kind==='card'))break;await new Promise(r=>setTimeout(r,250));}
 assert.equal(snapshot.ok,true);const target=select(snapshot.rows,'weathergirl');assert.equal(target?.kind,'card',JSON.stringify(snapshot));assert.equal(target.buttonName,'Play');assert.ok(target.texts.includes('เพลง • FLAVOR FOLEY'));assert.equal(snapshot.rows.filter(r=>r.kind==='card').length,1,'footer Play must not become a search card');
 assert.equal((await call('invoke',target,true)).ok,false);assert.equal(await w.webContents.executeJavaScript('window.plays||0'),0,'identity guard rejection must not invoke');
 assert.equal((await call('invoke',target)).ok,true);await new Promise(r=>setTimeout(r,200));assert.equal(await w.webContents.executeJavaScript('window.plays'),1,'only observed card Play invoked once');
 await w.webContents.executeJavaScript("document.getElementById('card-title').textContent='Changed title'");
 assert.equal((await call('invoke',target)).ok,false);assert.equal(await w.webContents.executeJavaScript('window.plays'),1,'stale card must not invoke');
 console.log('PASS real Windows UI Automation: top-result card Play outside song rows; footer excluded; guard and changed-title rejection; one fixture click. No Spotify account/audio test.');
 clearTimeout(timer);w.destroy();app.exit(0);
}).catch(e=>{console.error(e);clearTimeout(timer);app.exit(1);});
