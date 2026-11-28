'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ui=require('../src/renderer/js/ui-catalog');
test('English UI slots preserve Thai names, paths, and literal replacement tokens',()=>{
 for(const value of ['เพลงที่ฉันชอบ','C:\\ผู้ใช้\\งาน.txt','$& $1 {0}']){
 const key=Object.keys(ui.entries).find(k=>k.includes('{0}')&&!k.includes('{1}'));
 const expected=ui.entries[key].replace('{0}',()=>value);
 assert.equal(ui.text(key,'en',[value]),expected);
 assert.equal(ui.message(ui.text(key,'th',[value]),'en'),expected);
 }
 assert.equal(ui.message('ผู้ใช้ตั้งชื่อเพลงว่า ยกเลิก','en'),'ผู้ใช้ตั้งชื่อเพลงว่า ยกเลิก');
 assert.equal(ui.text('ยกเลิก','th'),'ยกเลิก');assert.equal(ui.text('ยกเลิก','en'),'Cancel');
});
test('native permissions keep button order, cancel/default IDs and data unchanged',async()=>{
 let calls=0,actual;const result={response:0,checkboxChecked:false},signal=new AbortController().signal;
 const native={showMessageBox:async(win,options)=>{calls++;actual=options;assert.equal(win,'window');return result;}};
 const options={title:'ลืมการจับคู่ Chrome?',message:'ส่วนขยายที่จำไว้จะเชื่อมกลับไม่ได้จนกว่าจะจับคู่ใหม่',detail:JSON.stringify({query:'เพลงไทย',path:'C:\\งาน'}),buttons:['ยกเลิก','ลืมการจับคู่'],defaultId:0,cancelId:0,signal};
 const wrapper=ui.localizeDialog(native,()=> 'en');assert.equal(await wrapper.showMessageBox('window',options),result);
 assert.equal(calls,1);assert.deepEqual(actual.buttons,['Cancel','Forget pairing']);assert.equal(actual.detail,options.detail);assert.equal(actual.defaultId,0);assert.equal(actual.cancelId,0);assert.equal(actual.signal,signal);assert.equal(options.buttons[0],'ยกเลิก');
});
test('browser and desktop use the identical first-party UI catalogue',()=>{
 assert.equal(fs.readFileSync(path.join(__dirname,'../browser-extension/ui-catalog.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../src/renderer/js/ui-catalog.js'),'utf8'));
 for(const [key,value]of Object.entries(ui.entries)){assert.equal(typeof value,'string');assert.equal(/[\u0e00-\u0e7f]/.test(value),false,key);}
});
