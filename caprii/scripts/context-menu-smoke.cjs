'use strict';
const {app,Menu,BrowserWindow,desktopCapturer,screen}=require('electron'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const deadline=setTimeout(()=>{console.error('Context menu smoke timed out');app.exit(1);},30000);
const {createMenuFixture}=require('../tests/helpers/menu-fixture.cjs');
app.whenReady().then(async()=>{
 let preview;
 for(const lang of ['th','en']){
  const f=createMenuFixture({Menu,lang});assert.ok(f.menu.items.length<=15);
  for(const id of ['caprii-pair','caprii-auto-actions','caprii-personality-caring','caprii-lab','caprii-profile-quality'])assert.ok(f.menu.getMenuItemById(id),id);
  const reactions=f.menu.getMenuItemById('caprii-task-animations');assert.equal(reactions.checked,true);reactions.click(reactions);assert.equal(f.cfg.taskAnimations,false);assert.equal(f.cfg.watchScreen,false);
  const autoplay=f.menu.getMenuItemById('caprii-spotify-auto');assert.equal(autoplay.checked,true);autoplay.click(autoplay);assert.equal(autoplay.checked,false);assert.equal(f.cfg.spotifyAutoPlay,false);
  f.menu.getMenuItemById('caprii-talk').click();assert.equal(f.calls[0][0],'chat');
  f.menu.getMenuItemById('caprii-personality-caring').click();assert.equal(f.cfg.personalityStyle,'caring');const rebuilt=f.rebuild();assert.equal(rebuilt.getMenuItemById('caprii-personality-caring').checked,true);if(lang==='th')preview=rebuilt;
 }
 if(process.env.CAPRII_MENU_PREVIEW==='1'){
  const win=new BrowserWindow({x:0,y:0,width:640,height:680,show:true,title:'Caprii menu preview',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<body style="background:#f3f5f7;font:18px sans-serif;padding:16px">Caprii</body>'));win.show();win.focus();
  await new Promise(r=>setTimeout(r,300));preview.popup({window:win,x:24,y:64});await new Promise(r=>setTimeout(r,600));
  const display=screen.getPrimaryDisplay(),sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:display.size});const source=sources.find(s=>s.display_id===String(display.id))||sources[0];assert.ok(source&&!source.thumbnail.isEmpty());
  const size=source.thumbnail.getSize(),target=path.resolve(__dirname,'../artifacts/menu-preview.png');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source.thumbnail.crop({x:0,y:0,width:Math.min(420,size.width),height:Math.min(650,size.height)}).toPNG());preview.closePopup(win);win.destroy();console.log('Saved actual Windows native context-menu preview');
 }
 clearTimeout(deadline);
 console.log('PASS native Electron menu: compact Thai/English hierarchy, recursive command IDs, original actions, checkbox state and personality selection/rebuild');app.exit(0);
}).catch(e=>{console.error(e);clearTimeout(deadline);app.exit(1);});
