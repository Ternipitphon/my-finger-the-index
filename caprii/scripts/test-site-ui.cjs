'use strict';
const electron=require('electron');const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'caprii-site-ui-'));electron.app.setPath('userData',profile);
electron.app.commandLine.appendSwitch('use-angle','swiftshader');electron.app.commandLine.appendSwitch('enable-unsafe-swiftshader');
let opened=[],confirmations=[];electron.dialog.showMessageBox=async(_parent,options)=>{confirmations.push(options.message);if(options.message!=='เปิดเว็บไซต์ในเบราว์เซอร์?')throw Error('Unexpected dialog');return{response:1};};
electron.shell.openExternal=async url=>{opened.push(url);};
const config=require('../src/main/config');config.save({provider:'gemini',chatModel:'fixture',welcomed:true,linked:true,render:'software'});
const llm=require('../src/main/llm');llm.models=async()=>['fixture'];llm.chat=async()=>{throw Error('YouTube opening must not call the LLM');};process.env.CAPRI_PORT='49177';
const timer=setTimeout(()=>{console.error('UI site smoke timed out');electron.app.exit(1);},30000);
require('../src/main/main');
electron.app.whenReady().then(async()=>{
 let overlay;
 for(let i=0;i<100;i++){overlay=electron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('capri://app/'));if(overlay&&await overlay.webContents.executeJavaScript('!!window.dev').catch(()=>false))break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(overlay);
 await new Promise(r=>setTimeout(r,2500));
 const pet=await overlay.webContents.executeJavaScript(`(()=>{const c=window.dev.capri;return {x:c.pos.x,y:c.pos.y,w:innerWidth,h:innerHeight,scale:c.scale};})()`);
 assert.ok(Math.abs(pet.x-pet.w/2)<3,JSON.stringify(pet));assert.ok(Math.abs(pet.y-(pet.h/2+210*pet.scale))<6,JSON.stringify(pet));
 const idle=await overlay.webContents.executeJavaScript(`(()=>{const c=window.dev.capri,chat=window.dev.chat;const random=Math.random;Math.random=()=>0.4;c.stance='stand';c.wander=true;c.wanderStep();Math.random=random;const walking=!!c.idleWalk;chat.turn=123;const paused=c.autonomyPaused();c.behave(performance.now());const stopped=!c.idleWalk;chat.turn=0;return{walking,paused,stopped};})()`);
 assert.deepEqual(idle,{walking:true,paused:true,stopped:true});
 console.log('PASS: actual renderer starts centered; random movement exists and stops while a task is active');
 await overlay.webContents.executeJavaScript(`(async()=>{await window.dev.chat.start();await window.dev.chat.send('เปิดyoutube');})()`);
 assert.deepEqual(opened,['https://www.youtube.com/']);assert.deepEqual(confirmations,['เปิดเว็บไซต์ในเบราว์เซอร์?']);
 console.log('PASS: real renderer Thai YouTube command -> main IPC -> explicit confirmation -> OS browser launch API; no LLM call');clearTimeout(timer);electron.app.exit(0);
}).catch(e=>{console.error(e);clearTimeout(timer);electron.app.exit(1);});
