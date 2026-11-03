const status=document.getElementById('status');
document.getElementById('connect').onclick=async()=>{status.textContent='กำลังเชื่อม…';try{const r=await chrome.runtime.sendMessage({type:'connect',code:document.getElementById('code').value.trim()});status.textContent=r.error||'เชื่อมแล้ว กลับไปสั่ง Caprii ได้เลย';}catch{status.textContent='เปิด Caprii และตรวจรหัสอีกครั้ง';}};
document.getElementById('disconnect').onclick=async()=>{await chrome.runtime.sendMessage({type:'disconnect'});document.getElementById('code').value='';status.textContent='ตัดการเชื่อมต่อแล้ว';};

chrome.runtime.sendMessage({type:'status'}).then(r=>{document.getElementById('code').value=r.code||'';if(r.connected)status.textContent='แท็บที่เลือก: '+(r.title||r.url)+' — กดอนุญาตอีกครั้งเพื่อเชื่อมแท็บปัจจุบัน';else if(r.error)status.textContent=r.error;else if(r.code)status.textContent='มีรหัสจากรอบนี้แล้ว กดอนุญาตเพื่อเชื่อมแท็บนี้อีกครั้ง หากปิดเปิด Caprii ให้ใช้รหัสใหม่';}).catch(()=>{});
