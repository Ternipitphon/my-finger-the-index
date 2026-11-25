'use strict';
// The installed app owns the loopback server; users do not need a separate Node installation.
function createTestLab({openExternal,loadServer=async()=> (await import('../../test-lab/server.mjs')).createLabServer()}){
 let server=null,starting=null,url=null;
 async function start(){
  if(server?.listening)return url;
  if(starting)return starting;
  starting=(async()=>{
   const candidate=await loadServer();
   try{await new Promise((resolve,reject)=>{candidate.once('error',reject);candidate.listen(0,'127.0.0.1',resolve);});}
   catch(error){candidate.close();throw error;}
   candidate.unref();server=candidate;url='http://127.0.0.1:'+candidate.address().port;return url;
  })();
  try{return await starting;}finally{starting=null;}
 }
 return{async open(){const address=await start();await openExternal(address);return address;},async close(){if(starting)await starting.catch(()=>{});const current=server;server=null;url=null;if(current?.listening){current.closeAllConnections?.();await new Promise(resolve=>current.close(resolve));}}};
}
module.exports={createTestLab};
