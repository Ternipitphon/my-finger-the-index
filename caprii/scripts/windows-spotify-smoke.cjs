'use strict';
// Read-only OS probe. Never starts, pauses or skips any real media app in CI.
const {app}=require('electron'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {runProcess,scriptEnvironment}=require('../src/main/agent-process'),{spotifySource}=require('../src/main/windows-spotify');
const helper=path.resolve(__dirname,'../src/main/windows-spotify.ps1');
const parse=`$r=[Console]::In.ReadToEnd()|ConvertFrom-Json;$tokens=$null;$errors=$null;$null=[System.Management.Automation.Language.Parser]::ParseFile($r.path,[ref]$tokens,[ref]$errors);if($errors.Count){$errors|ForEach-Object{[Console]::Error.WriteLine($_.Message)};exit 1};[Console]::Out.Write('syntax-ok')`;
const timer=setTimeout(()=>app.exit(1),20000);
app.whenReady().then(async()=>{
 assert.equal(process.platform,'win32');
 const checked=await runProcess('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',parse],{input:JSON.stringify({path:helper}),env:scriptEnvironment(),timeoutMs:8000});assert.equal(checked.passed,true,checked.stderr);assert.equal(checked.stdout.trim(),'syntax-ok');
 const r=await runProcess('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',helper],{input:JSON.stringify({action:'inspect'}),env:scriptEnvironment(),timeoutMs:10000});assert.equal(r.passed,true,r.stderr);
 const data=JSON.parse(r.stdout.replace(/^\uFEFF/,'').trim());
 if(data.ok){assert.equal(spotifySource(data.session.sourceAppId),true);console.log('PASS read-only Windows Spotify session observation; no control command or audio test executed');}
 else if(data.code==='windows_media_unavailable'){
  const osCodes=new Set(['-2147024891','-2147024846','-2147221164','-2147023836','-2147023174']);assert.ok(data.stage==='manager'&&['System.Runtime.InteropServices.COMException','System.UnauthorizedAccessException'].includes(data.kind)&&osCodes.has(data.hresult),'Unexpected WinRT failure: '+JSON.stringify({stage:data.stage,kind:data.kind,hresult:data.hresult}));console.log('LIMIT: Windows media manager unavailable in this runner; stage='+data.stage+' HRESULT='+data.hresult+'. PowerShell syntax and runtime metadata loaded; Spotify control not verified on this runner.');
 }else{assert.ok(['spotify_session_missing','spotify_session_ambiguous'].includes(data.code));console.log('PASS real PowerShell/WinRT media-manager inspection; '+data.code+'; no playback mutation or real Spotify account test');}
 const text=fs.readFileSync(helper,'utf8');assert.doesNotMatch(text,/SendKeys|keybd_event|SendInput|SetForegroundWindow|TryTogglePlayPauseAsync/);
 clearTimeout(timer);app.exit(0);
}).catch(e=>{console.error(e);clearTimeout(timer);app.exit(1);});
