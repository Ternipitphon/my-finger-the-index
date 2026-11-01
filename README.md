# Caprii 0.5.6 — Windows installer

[ดาวน์โหลด ZIP ตัวติดตั้ง 0.5.6](https://github.com/Ternipitphon/my-finger-the-index/archive/refs/heads/caprii-0.5.6-download.zip)

แตก ZIP ทั้งหมด → ปิด Caprii เก่า → เปิด **INSTALL-CAPRII.cmd** → ติดตั้ง → เปิด **Caprii Agent** จาก Desktop/Start Menu

คลิกขวาตัวละคร → **เปิดเว็บทดสอบ Caprii** เพื่อเปิด Test Lab ในเครื่องโดยไม่ต้องติดตั้ง Node.js เพิ่ม ชุดนี้เป็นตัวติดตั้งจริง ไม่ใช่แพตช์หรือซอร์สอย่างเดียว

รายละเอียดและ checksum: [downloads/Caprii-0.5.6](downloads/Caprii-0.5.6/README-TH.md) · ขั้นตอนออกเวอร์ชัน: [RELEASE-WORKFLOW-TH.md](RELEASE-WORKFLOW-TH.md)

ผ่าน 132 app tests, 3 lab checks, 7 เคส browser และ packaged-resource checks ตัวติดตั้งยังไม่มีลายเซ็น และยังไม่ได้ทดสอบติดตั้งบน Windows จริง ไม่มีการ deploy เว็บไซต์

---

# Caprii Desktop AI

## ดาวน์โหลด Caprii 0.5.5 + Agent Reach

[ดาวน์โหลด ZIP ทั้งหมด](https://github.com/Ternipitphon/my-finger-the-index/archive/refs/heads/main.zip) แล้วแตกไฟล์ เปิด `downloads/Caprii-0.5.5/INSTALL-CAPRII.cmd` ปิด Caprii เดิมก่อนติดตั้ง

รวม Agent Reach 1.6.0 แบบ public-only พร้อม Python/dependencies ใน Windows installer: วางลิงก์เพื่ออ่านเว็บ/ข้อมูลและคำบรรยาย YouTube หรือค้นข้อมูลจริงผ่าน Jina/Exa/yt-dlp ไม่คัดลอกบัญชี ไม่ถอดเสียงแบบมีค่าใช้จ่าย ไม่อ้างว่าได้ดูคลิปจาก metadata และไม่ข้ามการปิดกั้นเครือข่าย

อ่าน [วิธีติดตั้ง](downloads/Caprii-0.5.5/README.md), [คู่มือไทย](downloads/Caprii-0.5.5/GUIDE-TH.md) และ [ผลทดสอบ](downloads/Caprii-0.5.5/VALIDATION.md)

ซอร์สอยู่ใน [caprii/](caprii/) ผ่าน 124 tests + 4 parser/bridge tests และตรวจเส้นทาง URL ผ่าน real Electron UI แล้ว Windows runtime และ live web access ยังต้องตรวจบน Windows จริง คง UIA/DOM/เปิดไฟล์/ซ่อนหน้าติดตามงาน ไม่เพิ่ม Memory ข้ามงาน

## เว็บทดสอบคณิตคิดเร็ว 10 ข้อ

[ดาวน์โหลด math-quiz.zip](https://github.com/Ternipitphon/my-finger-the-index/raw/refs/heads/main/math-quiz.zip) แล้วแตกไฟล์ เปิด `math-quiz/OPEN-QUIZ.cmd` จากโฟลเดอร์ที่แตกแล้ว

อ่าน [วิธีเปิดเว็บและคำสั่งทดสอบ Caprii](math-quiz/README-TH.md)


ซอร์สแอปปัจจุบันอยู่ใน `caprii/` เริ่มพัฒนาด้วย `npm ci` แล้ว `npm test` ในโฟลเดอร์นี้ ส่วน Electron GUI ต้องมี graphical display
