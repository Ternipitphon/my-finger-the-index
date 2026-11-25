'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createCompletion}=require('../src/main/task-completion');
test('answer delivery requires real successful input followed by submit on the same window',()=>{
 const c=createCompletion('กรอกคำตอบบนหน้าจอแล้วกดส่ง');assert.equal(c.missing().length,2);
 c.record({tool:'desktop.input',kind:'type',targetHandle:'1'},{});assert.equal(c.missing().length,2);
 c.record({tool:'desktop.input',kind:'click',intent:'submit',targetHandle:'1'},{text:{inputDelivered:true}});assert.equal(c.missing().length,2);
 c.record({tool:'desktop.input',kind:'type',targetHandle:'1'},{text:{inputDelivered:true}});assert.equal(c.missing().length,1);
 c.record({tool:'desktop.input',kind:'key',key:'enter',targetHandle:'2'},{text:{inputDelivered:true}});assert.equal(c.missing().length,1);
 c.record({tool:'desktop.input',kind:'key',key:'enter',targetHandle:'1'},{text:{inputDelivered:true}});assert.deepEqual(c.missing(),[]);
});
test('focusing a field is not filling; a new answer invalidates the previous submit',()=>{
 const c=createCompletion('กรอกคำตอบและกดส่ง');c.record({tool:'browser.click'},{});assert.equal(c.missing().length,2);
 c.record({tool:'browser.click',intent:'answer_key'},{});c.record({tool:'browser.click',intent:'submit'},{});assert.deepEqual(c.missing(),[]);
 c.record({tool:'browser.type'},{});assert.equal(c.missing().length,1);
});

test('asking for an explanation without typing or submission does not create action requirements',()=>{
 const c=createCompletion('คำนวณโจทย์บนหน้าเว็บให้ดู ไม่ต้องกรอกและไม่ต้องกดส่ง');assert.deepEqual(c.missing(),[]);
});
test('the current followup instruction overrides an old no-submit instruction in quoted context',()=>{const c=createCompletion('บริบทคำสั่งผู้ใช้ก่อนหน้า: กรอกแต่ไม่ต้องกดส่ง\nคำสั่งตอนนี้: ตรวจคำตอบแล้วกดส่งคำตอบ\nคำสั่งผู้ใช้: ส่งเลย');assert.equal(c.wanted.submit,true);assert.equal(c.wanted.input,false);});
test('find the answer on screen is read-and-calculate only unless filling is requested',()=>{const c=createCompletion('ดูจอแล้วหาคำตอบ');assert.equal(c.wanted.noInput,true);assert.equal(c.wanted.noSubmit,true);assert.equal(c.wanted.input,false);assert.equal(createCompletion('ดูจอหาคำตอบแล้วกรอกคำตอบและกดส่ง').wanted.submit,true);});
