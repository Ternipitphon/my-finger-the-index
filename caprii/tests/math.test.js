'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate,solvePuzzle,verifyPuzzle,allowMathText,registerMath}=require('../src/main/agent-math');
const {ToolRegistry}=require('../src/main/agent-registry');
test('exact arithmetic, operator precedence and rational decimals',()=>{
 for(const [s,v] of [['7*42+1','295'],['(3+1)*7','28'],['0.1+0.2','3/10'],['1/3+1/6','1/2'],['-3×(2−5)','9']])assert.equal(evaluate(s).value,v);
});
test('math parser never evaluates JavaScript or unsupported operators',()=>{
 for(const s of ['process.exit()','1;require("fs")','2**1000','1/0','Math.random()',''])assert.throws(()=>evaluate(s));
});
test('reported number puzzle is unsolvable under basic operators; no invented 42',()=>{
 const r=solvePuzzle({numbers:[3,1,7,1],target:82});assert.equal(r.found,false);assert.equal(r.exhaustive,true);
 const check=verifyPuzzle({numbers:[3,1,7,1],target:82,expression:'7*42+1'});assert.equal(check.valid,false);assert.equal(check.usesNumbers,false);assert.equal(check.value,'295');
});
test('solutions use original numbers once and are independently verified',()=>{
 for(const [numbers,target] of [[[3,1,7,1],32],[[1,3,4,6],24],[[2,2,2,2],0],[[5,0],0]]){
  const r=solvePuzzle({numbers,target});assert.equal(r.found,true);assert.equal(verifyPuzzle({numbers,target,expression:r.expression}).valid,true);
 }
});
test('joining digits is explicit, not assumed',()=>{
 assert.equal(solvePuzzle({numbers:[1,2],target:12}).found,false);
 const r=solvePuzzle({numbers:[1,2],target:12,allowJoin:true});assert.equal(r.found,true);assert.equal(r.expression,'12');
});
test('unverified numeric/word answers cannot be typed into math tasks',async()=>{
 const c={mathTask:true,signal:AbortSignal.timeout(1000)};
 assert.throws(()=>allowMathText(c,'82'));
 const tools=registerMath(new ToolRegistry());await tools.execute({tool:'math.solve',numbers:[3,1,7,1],target:82},c);assert.throws(()=>allowMathText(c,'82'));
 const worksheet={mathTask:true,signal:AbortSignal.timeout(1000)};
 await tools.execute({tool:'math.evaluate',expression:'14+27'},worksheet);allowMathText(worksheet,'41');assert.throws(()=>allowMathText(worksheet,'สี่สิบเอ็ด'));assert.throws(()=>allowMathText(worksheet,'42'));
});
test('batch calculation verifies multiple worksheet answers in one tool call',async()=>{
 const c={mathTask:true,signal:AbortSignal.timeout(1000)},tools=registerMath(new ToolRegistry());
 const r=await tools.execute({tool:'math.batch',items:[{id:'1',expression:'14+27'},{id:'2',expression:'83-36'}]},c);
 assert.deepEqual(r.result.results.map(x=>x.value),['41','47']);allowMathText(c,'41');allowMathText(c,'47');assert.throws(()=>allowMathText(c,'48'));
});
test('a failed constrained puzzle cannot be bypassed with a different calculator expression',async()=>{
 const c={mathTask:true,signal:AbortSignal.timeout(1000),permission:async()=>{throw Error('No rule changes approved');}},tools=registerMath(new ToolRegistry());
 await tools.execute({tool:'math.solve',numbers:[3,1,7,1],target:82},c);
 await assert.rejects(tools.execute({tool:'math.evaluate',expression:'7*42+1'},c));
 await assert.rejects(tools.execute({tool:'math.evaluate',expression:'82'},c));
 await assert.rejects(tools.execute({tool:'math.batch',items:[{id:'1',expression:'82'}]},c));
 await assert.rejects(tools.execute({tool:'math.solve',numbers:[7,42,1],target:295},c));
 assert.throws(()=>allowMathText(c,'82'));
});
