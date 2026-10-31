'use strict';
const byId = id => document.getElementById(id);
const names = { 'math.evaluate': 'คำนวณเลขจริง', 'math.batch': 'ตรวจคำตอบหลายข้อ', 'math.solve': 'ค้นหานิพจน์ที่ถูกต้อง', 'math.verify': 'ตรวจคำตอบเลข', 'desktop.open_url': 'เปิดเว็บในเบราว์เซอร์', plan: 'วางแผน', list: 'ดูรายการไฟล์', search: 'ค้นหาไฟล์', move: 'ย้ายไฟล์', read: 'อ่านไฟล์', write: 'แก้ไฟล์', check: 'รันตรวจสอบ', 'browser.open': 'เปิดเว็บ', 'browser.read': 'อ่านหน้าเว็บ', 'browser.type': 'กรอกข้อมูล', 'browser.click': 'คลิกในเว็บ', 'browser.expect': 'ตรวจผลเว็บ', 'browser.look': 'ดูภาพเว็บ', 'desktop.windows': 'ดูหน้าต่าง', 'desktop.look': 'ดูหน้าจอ', 'desktop.input': 'ควบคุมหน้าจอ', 'desktop.open_app': 'เปิดโปรแกรม', 'desktop.expect': 'ตรวจหน้าต่าง' };
function list(id, items) { const parent = byId(id); parent.replaceChildren(); for (const text of items) { const li = document.createElement('li'); li.textContent = text; parent.append(li); } }
function render(state) {
  if (!state) return;
  byId('goal').textContent = state.goal;
  byId('status').textContent = ({ running: 'กำลังทำงาน — ตรวจคำขออนุญาตก่อนยืนยัน', done: 'จบการทำงาน — ดูหลักฐานด้านล่าง', partial: 'งานยังไม่ครบหรือยังตรวจยืนยันไม่ได้', stopped: 'หยุดแล้ว', failed: 'พบข้อผิดพลาด' })[state.state] || state.state;
  byId('stop').disabled = state.state !== 'running';
  byId('export').disabled = state.state === 'running';
  list('plan', state.plan || []);
  const events = new Map();
  for (const event of state.events || []) events.set(`${event.step}:${event.tool}`, event);
  list('events', [...events.values()].map(e => `ขั้นตอน ${e.step}: ${names[e.tool] || e.tool}${e.path ? ' · ' + e.path : ''}${e.action ? ' · ' + ({move:'เลื่อนเมาส์',click:'คลิก',doubleclick:'ดับเบิลคลิก',rightclick:'คลิกขวา',drag:'ลาก',type:'พิมพ์',key:'กดปุ่ม',focus:'โฟกัสหน้าต่าง',scroll:'เลื่อนจอ'}[e.action] || e.action) : ''} — ${({ done: 'ดำเนินการแล้ว', failed: 'ไม่ผ่าน', running: 'กำลังทำ' })[e.status] || e.status}${e.error ? ' · ' + e.error : ''}`));
  byId('summary').textContent = state.summary || '';
  byId('checks').textContent = (state.checks || []).map(c => `${c.tool}${c.script ? ': ' + c.script : ''} — ${c.passed ? 'ผ่าน' : 'ไม่ผ่าน'}${c.exitCode != null ? ' (exit ' + c.exitCode + ')' : ''}${c.stdout ? '\n' + c.stdout : ''}${c.stderr ? '\n' + c.stderr : ''}`).join('\n');
}
byId('stop').addEventListener('click', () => { window.agentTask.stop(); byId('stop').disabled = true; byId('status').textContent = 'กำลังหยุด…'; });
window.agentTask.onUpdate(render);
window.agentTask.state().then(render);

byId('export').addEventListener('click', async () => { try { const result = await window.agentTask.exportReport(); byId('export-status').textContent = result.ok ? ' บันทึกแล้ว' : ' ยกเลิกแล้ว'; } catch { byId('export-status').textContent = ' บันทึกไม่สำเร็จ'; } });
