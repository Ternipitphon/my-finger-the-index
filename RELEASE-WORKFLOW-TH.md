# วิธีออกรุ่น Caprii ตามชุดติดตั้งเดิม

ผู้ใช้ต้องการรุ่นใหม่ที่ติดตั้งได้ ไม่ใช่ส่ง source-update.patch หรือ source ZIP แล้วเรียกว่าโปรแกรมพร้อมใช้

1. ตรวจ HEAD ล่าสุดและหมายเลขรุ่น อย่าใช้โค้ดจากโฟลเดอร์ downloads เก่าเป็นฐาน
2. เพิ่มรุ่นพร้อมกันใน `caprii/package.json`, `package-lock.json` (ทั้ง top-level และ packages root), ส่วนขยาย `browser-extension/manifest.json`, คู่มือ และ Test Lab
3. เพิ่ม/ปรับ regression cases ตามความสามารถในรุ่นนั้น ตาม `caprii/AGENTS.md`
4. รัน app tests, Test Lab tests และ browser smoke ตามการเปลี่ยนแปลง รายงานข้อจำกัด Windows จริงตามหลักฐาน
5. เตรียม Windows runtime ตาม lock ที่ตรวจ hash: `cd caprii` แล้ว `python3 scripts/prepare-agent-reach.py`
6. สร้าง Windows x64: `npm run dist:cloud` ใช้การตั้งค่า proxy/CA ของ environment ตามเดิม ตัวติดตั้งอยู่ที่ `caprii/dist/Caprii-Agent-Setup-<version>.exe`
7. ตรวจ ASAR/package version, Windows x64 PE, runtime, ฟอนต์, ส่วนขยาย และ Test Lab ที่เปิดจาก ASAR ด้วย `scripts/verify-release.cjs` ปรับรุ่นใน script เมื่อทำรุ่นถัดไป
8. ตรวจความสมบูรณ์ NSIS ด้วย 7-Zip จากนั้นแบ่ง installer เป็น part ขนาดไม่เกิน 60 MiB คำนวณ SHA256 ของแต่ละ part และไฟล์รวม ตรวจการรวมกลับให้ตรงกัน ใช้ `release-tools/package-caprii-0.5.6.py` เป็นสูตรอ้างอิงสำหรับรุ่นนี้ อย่าใช้ hash/ชื่อรุ่นเก่าในรุ่นใหม่
9. เก็บ `INSTALL-CAPRII.cmd`, part ทุกส่วน, download manifest, README และคู่มือไว้ด้วยกัน สคริปต์ต้องตรวจ hash ก่อนเปิด exe และรองรับ path ที่มีช่องว่าง
10. อัปโหลดซอร์สพร้อมชุดรุ่นใหม่ไป branch รุ่นนั้น และสร้าง branch ดาวน์โหลดที่มีเฉพาะไฟล์ติดตั้งรุ่นเดียว ไม่ลากประวัติ downloads ทุกรุ่นมารวมให้ผู้ใช้สับสน
11. ให้ผู้ใช้ **ลิงก์ ZIP เดียว** พร้อมบอกว่าแตก ZIP แล้วเปิด `INSTALL-CAPRII.cmd` ไม่เรียกแพตช์/ซอร์สว่า installer ไม่อ้างว่าทดลอง Windows จริงจากการ cross-build บน Linux และไม่ deploy เว็บไซต์โดยไม่ได้รับอนุญาต

รุ่น 0.5.6 สร้างจาก source commit `fe97cbcc3623a66b5e3041c7d7d93b95cf7aff9f` ใช้ manifest ใน `downloads/Caprii-0.5.6/download-manifest.json` ตรวจตัวติดตั้งจริง
