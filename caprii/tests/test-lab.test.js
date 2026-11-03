'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createTestLab}=require('../src/main/test-lab');
test('installed Test Lab shares one live loopback server and closes it with the app',async t=>{
 const opened=[],lab=createTestLab({openExternal:async url=>opened.push(url)});t.after(()=>lab.close());
 const urls=await Promise.all([lab.open(),lab.open()]);assert.equal(urls[0],urls[1]);assert.match(urls[0],/^http:\/\/127\.0\.0\.1:\d+$/);
 const page=await fetch(urls[0]);assert.equal(page.status,200);assert.match(await page.text(),/Caprii Test Lab/);
 assert.match(await (await fetch(urls[0]+'/suite.js')).text(),/capriiVersion:'0.7.1'/);assert.equal(opened.length,2);
 await lab.close();await assert.rejects(fetch(urls[0]));
 const next=await lab.open();assert.equal((await fetch(next)).status,200);
});
test('browser launch errors are reported; the live lab can be opened again',async t=>{
 let fail=true;const lab=createTestLab({openExternal:async()=>{if(fail)throw Error('browser failed');}});t.after(()=>lab.close());
 await assert.rejects(lab.open(),/browser failed/);fail=false;assert.equal((await fetch(await lab.open())).status,200);
});
test('release includes Test Lab and aligns app, lock and extension versions',()=>{
 const pkg=require('../package.json'),lock=require('../package-lock.json'),manifest=require('../browser-extension/manifest.json');
 assert.equal(pkg.version,'0.7.1');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);assert.equal(manifest.version,pkg.version);
 assert.ok(pkg.build.files.includes('test-lab/dist/**'));assert.ok(pkg.build.files.includes('test-lab/server.mjs'));
});
