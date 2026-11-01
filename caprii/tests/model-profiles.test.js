'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {candidates,fallbackModels}=require('../src/main/model-profiles');
const models=['gemini-3.5-flash-lite','gemini-3.8-flash','gemini-2.5-pro','gemini-3.1-pro-preview','gemini-flash-latest','gemini-2.5-flash'];
test('quality profiles choose only listed stable models in the requested tier',()=>{
 assert.deepEqual(candidates(models,'quality'),['gemini-2.5-pro']);
 assert.equal(candidates(models,'balanced')[0],'gemini-3.8-flash');
 assert.deepEqual(candidates(models,'speed'),['gemini-3.5-flash-lite']);
 assert.deepEqual(candidates(['gemini-3.1-pro-preview'],'quality'),[]);
 assert.deepEqual(candidates([],'quality'),[]);
});
test('quality falls back to available non-Lite Flash only when no stable Pro is listed',()=>{
 assert.equal(candidates(models.filter(m=>!m.includes('2.5-pro')),'quality')[0],'gemini-3.8-flash');
 assert.deepEqual(candidates(['gemini-3.5-flash-lite'],'quality'),[]);
});
test('Gemini retries cannot silently change model tier or introduce previews',()=>{
 for(const selected of ['gemini-3.5-flash-lite','gemini-3.8-flash','gemini-2.5-pro']){
  const got=fallbackModels({provider:'gemini',selected,models});
  assert.equal(got[0],selected);assert.ok(!got.some(m=>m.includes('preview')));
  if(selected.includes('lite'))assert.deepEqual(got,[selected]);
  if(selected.includes('pro'))assert.deepEqual(got,[selected]);
  if(selected==='gemini-3.8-flash')assert.deepEqual(got,[selected,'gemini-flash-latest','gemini-2.5-flash']);
 }
});
