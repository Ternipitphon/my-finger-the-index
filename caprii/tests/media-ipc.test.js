'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(autoplay,lang='th',repeatedProgress=0){
 const source=fs.readFileSync(path.join(__dirname,'../src/main/main.js'),'utf8');
 const code=source.slice(source.indexOf("  ipcMain.handle('media:run'"),source.indexOf("  ipcMain.handle('apps:music'"));
 const calls=[],packets=[],sender={},overlay={webContents:sender};sender.send=(_name,packet)=>packets.push(packet);let handle;
 const box={ipcMain:{handle:(_,f)=>handle=f},overlay,chromeBroker:{},chats:new Map(),spotifyConnecting:false,AbortController,AbortSignal,Number,URL,resolveLang:()=>lang,config:{load:()=>({spotifyAutoPlay:autoplay}),save(){}},require:name=>name==='./media-player'?{...require('../src/main/media-player'),runSpotify:async({request})=>{calls.push(['play',request]);return{ok:true,verified:true};}}:name==='./launch'?{site:async url=>{calls.push(['open',url]);return true;}}:name==='./spotify-session'?{connectSpotify:async({open,onProgress})=>{for(let i=0;i<repeatedProgress;i++)onProgress('waiting');await open();return{};}}:(()=>{throw Error('Unexpected module '+name);})()};
 vm.runInNewContext(code,box);return{calls,packets,run:r=>handle({sender},r)};
}
test('Spotify opening uses the backend autoplay default and opens/plays without generic website dialog',async()=>{
 for(const preference of [undefined,true]){const f=fixture(preference);assert.equal((await f.run({id:1,autoOpen:true})).ok,true);assert.deepEqual(f.calls.map(x=>x[0]),['open','play']);assert.equal(f.calls[1][1].collection,'current');}
});
test('disabled opening-autoplay still actually opens Spotify; an explicit play overrides that preference',async()=>{
 const f=fixture(false);assert.equal((await f.run({id:1,autoOpen:true})).ok,true);assert.deepEqual(f.calls.map(x=>x[0]),['open']);
 await f.run({id:2,media:{service:'spotify',action:'play',collection:'current'}});assert.deepEqual(f.calls.map(x=>x[0]),['open','open','play']);
});

test('verified unnamed playback in English does not claim an empty or invented track title',async()=>{
 const f=fixture(true,'en');const r=await f.run({id:1,media:{service:'spotify',action:'play',collection:'current'}});assert.equal(r.verified,true);assert.match(r.text,/current player/);assert.doesNotMatch(r.text,/undefined|“”/);
});

test('the media IPC emits one progress snapshot for repeated reconnect polls',async()=>{const f=fixture(true,'th',50);await f.run({id:1,media:{service:'spotify',action:'play',collection:'current'}});assert.equal(f.packets.length,1);assert.equal(f.packets[0].kind,'status');assert.equal(f.packets[0].text,'waiting');});
