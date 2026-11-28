'use strict';
let lang=new URL(location.href).searchParams.get('lang')==='en'?'en':'th';
const ui=(value,slots=[])=>globalThis.CAPRII_UI_TEXT.text(value,lang,slots);
const uiMessage=value=>globalThis.CAPRII_UI_TEXT.message(value,lang);
function localize(){document.documentElement.lang=lang;for(const node of document.querySelectorAll('[data-ui]'))node.textContent=ui(node.dataset.ui);}
localize();
const byId = id => document.getElementById(id);
const names = { 'browser.expect_value':ui('ตรวจค่าที่กรอกจริง'), 'math.evaluate': ui('คำนวณเลขจริง'), 'math.batch': ui('ตรวจคำตอบหลายข้อ'), 'math.solve': ui('ค้นหานิพจน์ที่ถูกต้อง'), 'math.verify': ui('ตรวจคำตอบเลข'), 'desktop.open_url': ui('เปิดเว็บในเบราว์เซอร์'), plan: ui('วางแผน'), list: ui('ดูรายการไฟล์'), search: ui('ค้นหาไฟล์'), move: ui('ย้ายไฟล์'), read: ui('อ่านไฟล์'), write: ui('แก้ไฟล์'), check: ui('รันตรวจสอบ'), 'browser.open': ui('เปิดเว็บ'), 'browser.read': ui('อ่านหน้าเว็บ'), 'browser.type': ui('กรอกข้อมูล'), 'browser.click': ui('คลิกในเว็บ'), 'browser.expect': ui('ตรวจผลเว็บ'), 'browser.look': ui('ดูภาพเว็บ'), 'desktop.windows': ui('ดูหน้าต่าง'), 'desktop.look': ui('ดูหน้าจอ'), 'desktop.input': ui('ควบคุมหน้าจอ'), 'desktop.open_app': ui('เปิดโปรแกรม'), 'desktop.expect': ui('ตรวจหน้าต่าง') };
function list(id, items) { const parent = byId(id); parent.replaceChildren(); for (const text of items) { const li = document.createElement('li'); li.textContent = text; parent.append(li); } }
function render(state) {
  if (!state) return;
  if(['th','en'].includes(state.lang)&&state.lang!==lang){lang=state.lang;localize();}
  byId('goal').textContent = state.goal;
  byId('status').textContent = ({ running: ui('กำลังทำงาน — ตรวจคำขออนุญาตก่อนยืนยัน'), done: ui('จบการทำงาน — ดูหลักฐานด้านล่าง'), partial: ui('งานยังไม่ครบหรือยังตรวจยืนยันไม่ได้'), stopped: ui('หยุดแล้ว'), failed: ui('พบข้อผิดพลาด') })[state.state] || state.state;
  byId('stop').disabled = state.state !== 'running';
  byId('export').disabled = state.state === 'running';
  list('plan', state.plan || []);
  const events = new Map();
  for (const event of state.events || []) events.set(`${event.step}:${event.tool}`, event);
  list('events', [...events.values()].map(e => ui("ขั้นตอน {0}: {1}{2}{3} — {4}{5}",[e.step,names[e.tool] || e.tool,e.path ? ' · ' + e.path : '',e.action ? ' · ' + ({move:'เลื่อนเมาส์',click:'คลิก',doubleclick:'ดับเบิลคลิก',rightclick:'คลิกขวา',drag:'ลาก',type:'พิมพ์',key:'กดปุ่ม',focus:'โฟกัสหน้าต่าง',scroll:'เลื่อนจอ'}[e.action] || e.action) : '',({ done: 'ดำเนินการแล้ว', failed: 'ไม่ผ่าน', running: 'กำลังทำ', recovering:'กำลังตรวจและแก้', recovered:'แก้แล้วและตรวจผ่าน', incomplete:'ยังไม่ครบ' })[e.status] || e.status,e.error ? ' · ' + e.error : ''])));
  byId('summary').textContent = state.summary || '';
  byId('checks').textContent = (state.checks || []).map(c => `${c.tool}${c.script ? ': ' + c.script : ''} — ${c.passed ? ui('ผ่าน') : ui('ไม่ผ่าน')}${c.exitCode != null ? ' (exit ' + c.exitCode + ')' : ''}${c.stdout ? '\n' + c.stdout : ''}${c.stderr ? '\n' + c.stderr : ''}`).join('\n');
}
byId('stop').addEventListener('click', () => { window.agentTask.stop(); byId('stop').disabled = true; byId('status').textContent = ui('กำลังหยุด…'); });
window.agentTask.onUpdate(render);
window.agentTask.state().then(render);

byId('export').addEventListener('click', async () => { try { const result = await window.agentTask.exportReport(); byId('export-status').textContent = result.ok ? ui(' บันทึกแล้ว') : ui(' ยกเลิกแล้ว'); } catch { byId('export-status').textContent = ui(' บันทึกไม่สำเร็จ'); } });
