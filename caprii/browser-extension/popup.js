const status=document.getElementById('status');
document.getElementById('connect').onclick=async()=>{status.textContent='กำลังเชื่อม…';try{const r=await chrome.runtime.sendMessage({type:'connect',code:document.getElementById('code').value.trim()});status.textContent=r.error||'เชื่อมแล้ว กลับไปสั่ง Caprii ได้เลย';}catch{status.textContent='เปิด Caprii และตรวจรหัสอีกครั้ง';}};
document.getElementById('disconnect').onclick=async()=>{await chrome.runtime.sendMessage({type:'disconnect'});document.getElementById('code').value='';status.textContent='ตัดการเชื่อมต่อแล้ว';};
