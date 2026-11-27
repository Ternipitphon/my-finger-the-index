'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
// The encryption functions are supplied by Electron safeStorage after app.whenReady.
function createPairingStore({file,seal,open}){
 let cached;
 function write(record){const target=file();fs.mkdirSync(path.dirname(target),{recursive:true});const temp=target+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(record),{mode:0o600});fs.renameSync(temp,target);}finally{try{fs.unlinkSync(temp);}catch{}}cached=record;}
 function read(){if(cached)return cached;try{const r=JSON.parse(fs.readFileSync(file(),'utf8'));if(r.schema!==1||typeof r.key!=='string'||!r.key.startsWith('enc:')||typeof r.remembered!=='boolean')throw Error('invalid pairing file');cached=r;return r;}catch(e){if(e.code==='ENOENT')return null;throw Error('อ่านข้อมูลจับคู่ Chrome ไม่ได้ ใช้เมนูลืมการจับคู่แล้วเชื่อมครั้งแรกใหม่');}}
 function get({rotate=false}={}){
  let r=rotate?null:read();if(!r){const token=randomBytes(32).toString('base64url');r={schema:1,key:seal(token),remembered:false};if(!r.key.startsWith('enc:'))throw Error('ระบบเข้ารหัสการจับคู่ Chrome ไม่พร้อม');write(r);}
  const token=open(r.key);if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw Error('เปิดกุญแจจับคู่ Chrome ไม่ได้ ใช้เมนูลืมการจับคู่แล้วเชื่อมใหม่');return{token,browserMode:r.remembered};
 }
 function remember(on){const r=read();if(!r)throw Error('ยังไม่มีกุญแจจับคู่ Chrome');if(r.remembered!==on)write({...r,remembered:on});}
 return{get,remember};
}
module.exports={createPairingStore};
