'use strict';
// Exact rational arithmetic. No eval, shell, network, or floating-point answer guesses.
const abs=n=>n<0n?-n:n;
function gcd(a,b){a=abs(a);b=abs(b);while(b){[a,b]=[b,a%b];}return a||1n;}
function fraction(n,d=1n){if(d===0n)throw Error('Division by zero');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);n/=g;d/=g;if(abs(n).toString(2).length>512||d.toString(2).length>512)throw Error('Arithmetic size limit');return{n,d};}
const key=x=>x.n+'/'+x.d;
const format=x=>x.d===1n?String(x.n):String(x.n)+'/'+x.d;
function decimal(value){const s=String(value);if(!/^-?\d{1,12}(?:\.\d{1,6})?$/.test(s))throw Error('Use a finite number with at most 6 decimal places');const negative=s.startsWith('-');const [whole,tail='']=s.replace(/^-/,'').split('.');return fraction(BigInt((negative?'-':'')+whole+tail),10n**BigInt(tail.length));}
function operate(a,b,op){if(op==='+')return fraction(a.n*b.d+b.n*a.d,a.d*b.d);if(op==='-')return fraction(a.n*b.d-b.n*a.d,a.d*b.d);if(op==='*')return fraction(a.n*b.n,a.d*b.d);return fraction(a.n*b.d,a.d*b.n);}
function evaluate(expression){
 if(typeof expression!=='string'||expression.length>300)throw Error('Expression too long');
 const source=expression.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
 const tokens=source.match(/\d+(?:\.\d+)?|[()+*/-]/g)||[];
 if(tokens.join('')!==source.replace(/\s/g,'')||tokens.length>120)throw Error('Only numbers, + - * / and parentheses are supported');
 let at=0,depth=0;const literals=[];
 function atom(){if(++depth>30)throw Error('Nesting limit');let out;const t=tokens[at++];
  if(t==='+'||t==='-'){out=atom();if(t==='-')out=fraction(-out.n,out.d);}
  else if(t==='('){out=sum();if(tokens[at++]!==')')throw Error('Missing closing parenthesis');}
  else if(t&&/^\d/.test(t)){literals.push(t);out=decimal(t);}else throw Error('Expected a number');
  depth--;return out;
 }
 function product(){let out=atom();while(tokens[at]==='*'||tokens[at]==='/'){const op=tokens[at++];out=operate(out,atom(),op);}return out;}
 function sum(){let out=product();while(tokens[at]==='+'||tokens[at]==='-'){const op=tokens[at++];out=operate(out,product(),op);}return out;}
 const value=sum();if(at!==tokens.length)throw Error('Unexpected expression token');
 return{value:format(value),rational:value,literals};
}
function validatePuzzle(numbers,target,allowJoin){
 if(!Array.isArray(numbers)||numbers.length<1||numbers.length>5||numbers.some(n=>!Number.isSafeInteger(n)||n<0||n>10000))throw Error('Use 1–5 nonnegative integers up to 10000');
 if(typeof allowJoin!=='boolean')throw Error('allowJoin must be true or false');
 if(allowJoin&&numbers.some(n=>n>9))throw Error('Joining is supported only for individual digits');
 return decimal(target);
}
function verifyPuzzle({expression,numbers,target,allowJoin=false}){
 const wanted=validatePuzzle(numbers,target,allowJoin),result=evaluate(expression);
 const used=allowJoin?result.literals.flatMap(s=>s.split('')):result.literals;
 const required=numbers.map(String).sort(),actual=used.slice().sort();
 const usesNumbers=JSON.stringify(required)===JSON.stringify(actual);
 return{valid:usesNumbers&&key(result.rational)===key(wanted),usesNumbers,value:result.value,target:format(wanted),expression,rules:{operators:['+','-','*','/'],allowJoin,useEachNumberOnce:true}};
}
function solvePuzzle({numbers,target,allowJoin=false}){
 const wanted=validatePuzzle(numbers,target,allowJoin),memo=new Map();let operations=0;
 const store=(out,v,e)=>{if(++operations>300000)throw Error('Search limit reached; no conclusion about whether a solution exists');out.set(key(v),out.get(key(v))||{v,e});};
 function solve(mask){if(memo.has(mask))return memo.get(mask);const out=new Map();memo.set(mask,out);
  const indices=numbers.map((_,i)=>i).filter(i=>mask&(1<<i));
  if(indices.length===1){const n=numbers[indices[0]];store(out,fraction(BigInt(n)),String(n));}
  else if(allowJoin){const permutation=(left,s)=>{if(!left.length){if(s[0]!=='0')store(out,fraction(BigInt(s)),s);return;}left.forEach((i,k)=>permutation(left.filter((_,j)=>j!==k),s+numbers[i]));};permutation(indices,'');}
  for(let left=(mask-1)&mask;left;left=(left-1)&mask){const right=mask^left;if(!right||left>right)continue;
   for(const a of solve(left).values())for(const b of solve(right).values()){
    for(const [x,y,op] of [[a,b,'+'],[a,b,'-'],[b,a,'-'],[a,b,'*'],[a,b,'/'],[b,a,'/']]){
     if(op==='/'&&y.v.n===0n)continue;store(out,operate(x.v,y.v,op),`(${x.e}${op}${y.e})`);
    }
   }
  }return out;
 }
 const answer=solve((1<<numbers.length)-1).get(key(wanted));
 if(answer){const verified=verifyPuzzle({expression:answer.e,numbers,target,allowJoin});if(!verified.valid)throw Error('Internal solution verification failed');return{found:true,exhaustive:true,...verified};}
 return{found:false,exhaustive:true,numbers,target:format(wanted),rules:{operators:['+','-','*','/'],allowJoin,useEachNumberOnce:true},message:'No solution under exactly these rules. Do not invent another number or fill an answer. Ask about missing digits or other allowed operators.'};
}
function allowMathText(context,value){
 if(!context.mathTask)return;
 const compact=String(value).replace(/\s/g,'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
 if(!context.mathEvidence?.allowed?.includes(compact))throw Error('Calculate and verify this math answer with math.evaluate, math.solve or math.verify before typing/clicking an answer. Do not type a guessed answer or number words.');
}
function describeMath(evidence) {
 if (!evidence) return '';
 if (evidence.kind === 'batch') return 'ผลคำนวณที่ตรวจแล้ว:\n' + evidence.results.map(r => `${r.id}: ${r.expression} = ${r.value}`).join('\n');
 if (evidence.kind === 'calculation') return `ผลคำนวณที่ตรวจแล้ว: ${evidence.expression} = ${evidence.value}`;
 const rules = '+ − × ÷ และวงเล็บ' + (evidence.rules?.allowJoin ? ' รวมการต่อเลข' : ' ไม่ต่อเลข');
 if (evidence.found === false) return `ตรวจแล้วไม่พบคำตอบสำหรับเลข ${(evidence.numbers || []).join(', ')} ให้ได้ ${evidence.target} ภายใต้กฎ ${rules} — ยังไม่กรอกคำตอบ กรุณาตรวจเลขและกติกาเพิ่มเติม`;
 if (evidence.valid === false) return `คำตอบที่เสนอไม่ผ่านการตรวจ: ${evidence.expression} = ${evidence.value} เป้าหมาย ${evidence.target}`;
 return `นิพจน์ที่ตรวจแล้ว: ${evidence.expression} = ${evidence.target} (${rules})`;
}
function registerMath(tools){
 tools.add('math.evaluate',{description:{expression:'arithmetic with numbers and + - * / parentheses',purpose:'Calculate exactly; returns Arabic numerals/fraction, never number words. For number games use math.solve or math.verify instead.'},validate:a=>{if(typeof a.expression!=='string')throw Error('Expected expression');},run:async(a,c)=>{const r=evaluate(a.expression);if(c.puzzleConstraint&&!verifyPuzzle({...c.puzzleConstraint,expression:a.expression}).valid)throw Error('This expression violates the established puzzle numbers or target. Do not replace a failed puzzle with a different calculation.');c.mathEvidence={kind:'calculation',value:r.value,expression:a.expression,allowed:[r.value,a.expression.replace(/\s/g,'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-')]};return{expression:a.expression,value:r.value,verified:true};}});
 tools.add('math.batch', {description:{items:'up to 20 objects with id and expression',purpose:'Calculate a worksheet in one call, then use the exact Arabic results for their corresponding answer fields'},validate:a=>{if(!Array.isArray(a.items)||!a.items.length||a.items.length>20||a.items.some(i=>typeof i.id!=='string'||i.id.length>80||typeof i.expression!=='string'))throw Error('Invalid calculation batch');},run:async(a,c)=>{if(c.puzzleConstraint)throw Error('Finish the current constrained puzzle before using worksheet calculations');const results=a.items.map(i=>({id:i.id,expression:i.expression,value:evaluate(i.expression).value}));c.mathEvidence={kind:'batch',results,allowed:results.map(r=>r.value)};return{results,verified:true};}});
 for(const [name,fn] of [['math.solve',solvePuzzle],['math.verify',verifyPuzzle]])tools.add(name,{description:{numbers:'array of the actual allowed integers read from the task',target:'actual target number',allowJoin:'false unless the rules explicitly permit joining digits',...(name==='math.verify'?{expression:'candidate expression to check'}:{}),purpose:'Verify both arithmetic and use of each given number exactly once. Supports + - * / parentheses only. If no solution, ask about rules; do not guess.'},validate:a=>validatePuzzle(a.numbers,a.target,a.allowJoin??false),run:async(a,c)=>{const constraint={numbers:a.numbers,target:a.target,allowJoin:a.allowJoin??false};if(c.puzzleConstraint&&JSON.stringify(c.puzzleConstraint)!==JSON.stringify(constraint))await c.permission({tool:name,note:'Confirm changed puzzle numbers/target/rules before calculating',previous:c.puzzleConstraint,proposed:constraint});const r=fn(a);c.puzzleConstraint=constraint;const valid=r.found===true||r.valid===true;c.mathEvidence={...r,kind:'puzzle',allowed:valid?[r.expression.replace(/\s/g,'')]:[]};return r;}});
 return tools;
}
module.exports={evaluate,solvePuzzle,verifyPuzzle,registerMath,allowMathText,describeMath};
