'use strict';
// No commands/actions are executed. --live explicitly uses the configured Gemini API quota.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),data=path.join(root,'training/intent');
function rows(split){return fs.readFileSync(path.join(data,split+'.jsonl'),'utf8').trim().split('\n').map(JSON.parse);}
function validate(){const ids=new Set(),inputs=new Map(),families=new Map();for(const split of ['train','dev','test'])for(const r of rows(split)){
 if(ids.has(r.id)||r.split!==split)throw Error('Duplicate ID or invalid split');ids.add(r.id);
 const key=JSON.stringify(r.input);if(inputs.has(key)&&inputs.get(key)!==split)throw Error('Exact input leaked');inputs.set(key,split);
 if(families.has(r.family)&&families.get(r.family)!==split)throw Error('Family leaked');families.set(r.family,split);
 if(!['chat','look','media','website','agent','selected-tab','public-web','clarify'].includes(r.expected.route))throw Error('Invalid target route');
 }return{train:rows('train').length,dev:rows('dev').length,test:rows('test').length};}
async function main(){
 const sizes=validate();if(!process.argv.includes('--live')){console.log(JSON.stringify({validated:sizes,apiCalls:0}));return;}
 const baseline='4e32e113068eb91b502b2c74732477ff04a40e66',filename=path.join(root,'src/main/command-interpreter.js');
 const previous=new Module(filename,module);previous.filename=filename;previous.paths=Module._nodeModulePaths(path.dirname(filename));previous._compile(execFileSync('git',['show',baseline+':caprii/src/main/command-interpreter.js'],{cwd:root,encoding:'utf8'}),filename);
 const implementations={baseline:previous.exports.interpretCommand,candidate:require(filename).interpretCommand},llm=require('../src/main/llm');
 const all=rows('test'),seen=new Set(),pilot=all.filter(r=>{if(seen.has(r.expected.route))return false;seen.add(r.expected.route);return true;}).concat(all.filter(r=>r.id.startsWith('test-reference-')));
 const results=[];let requests=0;const model='models/gemini-3.1-flash-lite';
 for(const r of pilot)for(const [variant,interpret] of Object.entries(implementations)){
  const started=Date.now();const result=await interpret({...r.input,personality:{personalityStyle:'playful'},timeoutMs:30000,request:async(messages,signal)=>{
   if(++requests>24)throw Error('Live benchmark request budget exceeded');
   return llm.chat('gemini',{}, {model,messages,jsonMode:true},()=>{},signal);
  }});
  const item={id:r.id,variant,expected:r.expected.route,actual:result.route,correct:result.route===r.expected.route,reason:result.reason||null,latencyMs:Date.now()-started};results.push(item);console.log(JSON.stringify(item));
 }
 const summary={schema:1,model,baselineCommit:baseline,candidateCommit:'working-tree-frozen-before-run',datasetSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(data,'test.jsonl'))).digest('hex'),scope:'10 preselected held-out pilot cases; routes only, no account actions; provider failures count as failures',apiRequests:requests,variants:{},results};
 for(const variant of Object.keys(implementations)){const items=results.filter(x=>x.variant===variant);summary.variants[variant]={correct:items.filter(x=>x.correct).length,total:items.length,accuracy:items.filter(x=>x.correct).length/items.length,providerOrFormatOrValidationFailures:items.filter(x=>x.reason).length};}
 fs.mkdirSync(path.join(data,'results'),{recursive:true});fs.writeFileSync(path.join(data,'results/llm-pilot.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary.variants));
}
if(require.main===module)main().catch(e=>{console.error(e.code||e.name||'Benchmark failed');process.exitCode=1;});
module.exports={validate};
