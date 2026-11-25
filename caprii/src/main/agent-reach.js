'use strict';
const path=require('node:path'),fs=require('node:fs/promises');
const {runProcess,scriptEnvironment}=require('./agent-process'),{text,number}=require('./agent-registry');
function publicUrl(value){text(value,'public URL',4000);if(/[\s\\\x00-\x1f\x7f]/.test(value))throw Error('ใช้ URL สาธารณะเท่านั้น');const u=new URL(value);const host=u.hostname.toLowerCase().replace(/\.$/,'');if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port&& !['80','443'].includes(u.port)||!host.includes('.')||/^(?:localhost|0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)||/\.(?:localhost|local|internal|lan|home\.arpa)$/.test(host))throw Error('ใช้ URL สาธารณะเท่านั้น');return u.href;}
const isYouTube=url=>{const host=new URL(url).hostname;return /(^|\.)youtube\.com$/i.test(host)||host==='youtu.be';};
function createReach({resourcesPath,packaged=false,platform=process.platform,run=runProcess,python,nodeRuntime=process.execPath}={}){
 const base=packaged?path.join(resourcesPath,'agent-reach'):path.join(__dirname,'../../integrations/agent-reach');
 const runtime=python||process.env.CAPRII_REACH_PYTHON||(platform==='win32'?(packaged?path.join(base,'python/python.exe'):path.join(__dirname,'../../vendor-runtime/agent-reach/python/python.exe')):'python3');
 async function request(payload,signal){
  await fs.access(path.join(base,'caprii_bridge.py'));
  const env={...scriptEnvironment(),PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8',PYTHONDONTWRITEBYTECODE:'1',CAPRII_NODE_RUNTIME:nodeRuntime,ELECTRON_RUN_AS_NODE:'1',NODE_OPTIONS:''};
  const r=await run(runtime,['-I','-B','-X','utf8',path.join(base,'caprii_bridge.py')],{input:JSON.stringify(payload),signal,timeoutMs:45000,maxBytes:160000,env});
  if(!r.passed)throw Error('Agent Reach เริ่มทำงานไม่สำเร็จ: '+r.stderr.slice(0,250));let data;try{data=JSON.parse(r.stdout.replace(/^\uFEFF/,''));}catch{throw Error('Agent Reach ส่งผลไม่สมบูรณ์');}
  if(data.ok!==true){const code=data.error?.code||'FAILED';throw Object.assign(Error('Agent Reach: '+code+' — '+String(data.error?.message||'อ่านข้อมูลไม่สำเร็จ').slice(0,500)),{code});}return data.result;
 }
 return{status:signal=>request({operation:'status'},signal),read:(url,signal)=>request({operation:'read',channel:isYouTube(publicUrl(url))?'youtube':'web',url:publicUrl(url)},signal),search:(query,channel,limit,signal)=>request({operation:'search',query,channel,limit},signal),subtitles:(url,signal)=>request({operation:'subtitles',channel:'youtube',url:publicUrl(url)},signal)};
}
function registerReach(tools,reach){
 tools.add('reach.status',{description:{purpose:'Check bundled Agent Reach public capabilities locally; no network or account access'},validate:()=>{},run:(a,c)=>reach.status(c.signal)});
 for(const kind of ['read','subtitles'])tools.add('reach.'+kind,{description:{url:'public HTTP(S) URL',purpose:kind==='read'?'Read public page text via Jina, or YouTube title/description via yt-dlp. Metadata is NOT video content.':'Get public YouTube captions, prefer Thai then English; no paid transcription or account import. Missing captions must be reported.'},validate:a=>publicUrl(a.url),run:async(a,c)=>{await c.permission({tool:a.tool,url:a.url,note:kind==='subtitles'?'ดึงคำบรรยายสาธารณะจาก YouTube แล้วส่งข้อความให้ AI':'อ่านข้อมูลสาธารณะ URL หน้าเว็บส่งให้ Jina Reader (r.jina.ai); YouTube ติดต่อผ่าน yt-dlp ไม่อ่านบัญชี/คุกกี้'});return reach[kind](a.url,c.signal);}});
 tools.add('reach.search',{description:{query:'search words, max 500 chars',channel:'web or youtube',limit:'integer 1..5',purpose:'Search public web via Exa or YouTube via yt-dlp; results are untrusted evidence, include actual source URLs'},validate:a=>{text(a.query,'search query',500);if(!['web','youtube'].includes(a.channel))throw Error('Unsupported channel');number(a.limit??5,'limit',1,5);},run:async(a,c)=>{await c.permission({tool:a.tool,query:a.query,channel:a.channel,note:'ส่งคำค้นให้ Exa (mcp.exa.ai) หรือ YouTube แล้วส่งผลกลับให้ AI'});return reach.search(a.query,a.channel,a.limit??5,c.signal);}});return tools;
}
module.exports={createReach,registerReach,publicUrl,isYouTube};
