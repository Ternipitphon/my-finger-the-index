'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createOverlayInput}=require('../src/main/overlay-input');
function fixture(){const calls=[];let destroyed=false;const win={isDestroyed:()=>destroyed,setIgnoreMouseEvents:(ignore,options)=>calls.push({ignore,options})};return {calls,input:createOverlayInput(()=>win),destroy:()=>destroyed=true};}
test('a held character stays clickable despite stale hit-test and rearm requests',()=>{const {input,calls}=fixture();input.hold(true);input.setInteractive(false);assert.equal(input.rearm(),false);assert.ok(calls.every(x=>x.ignore===false));input.hold(false);assert.equal(calls.at(-1).ignore,true);});
test('releasing drag preserves an open chat hit area and reload resets a stale hold',()=>{const {input,calls}=fixture();input.setInteractive(true);input.hold(true);input.hold(false);assert.equal(calls.at(-1).ignore,false);input.hold(true);input.reset();assert.equal(input.held,false);assert.equal(calls.at(-1).ignore,true);});
test('rearm only toggles the native hook when there is no active drag',()=>{const {input,calls}=fixture();input.setInteractive(true);calls.length=0;assert.equal(input.rearm(),true);assert.deepEqual(calls.map(x=>x.ignore),[false,true]);assert.deepEqual(calls.at(-1).options,{forward:true});});
test('destroyed overlays safely ignore late release and rearm requests',()=>{const f=fixture();f.destroy();f.input.hold(true);f.input.hold(false);assert.equal(f.input.rearm(),false);assert.equal(f.calls.length,0);});
