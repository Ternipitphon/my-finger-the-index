'use strict';
const http=require('node:http');
const {randomBytes,timingSafeEqual}=require('node:crypto');
const {browserUrl}=require('./agent-browser');
const identity=require('./extension-identity.json');
function createChromeBroker({port=47824,token=randomBytes(32).toString('base64url'),extensionId=identity.id,timeoutMs=12000}={}){
 let server,starting,connection=null;const pending=new Map(),queue=[];
 const cancel=message=>{for(const p of pending.values())p.reject(Error(message));pending.clear();queue.length=0;};
 const status=()=>connection&&Date.now()-connection.last<8000?{connected:true,url:connection.url,title:connection.title}:{connected:false,paired:!!connection};
 function authorized(req){const got=Buffer.from(req.headers.authorization||''),want=Buffer.from('Bearer '+token);return req.headers['x-caprii-extension']===extensionId&&got.length===want.length&&timingSafeEqual(got,want);}
 async function body(req){let chunks=[],bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>256*1024)throw Error('Request too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
 async function handle(req,res){
  const origin=req.headers.origin,allowed='chrome-extension://'+extensionId;
  if(origin&&origin!==allowed){res.writeHead(403);return res.end();}
  if(origin)res.setHeader('Access-Control-Allow-Origin',allowed);
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type,X-Caprii-Extension');res.setHeader('Access-Control-Allow-Methods','POST');res.writeHead(204);return res.end();}
  if(req.method!=='POST'||!authorized(req)){res.writeHead(403);return res.end('{}');}
  try{
   const data=await body(req);
   if(req.url==='/connect'){
    const url=browserUrl(data.url);cancel('เชื่อมต่อแท็บใหม่แล้ว');
    connection={session:randomBytes(16).toString('hex'),url,title:String(data.title||'').slice(0,200),last:Date.now()};
    return res.end(JSON.stringify({session:connection.session}));
   }
   if(!connection||data.session!==connection.session){res.writeHead(409);return res.end(JSON.stringify({error:'เชื่อมต่อใหม่ก่อน'}));}
   connection.last=Date.now();
   if(req.url==='/poll')return res.end(JSON.stringify({command:queue.shift()||null}));
   if(req.url==='/reply'){
    const p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(Error(String(data.error).slice(0,600))):p.resolve(data.result);}
    return res.end('{}');
   }
   if(req.url==='/disconnect'){cancel('ตัดการเชื่อมต่อ Chrome แล้ว');connection=null;return res.end('{}');}
   res.writeHead(404);res.end('{}');
  }catch(err){res.writeHead(400);res.end(JSON.stringify({error:String(err.message).slice(0,600)}));}
 }
 async function start(){if(server?.listening)return{port:server.address().port,code:token};if(starting)return starting;starting=new Promise((resolve,reject)=>{server=http.createServer(handle);server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.unref();resolve({port:server.address().port,code:token});});});try{return await starting;}finally{starting=null;}}
 async function command(op,args,signal){
  signal?.throwIfAborted();if(!status().connected)throw Error('ยังไม่ได้เชื่อมแท็บ Chrome เปิดส่วนขยายแล้วเชื่อมแท็บที่ต้องการ');
  if(!['read','type','click','select','check','verify','expect'].includes(op))throw Error('Unsupported browser command');
  const id=randomBytes(12).toString('hex');let timer,aborted;
  try{return await new Promise((resolve,reject)=>{aborted=()=>reject(signal.reason);signal?.addEventListener('abort',aborted,{once:true});timer=setTimeout(()=>reject(Error('แท็บ Chrome ไม่ตอบกลับ ยังไม่ยืนยันผล ห้ามส่งซ้ำโดยไม่ตรวจหน้าเว็บ')),timeoutMs);pending.set(id,{resolve,reject});queue.push({id,op,args});});}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',aborted);pending.delete(id);const i=queue.findIndex(c=>c.id===id);if(i>=0)queue.splice(i,1);}
 }
 function browser(){
  const lease=connection?.session;const checkLease=()=>{if(connection?.session!==lease)throw Error('เปลี่ยนแท็บที่เชื่อมต่อแล้ว กรุณาเริ่มงานใหม่');};
  let last=null;
  const remember=data=>{if(!data||!Array.isArray(data.elements)||typeof data.generation!=='string')throw Error('ข้อมูลแท็บไม่สมบูรณ์ กรุณาเชื่อมต่อใหม่');last=data;return data;};
  const snapshot=async signal=>{checkLease();return remember(await command('read',{},signal));};
  return{connected:true,description:()=>status(),snapshot,
   navigate:async(url,signal)=>{if(browserUrl(url)!==connection?.url)throw Error('ส่วนขยายควบคุมเฉพาะแท็บที่เลือก ใช้ browser.read หรือเลือกเชื่อมแท็บใหม่');return snapshot(signal);},
   target:a=>{checkLease();if(!last||a.generation!==last.generation)throw Error('อ่านหน้าเว็บใหม่ก่อน');const e=last.elements.find(e=>e.id===a.id);if(!e)throw Error('ไม่พบช่องหรือปุ่ม');return{url:last.url,...e};},
   interact:async(a,signal)=>{checkLease();const before=last?{url:last.url,text:last.text}:null;const r=await command(a.kind,{id:a.id,generation:a.generation,value:a.value,checked:a.checked},signal);remember(r.observed);return{...r,before:r.before??before};},
   verifyField:async(a,signal)=>{checkLease();const r=await command('verify',{id:a.id,generation:a.generation,value:a.value,checked:a.checked},signal);remember(r.observed);return r;},
   expectText:async(a,signal)=>{checkLease();const r=await command('expect',{contains:a.contains,selector:a.selector,timeoutMs:a.timeoutMs},signal);remember(r.observed);return r;},
   close:async()=>{cancel('จบงานแล้ว');},
  };
 }
 return{start,status,browser,close:async()=>{cancel('ปิดการเชื่อมต่อแล้ว');connection=null;if(server?.listening)await new Promise(r=>server.close(r));}};
}
module.exports={createChromeBroker};
