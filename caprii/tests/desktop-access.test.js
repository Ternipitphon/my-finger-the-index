'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createLauncher}=require('../src/main/agent-launcher'),{createUIAutomation}=require('../src/main/agent-uia');
const signal=()=>AbortSignal.timeout(5000);
test('launcher finds real files and shortcuts, excludes scripts/secrets, and rechecks changed paths before opening',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'caprii-launcher-'));try{
  for(const name of ['Limbus Company.lnk','notes.txt','secret.key','run.ps1'])await fs.writeFile(path.join(root,name),'fixture');
  let opened=[];let now=100;const l=createLauncher({roots:[root],shell:{openPath:async p=>{opened.push(p);return'';}},now:()=>now});
  const found=await l.search('Limbus',signal());assert.equal(found.matches.length,1);assert.equal(found.matches[0].shortcut,true);
  const r=await l.open(found.matches[0].id,signal());assert.equal(r.verified,false);assert.deepEqual(opened,[path.join(root,'Limbus Company.lnk')]);
  now+=120001;await assert.rejects(l.open(found.matches[0].id,signal()),/หมดอายุ/);
  const all=await l.search('.',signal());assert.deepEqual(all.matches.map(x=>x.name).sort(),['Limbus Company.lnk','notes.txt']);
  const file=all.matches.find(x=>x.name==='notes.txt');await fs.writeFile(file.path,'changed content');await assert.rejects(l.open(file.id,signal()),/เปลี่ยน/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('launcher rejects symlink replacement and never opens an invented result ID',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'caprii-launcher-'));try{const dir=path.join(root,'folder');await fs.mkdir(dir);await fs.writeFile(path.join(dir,'notes.txt'),'fixture');const l=createLauncher({roots:[root],shell:{openPath:async()=>{throw Error('must not open');}}});const {matches}=await l.search('notes',signal());await fs.rename(dir,dir+'-old');await fs.symlink(dir+'-old',dir);await assert.rejects(l.open(matches[0].id,signal()),/ลิงก์/);await assert.rejects(l.open('invented',signal()));}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('UI Automation passes only guarded JSON, checks process identity, invalidates used/stale controls',async()=>{
 let now=0,w={handle:'123',processId:'44',processStart:'55',title:'Fixture'};const calls=[];
 const uia=createUIAutomation({platform:'win32',now:()=>now,desktop:{state:async()=>({windows:[w]})},run:async(file,args,opts)=>{calls.push(JSON.parse(opts.input));assert.equal(file,'powershell.exe');assert.ok(!args.includes('-ExecutionPolicy'));return{passed:true,stdout:JSON.stringify(calls.at(-1).kind==='read'?{elements:[{id:0,name:'Answer',runtime:'1,2',controlType:'Edit'}]}:{inputDelivered:true,passed:true,value:'hello'})};}});
 let snap=await uia.read('123',signal());assert.equal(snap.elements[0].name,'Answer');const a={id:0,generation:snap.generation,kind:'type',value:'hello'};
 const r=await uia.act(a,signal());assert.equal(r.passed,true);assert.equal(calls.at(-1).element.runtime,'1,2');assert.equal(calls.at(-1).window.processStart,'55');assert.throws(()=>uia.target(a),/อ่าน/);
 snap=await uia.read('123',signal());w={...w,processStart:'66'};await assert.rejects(uia.act({...a,generation:snap.generation},signal()),/หน้าต่างเปลี่ยน/);
 snap=await uia.read('123',signal());now=31000;assert.throws(()=>uia.target({...a,generation:snap.generation}),/หมดอายุ/);
});
test('UI Automation task requires actual type and a new post-submit acknowledgment',async()=>{
 const {ToolRegistry}=require('../src/main/agent-registry'),{registerUIAutomation}=require('../src/main/agent-uia'),{runProjectAgent}=require('../src/main/project-agent');
 let value='',sent=false,generation='g';const uia={target:()=>({name:'Answer'}),read:async()=>({generation,elements:[{id:0,name:'Answer'},{id:1,name:sent?'บันทึกแล้ว':'ส่ง'}]}),act:async a=>{if(a.kind==='type')value=a.value;if(a.kind==='invoke')sent=true;return{inputDelivered:a.kind!=='verify',windowHandle:'123',before:'Answer\nส่ง',passed:a.kind==='verify'&&value===a.value};}};
 const tools=registerUIAutomation(new ToolRegistry(),uia);const actions=[{tool:'uia.read',handle:'123'},{tool:'uia.type',id:0,generation,value:'hello'},{tool:'uia.read',handle:'123'},{tool:'uia.verify',id:0,generation,value:'hello'},{tool:'uia.read',handle:'123'},{tool:'uia.invoke',id:1,generation,intent:'submit'},{tool:'uia.expect',handle:'123',contains:'บันทึกแล้ว'},{tool:'finish',summary:'กรอกและตรวจผลแล้ว'}];let i=0;
 const r=await runProjectAgent({root:os.tmpdir(),goal:'พิมพ์ hello แล้วกดส่ง',allowProjectFiles:false,tools,signal:signal(),approve:async()=>true,ask:async()=>JSON.stringify(actions[i++])});assert.equal(r.verified,true);assert.equal(value,'hello');assert.equal(sent,true);
});
test('UI Automation respects no-input and no-submit instructions before permission or native calls',async()=>{
 const {ToolRegistry}=require('../src/main/agent-registry'),{registerUIAutomation}=require('../src/main/agent-uia');let calls=0;const tools=registerUIAutomation(new ToolRegistry(),{target:()=>({name:'ส่ง'}),act:async()=>{calls++;}});
 const c={signal:signal(),intentRequirements:{noInput:true,noSubmit:true},permission:async()=>{calls++;}};
 await assert.rejects(tools.execute({tool:'uia.type',id:0,generation:'g',value:'hello'},c),/ไม่ให้กรอก/);
 await assert.rejects(tools.execute({tool:'uia.invoke',id:0,generation:'g',intent:'submit'},c),/ไม่ให้กดส่ง/);assert.equal(calls,0);
});
