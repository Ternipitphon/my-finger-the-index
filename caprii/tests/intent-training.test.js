'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {validate}=require('../scripts/benchmark-intents.cjs');
test('synthetic training, development and held-out data have distinct inputs and families',()=>{assert.deepEqual(validate(),{train:124,dev:18,test:42});});
test('trained model report exposes held-out mistakes and cannot claim to have changed Gemini or deployed',()=>{
 const r=require('../training/intent/results/report.json');assert.equal(r.gemini_weights_changed,false);assert.equal(r.deployed_to_caprii,false);assert.equal(r.pretrained_model_fine_tuned,false);assert.equal(r.test_predictions.length,42);const correct=r.test_predictions.filter(x=>x.correct).length;assert.equal(r.test_after_training.accuracy,correct/42);assert.ok(r.test_predictions.some(x=>!x.correct));
 const crypto=require('node:crypto');for(const split of ['train','dev','test'])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../training/intent',split+'.jsonl'))).digest('hex'),r.dataset_sha256[split]);
});
test('runtime few-shot examples exclude held-out inputs',()=>{
 const e=require('../src/shared/decision-examples.json'),held=fs.readFileSync(path.join(__dirname,'../training/intent/test.jsonl'),'utf8').trim().split('\n').map(JSON.parse);for(const row of held)assert.ok(!e.some(x=>x.input===row.input.text));
});
