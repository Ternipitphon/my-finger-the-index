import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export function createLabServer(){
 const directory=fileURLToPath(new URL('./dist/',import.meta.url));
 const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/suite.js':'suite.js'};
 const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
 return http.createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  let name;try{name=files[new URL(req.url,'http://127.0.0.1').pathname];}catch{}
  if(!name){res.writeHead(404);res.end('Not found');return;}
  try{const body=await readFile(path.join(directory,name));res.writeHead(200,{'Content-Type':mime[path.extname(name)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(500);res.end('Unable to load Test Lab');}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.CAPRII_LAB_PORT||5173);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('CAPRII_LAB_PORT must be 1..65535');
 const server=createLabServer();server.on('error',err=>{console.error('เปิด Test Lab ไม่สำเร็จ: '+err.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log('Caprii Test Lab: http://127.0.0.1:'+port+'\nเปิด URL นี้ใน Chrome แล้วเชื่อมแท็บกับ Caprii · กด Ctrl+C เพื่อหยุด'));
}
