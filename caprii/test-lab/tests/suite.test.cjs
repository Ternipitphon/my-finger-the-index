'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const suite=require('../dist/suite.js');
test('versioned suite exposes unique stable cases, plain-language prompts and observable criteria',()=>{
 assert.equal(suite.schemaVersion,1);assert.match(suite.capriiVersion,/^\d+\.\d+\.\d+/);assert.equal(new Set(suite.cases.map(c=>c.id)).size,suite.cases.length);assert.ok(suite.cases.length>=8);
 for(const c of suite.cases){assert.ok(c.id&&c.name&&c.prompt);assert.equal(c.checks.length,3);assert.ok(c.checks.every(x=>typeof x==='string'&&x.length>0));}
});
test('static page resolves local assets and provides result evidence without a manual pass button',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
 for(const m of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g))assert.ok(fs.existsSync(path.join(__dirname,'../dist',m[1])),m[1]);
 for(const id of ['test-result','fixture','checklist','case-status','export'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(!html.includes('onclick='));
});
test('test server serves the lab, rejects writes, and never exposes repository files',async t=>{
 const {createLabServer}=await import('../server.mjs');const server=createLabServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base)).status,200);assert.match(await (await fetch(base+'/suite.js')).text(),/schemaVersion/);
 assert.equal((await fetch(base+'/server.mjs')).status,404);assert.equal((await fetch(base+'/../package.json')).status,404);assert.equal((await fetch(base,{method:'POST'})).status,405);
});

test('external media examples have stable IDs and never claim DOM playback verification',()=>{assert.equal(suite.browserConnection.id,'remember-chrome');assert.equal(suite.browserConnection.status,'not-measured-by-this-page');assert.equal(suite.externalMedia.length,4);assert.equal(new Set(suite.externalMedia.map(x=>x.id)).size,4);for(const e of suite.externalMedia)assert.ok(e.prompt&&e.expected);});
