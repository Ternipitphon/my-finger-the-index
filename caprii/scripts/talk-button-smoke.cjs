'use strict';
const {app,BrowserWindow,protocol,net}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');let win;
protocol.registerSchemesAsPrivileged([{scheme:'capri',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);app.commandLine.appendSwitch('use-angle','swiftshader');app.commandLine.appendSwitch('enable-unsafe-swiftshader');app.on('window-all-closed',()=>{});
const timer=setTimeout(()=>{console.error('Talk button test timeout');app.exit(1);},20000);
app.whenReady().then(async()=>{
 protocol.handle('capri',request=>{const file=path.resolve(root,'.'+new URL(request.url).pathname);if(!file.startsWith(root+path.sep))return new Response('',{status:403});if(file===path.join(root,'src/renderer/index.html'))return new Response(fs.readFileSync(file,'utf8').replace('src="js/app.js"','src="../../scripts/talk-button-ui-fixture.js"'),{headers:{'Content-Type':'text/html'}});return net.fetch(pathToFileURL(file).href);});
 win=new BrowserWindow({show:true,transparent:true,frame:false,focusable:false,width:1000,height:800,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 await win.loadURL('capri://app/src/renderer/index.html');win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});const page=c=>win.webContents.executeJavaScript(c),wait=ms=>new Promise(r=>setTimeout(r,ms));
 for(let i=0;i<100&&!await page('!!window.fixtureReady');i++)await wait(10);
 await page('offer()');await wait(230);
 const p=await page(`(()=>{const r=document.querySelector('[data-id="talk"]').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`);
 win.webContents.sendInputEvent({type:'mouseMove',...p});win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...p});await wait(25);
 assert.equal(await page('fixturePanel.interactionHeld'),true);
 const old=await page('fixturePanel.rect().x');await page('fixturePanel.setAnchor({x:800,y:650,top:500},{w:1000,h:800})');assert.equal(await page('fixturePanel.rect().x'),old);
 await wait(2100);assert.equal(await page('fixturePanel.visible'),true,'idle timeout cannot hide button during press');
 win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...p});await wait(30);
 assert.equal(await page('statusCalls'),1);assert.match(await page('fixturePanel.current.line'),/กำลังเปิด/);assert.equal(await page('focused'),true);assert.equal(await page('fixturePanel.interactionHeld'),false);
 await page('fixtureChat.start()');assert.equal(await page('statusCalls'),1,'repeated clicks do not duplicate status requests');
 await wait(400);assert.equal(await page('fixturePanel.visible'),true);await page('resolveStatus();void 0');await wait(30);
 assert.equal(await page('fixtureChat.open'),true);assert.equal(await page('fixturePanel.chatForm.hidden'),false);assert.equal(await page('fixturePanel.chatInput.disabled'),false);
 // A dismissed pending request must never reopen chat after its late reply.
 await page('fixturePanel.hide();offer();document.querySelector("[data-id=talk]").click();fixturePanel.hide();resolveStatus();void 0');await wait(30);assert.equal(await page('fixtureChat.open'),false);assert.equal(await page('focused'),false);
 // A rejected status request produces a visible diagnostic instead of an unhandled promise.
 await page('offer();document.querySelector("[data-id=talk]").click();rejectStatus();void 0');await wait(30);assert.equal(await page('fixtureChat.open'),false);assert.equal(await page('fixturePanel.visible'),true);assert.match(await page('fixturePanel.quote.textContent'),/fixture status offline/);
 console.log('PASS actual idle Talk button on nonfocusable transparent Electron window: pinned target and timer while pressed, immediate loading, delayed AI status, single-flight, usable chat form, late-dismiss cancellation and visible error. Native Windows hit delivery not tested.');win.destroy();clearTimeout(timer);app.exit(0);
}).catch(e=>{console.error(e);clearTimeout(timer);app.exit(1);});
