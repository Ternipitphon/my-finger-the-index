'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(autoplay){
 const source=fs.readFileSync(path.join(__dirname,'../src/main/main.js'),'utf8');
 const code=source.slice(source.indexOf("  ipcMain.handle('media:run'"),source.indexOf("  ipcMain.handle('apps:music'"));
 const calls=[],sender={},overlay={webContents:sender};sender.send=()=>{};let handle;
 const box={ipcMain:{handle:(_,f)=>handle=f},overlay,chromeBroker:{},chats:new Map(),spotifyConnecting:false,AbortController,AbortSignal,Number,URL,resolveLang:()=> 'th',config:{load:()=>({spotifyAutoPlay:autoplay}),save(){}},require:name=>name==='./media-player'?{...require('../src/main/media-player'),runSpotify:async({request})=>{calls.push(['play',request]);return{ok:true,verified:true};}}:name==='./launch'?{site:async url=>{calls.push(['open',url]);return true;}}:name==='./spotify-session'?{connectSpotify:async({open})=>{await open();return{};}}:(()=>{throw Error('Unexpected module '+name);})()};
 vm.runInNewContext(code,box);return{calls,run:r=>handle({sender},r)};
}
test('Spotify opening uses the backend autoplay default and opens/plays without generic website dialog',async()=>{
 for(const preference of [undefined,true]){const f=fixture(preference);assert.equal((await f.run({id:1,autoOpen:true})).ok,true);assert.deepEqual(f.calls.map(x=>x[0]),['open','play']);assert.equal(f.calls[1][1].collection,'current');}
});
test('disabled opening-autoplay still actually opens Spotify; an explicit play overrides that preference',async()=>{
 const f=fixture(false);assert.equal((await f.run({id:1,autoOpen:true})).ok,true);assert.deepEqual(f.calls.map(x=>x[0]),['open']);
 await f.run({id:2,media:{service:'spotify',action:'play',collection:'current'}});assert.deepEqual(f.calls.map(x=>x[0]),['open','open','play']);
});
