'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createMenuFixture,walk}=require('./helpers/menu-fixture.cjs');
const {organizeMenu}=require('../src/main/context-menu');
test('actual application menu is compact with common actions first and five ordered categories',()=>{
 const f=createMenuFixture();assert.ok(f.raw.length>35);assert.ok(f.organized.length<=15);
 assert.deepEqual(f.organized.filter(x=>x.click).map(x=>x.id),['caprii-talk','caprii-look','caprii-pickup','caprii-visibility','caprii-quit']);
 assert.deepEqual(f.organized.filter(x=>x.submenu).map(x=>x.label),['นิสัยและเสียง','Chrome และเพลง','AI และงาน','ตัวละครและหน้าจอ','ตั้งค่าและช่วยเหลือ']);
});
test('every original action and checkbox retains the same callback, state, availability and shortcut',()=>{
 for(const lang of ['th','en'])for(const hookInstalled of [true,false]){
  const f=createMenuFixture({lang,hookInstalled}),before=walk(f.raw),after=walk(f.organized);
  for(const old of before.filter(x=>x.click)){
   const same=after.filter(x=>x.click===old.click);assert.equal(same.length,1,old.label);
   for(const key of ['type','checked','enabled','accelerator'])assert.equal(same[0][key],old[key],old.label+' '+key);
  }
  assert.equal(after.filter(x=>x.click).length,before.filter(x=>x.click).length);
  assert.equal(after.find(x=>x.id==='caprii-screen-commentary').checked,false);
 }
});
test('actual quick actions and moved switches still dispatch; all personality choices remain reachable',()=>{
 const f=createMenuFixture(),all=walk(f.organized);for(const id of ['talk','look','pickup'])all.find(x=>x.id==='caprii-'+id).click();
 assert.deepEqual(f.calls,[['chat'],['look'],['pickup']]);
 all.find(x=>x.id==='caprii-spotify-auto').click({checked:false});assert.equal(f.cfg.spotifyAutoPlay,false);
 all.find(x=>x.id==='caprii-personality-caring').click();assert.equal(f.cfg.personalityStyle,'caring');
 const updated=f.rebuild();assert.equal(walk(updated).find(x=>x.id==='caprii-personality-caring').checked,true);
});
test('diagnostics and model/provider lists are discoverable in dedicated submenus',()=>{
 const f=createMenuFixture({lang:'en'}),all=walk(f.organized);
 assert.ok(!f.organized.some(x=>x.id==='caprii-lab'));assert.ok(all.find(x=>x.id==='caprii-diagnostics').submenu.some(x=>x.id==='caprii-lab'));
 assert.equal(all.find(x=>x.id==='caprii-providers').submenu.length,2);assert.equal(all.find(x=>x.id==='caprii-models').submenu.length,2);
 const ids=all.map(x=>x.id).filter(Boolean);assert.equal(ids.length,new Set(ids).size);
});
test('future actions remain visible and menu construction does not execute callbacks',()=>{
 let called=false;const unknown={id:'future-action',label:'Future',click:()=>called=true};const result=organizeMenu([unknown],{lang:'en'});assert.equal(called,false);assert.ok(walk(result).some(x=>x===unknown));
});
test('task reaction switch is separate from screen access and all original manual demo actions remain reachable',()=>{
 const f=createMenuFixture(),all=walk(f.organized);const setting=all.find(x=>x.id==='caprii-task-animations');assert.equal(setting.checked,true);setting.click({checked:false});assert.equal(f.cfg.taskAnimations,false);assert.equal(f.cfg.watchScreen,false);assert.equal(walk(f.rebuild()).find(x=>x.id==='caprii-task-animations').checked,false);
 for(const id of ['caprii-satellite','caprii-demo','caprii-teleport'])assert.equal(all.filter(x=>x.id===id).length,1);
});
