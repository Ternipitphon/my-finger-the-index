'use strict';
const { createDesktop } = require('./agent-desktop');

// Opt-in local diagnostics against a window owned by this app. Never sends a screen to AI.
async function desktopSelfTest({ BrowserWindow, screen, desktopCapturer, dialog, signal }) {
  const consent = await dialog.showMessageBox({ type: 'question', message: 'ทดสอบเมาส์และคีย์บอร์ดบนเครื่องนี้?',
    detail: 'จะเปิดหน้าต่างทดสอบของ Caprii แล้วลองพิมพ์ภาษาไทย คลิก ดับเบิลคลิก คลิกขวา และลากเมาส์เฉพาะในหน้าต่างนั้น ไม่ส่งภาพหรือข้อมูลไป AI ปิดหน้าต่างทดสอบเพื่อหยุดได้',
    buttons: ['ยกเลิก', 'เริ่มทดสอบ'], defaultId: 0, cancelId: 0, signal });
  if (consent.response !== 1) return;
  signal.throwIfAborted();
  const win = new BrowserWindow({ width: 680, height: 560, title: 'Caprii Input Diagnostic', backgroundColor: '#f2f6fb', webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  let finished = false;
  const local = new AbortController();
  const combined = AbortSignal.any([signal, local.signal, AbortSignal.timeout(60000)]);
  win.on('closed', () => { if (!finished) local.abort(); });
  const html = `<!doctype html><html lang="th"><meta charset="utf-8"><title>Caprii Input Diagnostic</title><style>body{font:16px system-ui;padding:24px;color:#15243b}input,button{font:inherit;padding:12px;margin:10px 0}#drag{display:inline-block;background:#cde9dc;padding:18px;margin-right:40px}#drop{display:inline-block;border:2px dashed #839ab4;padding:30px}pre{white-space:pre-wrap}</style><h2>ทดสอบเมาส์และคีย์บอร์ด</h2><p>กำลังทดสอบ… อย่าเปลี่ยนไปหน้าต่างอื่นจนกว่าจะจบ</p><input id="field" autofocus><br><button id="click">ปุ่มทดสอบ</button><output id="clicked"></output><br><div id="drag" draggable="true">ลากกล่องนี้</div><div id="drop">มาวางที่นี่</div><pre id="report"></pre><script>window.counts={click:0,double:0,right:0,drop:0};const b=document.getElementById('click');b.onclick=()=>{counts.click++;document.getElementById('clicked').textContent='clicked';};b.ondblclick=()=>counts.double++;b.oncontextmenu=e=>{e.preventDefault();counts.right++;};document.getElementById('drag').ondragstart=e=>e.dataTransfer.setData('text/plain','caprii');document.getElementById('drop').ondragover=e=>e.preventDefault();document.getElementById('drop').ondrop=e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')==='caprii')counts.drop++;};</script></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  win.show();win.focus();
  const desktop = createDesktop({ screen, desktopCapturer });
  const results=[];
  const record=(test,passed,error)=>results.push({test,passed,error});
  try {
    const state=await desktop.state({kind:'state'},combined);
    const bytes=win.getNativeWindowHandle();const handle=String(bytes.length>=8?bytes.readBigUInt64LE():BigInt(bytes.readUInt32LE()));
    if(!state.windows.some(w=>w.handle===handle))throw Error('The diagnostic window was not found in Windows enumeration');
    await desktop.act({kind:'focus',handle},combined);record('โฟกัสหน้าต่าง',true);
    await win.webContents.executeJavaScript('document.getElementById("field").focus()');
    await desktop.act({kind:'type',targetHandle:handle,text:'สวัสดี Caprii 42'},combined);
    if(await win.webContents.executeJavaScript('document.getElementById("field").value')!=='สวัสดี Caprii 42')throw Error('Unicode keyboard injection did not reach the fixture');
    record('พิมพ์ภาษาไทยและเลข',true);
    await desktop.act({kind:'key',targetHandle:handle,key:'ctrl+a'},combined);
    await desktop.act({kind:'type',targetHandle:handle,text:'12345'},combined);
    if(await win.webContents.executeJavaScript('document.getElementById("field").value')!=='12345')throw Error('Ctrl+A/replacement did not reach the fixture');
    record('เลือกข้อความแล้วแทนที่',true);
    const point=async id=>{const r=await win.webContents.executeJavaScript(`(()=>{const r=document.getElementById(${JSON.stringify(id)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);const b=win.getContentBounds();return{x:Math.round(b.x+r.x),y:Math.round(b.y+r.y)};};
    const field=await point('field');
    await desktop.act({kind:'type',targetHandle:handle,...field,replace:true,text:'2*7+9/9'},combined);
    if(await win.webContents.executeJavaScript('document.getElementById("field").value')!=='2*7+9/9')throw Error('Click-and-type did not reach the math field');
    record('คลิกช่องและพิมพ์นิพจน์เลข',true);
    const click=await point('click');
    for(const [kind,key] of [['click','click'],['doubleclick','double'],['rightclick','right']]){
      await desktop.act({kind,targetHandle:handle,...click},combined);
      if(await win.webContents.executeJavaScript(`window.counts.${key}`)<1)throw Error(kind+' did not reach the fixture');
      record({click:'คลิก',doubleclick:'ดับเบิลคลิก',rightclick:'คลิกขวา'}[kind],true);
    }
    const from=await point('drag'),to=await point('drop');
    await desktop.act({kind:'drag',targetHandle:handle,...from,toX:to.x,toY:to.y},combined);
    if(await win.webContents.executeJavaScript('window.counts.drop')<1)throw Error('Drag/drop did not reach the fixture');
    record('ลากและวาง',true);
  } catch(err) { record('ขั้นตอนที่ยังไม่ผ่าน',false,combined.aborted?'ยกเลิกหรือหมดเวลา':err.message); }
  finished=true;
  if(!win.isDestroyed())await win.webContents.executeJavaScript(`document.getElementById('report').textContent=${JSON.stringify(results.map(r=>(r.passed?'ผ่าน: ':'ไม่ผ่าน: ')+r.test+(r.error?' — '+r.error:'')).join('\n'))};document.getElementById('field').disabled=true;document.getElementById('report').scrollIntoView();`);
  return results;
}
module.exports={desktopSelfTest};
