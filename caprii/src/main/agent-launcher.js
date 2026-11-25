'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{randomUUID}=require('node:crypto');
const {text}=require('./agent-registry');
const BLOCKED=/(?:^|[\\/])(?:\.git|node_modules|\.ssh|\.aws|\.env(?:\..*)?|credentials[^\\/]*)(?:[\\/]|$)|\.(?:ps1|bat|cmd|vbs|js|msi|exe|com|scr|reg|pem|key|p12)$/i;
function createLauncher({shell,roots,now=Date.now}){
 const entries=new Map();
 async function search(query,signal){
  text(query,'file name',200);entries.clear();const matches=[];let seen=0,limited=false;
  for(const root of roots){
   const queue=[{dir:path.resolve(root),depth:0}];
   while(queue.length&&seen<6000&&matches.length<40){
    signal.throwIfAborted();const {dir,depth}=queue.shift();let files;try{files=await fs.readdir(dir,{withFileTypes:true});}catch{continue;}
    for(const f of files){if(++seen>6000){limited=true;break;}if(f.isSymbolicLink()||BLOCKED.test(f.name))continue;
     const full=path.join(dir,f.name);
     if(f.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())){const stat=await fs.lstat(full).catch(()=>null);if(!stat||stat.isSymbolicLink())continue;const id=randomUUID();entries.set(id,{path:full,size:stat.size,mtime:stat.mtimeMs,at:now(),directory:stat.isDirectory()});matches.push({id,name:f.name,path:full,directory:stat.isDirectory(),shortcut:/\.(lnk|url)$/i.test(f.name)});if(matches.length>=40)break;}
     if(f.isDirectory()&&depth<4)queue.push({dir:full,depth:depth+1});
    }
   }
   limited ||= queue.length>0;if(seen>=6000||matches.length>=40)break;
  }
  return {matches,limited,roots};
 }
 async function resolve(id){const e=entries.get(id);if(!e||now()-e.at>120000)throw Error('ค้นหาไฟล์ใหม่ก่อนเปิด ผลเดิมหมดอายุแล้ว');
  // Recheck every path component; never follow a swapped directory symlink.
  let current=path.parse(e.path).root;for(const part of e.path.slice(current.length).split(path.sep)){current=path.join(current,part);if((await fs.lstat(current)).isSymbolicLink())throw Error('ตำแหน่งไฟล์เปลี่ยนเป็นลิงก์ ค้นหาใหม่ก่อน');}
  const stat=await fs.lstat(e.path);if(stat.size!==e.size||stat.mtimeMs!==e.mtime||stat.isDirectory()!==e.directory)throw Error('ไฟล์เปลี่ยนแล้ว กรุณาค้นหาใหม่');return e;
 }
 return {search,resolve,async open(id,signal){const e=await resolve(id);signal.throwIfAborted();const error=await shell.openPath(e.path);if(error)throw Error(error);return{requested:true,path:e.path,verified:false,note:'ร้องขอเปิดแล้ว ต้องอ่านหน้าต่าง/จอเพื่อตรวจว่าเปิดสำเร็จ'};}};
}
function defaultRoots(app){return [...new Set(['desktop','documents','downloads'].map(k=>app.getPath(k)).concat(process.platform==='win32'?[path.join(process.env.APPDATA||os.homedir(),'Microsoft/Windows/Start Menu/Programs'),path.join(process.env.ProgramData||'C:\\ProgramData','Microsoft/Windows/Start Menu/Programs')]:[]))];}
function registerLauncher(tools,launcher){
 tools.add('launcher.search',{description:{query:'file/folder/app shortcut name, e.g. Limbus',purpose:'Search names in Desktop, Documents, Downloads and Start Menu; no contents, no scripts, bounded depth'},validate:a=>text(a.query,'query',200),run:async(a,c)=>{await c.permission({tool:a.tool,query:a.query,note:'ค้นหาชื่อไฟล์และทางลัดในโฟลเดอร์ผู้ใช้ แล้วส่งผลที่พบให้ AI'});return launcher.search(a.query,c.signal);}});
 tools.add('launcher.open',{description:{id:'ID from launcher.search',purpose:'Open a recently observed document, folder or app shortcut. Never invent paths; shortcuts may launch programs. Verify the resulting window.'},validate:a=>text(a.id,'file ID',40),run:async(a,c)=>{const target=await launcher.resolve(a.id);await c.permission({tool:a.tool,path:target.path,note:'เปิดไฟล์/โฟลเดอร์หรือทางลัดโปรแกรมที่พบ ทางลัดอาจเปิดโปรแกรมหรือ URL'});return launcher.open(a.id,c.signal);}});return tools;
}
module.exports={createLauncher,defaultRoots,registerLauncher};
