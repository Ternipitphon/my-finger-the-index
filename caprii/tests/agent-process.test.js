'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {runProcess,scriptEnvironment}=require('../src/main/agent-process');
test('script output and nonzero exit are real evidence',async()=>{
 const r=await runProcess(process.execPath,['-e','console.log("executed"); process.exit(7)']);
 assert.equal(r.passed,false);assert.equal(r.exitCode,7);assert.match(r.stdout,/executed/);
});
test('stop interrupts the process and its child tree',async()=>{
 const controller=new AbortController();
 const result=runProcess(process.execPath,['-e',`require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});setInterval(()=>{},1000)`],{signal:controller.signal,timeoutMs:10000});
 setTimeout(()=>controller.abort(),100);
 await assert.rejects(result,{code:'cancelled'});
});
test('process deadline and output limit are enforced',async()=>{
 await assert.rejects(runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{timeoutMs:50}),{code:'timeout'});
 await assert.rejects(runProcess(process.execPath,['-e','console.log("x".repeat(5000))'],{maxBytes:100}),{code:'output_limit'});
});
test('provider credentials are not inherited by project scripts',()=>{
 process.env.CAPRII_TEST_SECRET_TOKEN='do-not-inherit';
 try{assert.equal(scriptEnvironment().CAPRII_TEST_SECRET_TOKEN,undefined);assert.ok(scriptEnvironment().PATH || scriptEnvironment().Path);}finally{delete process.env.CAPRII_TEST_SECRET_TOKEN;}
});
