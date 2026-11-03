'use strict';
const {app}=require('electron'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist/win-unpacked'),resources=path.join(root,'resources'),asar=path.join(resources,'app.asar');
function windowsX64(file){const b=fs.readFileSync(file);assert.equal(b.readUInt16LE(0),0x5a4d);const pe=b.readUInt32LE(0x3c);assert.equal(b.toString('ascii',pe,pe+4),'PE\0\0');assert.equal(b.readUInt16LE(pe+4),0x8664);}
const timer=setTimeout(()=>{console.error('Packaged verification timed out');app.exit(1);},20000);
app.whenReady().then(async()=>{
 assert.equal(require(asar+'/package.json').version,'0.7.3');assert.equal(require(asar+'/src/main/config.js').DEFAULTS.responseLength,'short');assert.match(require(asar+'/src/main/response-style.js').responseMessages([{role:'user',content:'ทดสอบ'}])[0].content,/1–3 ประโยค/);windowsX64(path.join(root,'Caprii.exe'));windowsX64(path.join(resources,'agent-reach/python/python.exe'));
 assert.equal(JSON.parse(fs.readFileSync(path.join(resources,'browser-extension/manifest.json'))).version,'0.7.3');
 assert.equal(fs.readFileSync(path.join(resources,'browser-extension/dom.js'),'utf8'),fs.readFileSync(asar+'/src/shared/browser-dom.js','utf8'));
 assert.ok(fs.existsSync(asar+'/node_modules/@fontsource/chakra-petch/package.json'));
 assert.ok(fs.existsSync(asar+'/node_modules/@fontsource/jetbrains-mono/package.json'));
 assert.equal(fs.readFileSync(path.join(resources,'app.asar.unpacked/src/main/windows.ps1'),'utf8'),fs.readFileSync(path.resolve(__dirname,'../src/main/windows.ps1'),'utf8'));
 assert.equal(typeof require(asar+'/src/main/mouse-button-state.js').createMouseButtonState,'function');
 assert.equal(fs.readFileSync(path.join(resources,'browser-extension/spotify-dom.js'),'utf8'),fs.readFileSync(asar+'/src/shared/spotify-dom.js','utf8'));
 assert.equal(typeof require(asar+'/src/main/media-player.js').runSpotify,'function');
 assert.equal(fs.readFileSync(path.join(resources,'browser-extension/worker.js'),'utf8'),fs.readFileSync(path.resolve(__dirname,'../browser-extension/worker.js'),'utf8'));
 assert.match(fs.readFileSync(path.join(resources,'browser-extension/content.js'),'utf8'),/Commands are dispatched by the extension worker/);
 const opened=[],lab=require(asar+'/src/main/test-lab.js').createTestLab({openExternal:async u=>opened.push(u)});
 try{const url=await lab.open();const page=await fetch(url);assert.equal(page.status,200);assert.match(await page.text(),/Caprii Test Lab/);assert.match(await (await fetch(url+'/suite.js')).text(),/capriiVersion:'0.7.3'/);assert.equal(opened.length,1);}
 finally{await lab.close();}
 console.log('PASS packaged 0.7.3: app/extension versions, Windows x64 binaries, bundled verified Python, fonts, identical DOM bridges, and live Test Lab loaded from app.asar');clearTimeout(timer);app.exit(0);
}).catch(e=>{console.error(e);clearTimeout(timer);app.exit(1);});
