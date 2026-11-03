'use strict';
const {app,BrowserWindow,protocol,net}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');let win;
protocol.registerSchemesAsPrivileged([{scheme:'capri',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.commandLine.appendSwitch('use-angle','swiftshader');app.commandLine.appendSwitch('enable-unsafe-swiftshader');app.on('window-all-closed',()=>{});
const timeout=setTimeout(()=>{console.error('Companion regression timed out');app.exit(1);},30000);
app.whenReady().then(async()=>{
 protocol.handle('capri',request=>{const u=new URL(request.url),file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep))return new Response('Forbidden',{status:403});if(file===path.join(root,'src/renderer/index.html'))return new Response(fs.readFileSync(file,'utf8').replace('src="js/app.js"','src="../../scripts/companion-ui-fixture.js"'),{headers:{'Content-Type':'text/html'}});return net.fetch(pathToFileURL(file).href);});
 win=new BrowserWindow({show:true,transparent:true,frame:false,focusable:false,skipTaskbar:true,width:1000,height:800,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
 await win.loadURL('capri://app/src/renderer/index.html');win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});const page=code=>win.webContents.executeJavaScript(code);
 for(let i=0;i<100&&!await page('!!window.fixtureReady');i++)await new Promise(r=>setTimeout(r,20));assert.equal(await page('!!window.fixtureReady'),true,errors.join('\n'));
 await page('fixtureCapri.setView(innerWidth,innerHeight,innerHeight-10);fixtureCapri.pos={x:350,y:500};fixtureCapri.place()');
 const p=await page('fixturePoint()');await page('fixtureCapri.busy=true;fixtureCapri.refuseUntil=performance.now()+999999');
 win.webContents.sendInputEvent({type:'mouseMove',...p});win.webContents.sendInputEvent({type:'mouseDown',...p,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,30));
 assert.equal(await page('fixtureCapri.pointerHeld'),true);console.log('Pointer capture available on nonfocusable overlay:',await page('fixtureCapri.canvas.hasPointerCapture(1)'));
 win.webContents.sendInputEvent({type:'mouseMove',x:p.x+250,y:p.y-100});await page(`fixtureCursor={x:${p.x+250},y:${p.y-100}}`);await new Promise(r=>setTimeout(r,100));assert.equal(await page('fixtureCapri.dragging'),true);const moved=await page('fixtureCapri.pos.x');assert.ok(moved>500);
 win.webContents.sendInputEvent({type:'mouseUp',x:p.x+250,y:p.y-100,button:'left',clickCount:1});await page(`fixtureCursor=null;window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}))`);await new Promise(r=>setTimeout(r,30));assert.equal(await page('fixtureCapri.dragging'),false);assert.equal(await page('fixtureCapri.pointerHeld'),false);
 await page("fixtureCapri.canvas.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true}))");assert.equal(await page('fixtureCapri.pointerHeld'),false);
 // Regression: only legacy mouse events arrive from the Windows forwarding hook.
 await page(`fixtureCapri.cancelDrag();fixtureCapri.pos={x:350,y:500};fixtureCapri.place();`);
 let point=await page('fixturePoint()');
 await page(`(()=>{const p=${JSON.stringify(point)};fixtureCapri.canvas.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,buttons:1,clientX:p.x,clientY:p.y}));window.dispatchEvent(new Event('blur'));fixtureCapri.canvas.dispatchEvent(new PointerEvent('lostpointercapture',{bubbles:true,pointerType:'mouse'}));window.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,buttons:1,clientX:p.x+180,clientY:p.y-40}));})()`);
 assert.equal(await page('fixtureCapri.dragging'),true);assert.ok(await page('fixtureCapri.pos.x')>450);
 await page(`window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:2}))`);assert.equal(await page('fixtureCapri.pointerHeld'),true);
 await page(`window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}))`);assert.equal(await page('fixtureCapri.pointerHeld'),false);
 // No DOM movement at all: the native cursor sampler drives the same hold.
 await page(`fixtureCapri.pos={x:350,y:500};fixtureCapri.place();`);point=await page('fixturePoint()');
 await page(`fixtureCapri.canvas.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,clientX:${point.x},clientY:${point.y}}));fixtureCapri.dragTo({x:${point.x+200},y:${point.y}})`);
 assert.equal(await page('fixtureCapri.dragging'),true);assert.ok(await page('fixtureCapri.pos.x')>500);await page('fixtureCapri.cancelDrag()');assert.equal(await page('fixtureCapri.pointerHeld'),false);
 // Tray pickup follows the cursor without a held button and places on the next left click.
 await page('fixtureCapri.startPlacement({x:400,y:300});fixtureCapri.dragTo({x:650,y:400})');assert.equal(await page('fixtureCapri.dragging'),true);assert.ok(await page('fixtureCapri.pos.x')>550);
 await page(`fixtureCapri.canvas.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,clientX:650,clientY:400}))`);assert.equal(await page('fixtureCapri.pointerHeld'),false);
 await page('fixtureCapri.startPlacement({x:400,y:300})');await page(`fixtureCapri.canvas.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2}))`);assert.equal(await page('fixtureCapri.pointerHeld'),false);
 // A walk that started before the press must not resume over the user's new position.
 await page(`fixtureCapri.cancelDrag();fixtureCapri.pos={x:450,y:650};fixtureCapri.setStance('stand');fixtureCapri.place();fixtureCapri.readMouseState=async()=>fixtureCursor;fixtureCapri.idleWalk={x:450,to:650,at:performance.now()-500,duration:1000};fixtureCapri.nextMove=0;`);
 const walkPoint=await page('fixturePoint()');
 await page(`fixtureCursor={x:${walkPoint.x},y:${walkPoint.y},primaryDown:true};fixtureCapri.canvas.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,clientX:${walkPoint.x},clientY:${walkPoint.y}}))`);
 await new Promise(r=>setTimeout(r,100));assert.equal(await page('fixtureCapri.pos.x'),450);assert.equal(await page('fixtureCapri.idleWalk'),null);assert.ok(await page('fixtureCapri.nextMove-performance.now()')>20000);
 await page('fixtureCapri.cancelDrag();fixtureCursor=null');
 console.log('PASS: pressing during an idle walk cancels the old walk and postpones autonomous movement');
 // Repeated physical-button lifecycle: premature DOM up must not cancel a held mouse.
 await page(`fixtureCapri.cancelDrag();fixtureCapri.readMouseState=async()=>fixtureCursor;fixtureCapri.pos={x:450,y:650};fixtureCapri.setStance('stand');fixtureCapri.place();`);
 for(let round=0;round<30;round++){
  if(round===15)await page('fixtureMotion("full")');
  const start=await page('fixturePoint()');
  await page(`(()=>{const p=${JSON.stringify(start)};fixtureCursor={x:p.x,y:p.y,primaryDown:true};fixtureCapri.canvas.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,clientX:p.x,clientY:p.y}));window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,pointerType:'mouse'}));window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}));})()`);
  await new Promise(r=>setTimeout(r,85));assert.equal(await page('fixtureCapri.pointerHeld'),true,'premature up at cycle '+round);
  const before=await page('fixtureCapri.pos.x');const dx=before>500?-45:45;
  await page(`fixtureCursor={x:${start.x+dx},y:${start.y-5},primaryDown:true};fixtureTracker.tick()`);
  assert.equal(await page('fixtureCapri.dragging'),true);assert.ok(Math.abs(await page('fixtureCapri.pos.x')-before)>20,'movement at cycle '+round);
  // No DOM mouseup: a fresh physical release must still finish the gesture.
  await page('fixtureCursor={...fixtureCursor,primaryDown:false};fixtureTracker.tick()');
  assert.equal(await page('fixtureCapri.pointerHeld'),false,'physical release at cycle '+round);
  assert.equal(await page('fixtureCapri.dragging'),false);
  await new Promise(r=>setTimeout(r,20));
 }
 console.log('PASS: 30 consecutive press/drag/release cycles (15 reduced + 15 full animation);  premature DOM pointerup+mouseup ignored while physical button remains pressed; missing DOM release recovered from physical state');
 console.log('PASS mouse-only drag after blur/lost capture, native-cursor-only movement, right-button release isolation, tray pickup/place/cancel; nonfocusable transparent overlay');
 console.log('PASS: actual Capri sprite hit, busy/refusal override, cursor sampler fallback after native movement delivery is lost, release and cancellation (virtual viewport/cursor fixture; not Windows OS input)');
 win.destroy();clearTimeout(timeout);app.exit(0);
}).catch(e=>{console.error(e);clearTimeout(timeout);app.exit(1);});
