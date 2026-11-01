# Caprii Desktop AI

## ดาวน์โหลด Caprii 0.5.4

[ดาวน์โหลด ZIP ทั้งหมด](https://github.com/Ternipitphon/my-finger-the-index/archive/refs/heads/main.zip) แล้วแตกไฟล์ เปิด `downloads/Caprii-0.5.4/INSTALL-CAPRII.cmd` ปิด Caprii ตัวเดิมก่อนติดตั้ง

รุ่นนี้เพิ่ม Windows UI Automation, ค้นหาและเปิดไฟล์/ทางลัดโปรแกรม, เติมรหัสเชื่อม Chrome รอบเดิม และซ่อนหน้าติดตามงานเป็นค่าเริ่มต้น ทดสอบส่วนขยายบน Google Chrome จริง/Linux แล้ว ส่วน Windows และ Limbus ยังต้องตรวจบนเครื่องจริง ไม่เพิ่ม Memory ข้ามงาน

อ่าน [วิธีติดตั้ง](downloads/Caprii-0.5.4/README.md), [คู่มือไทย](downloads/Caprii-0.5.4/GUIDE-TH.md) และ [วิธีเชื่อม Chrome](downloads/Caprii-0.5.4/CHROME-TH.md)

ซอร์สปัจจุบันอยู่ใน [caprii/](caprii/) ผ่าน 119 การทดสอบและการตรวจฟอร์มจริงบน Electron/Linux การติดตั้งและใช้ส่วนขยายใน Chrome/Windows ยังต้องตรวจบนเครื่องจริง

## เว็บทดสอบคณิตคิดเร็ว 10 ข้อ

[ดาวน์โหลด math-quiz.zip](https://github.com/Ternipitphon/my-finger-the-index/raw/refs/heads/main/math-quiz.zip) แล้วแตกไฟล์ เปิด `math-quiz/OPEN-QUIZ.cmd` จากโฟลเดอร์ที่แตกแล้ว

อ่าน [วิธีเปิดเว็บและคำสั่งทดสอบ Caprii](math-quiz/README-TH.md)


ซอร์สแอปปัจจุบันอยู่ใน `caprii/` เริ่มพัฒนาด้วย `npm ci` แล้ว `npm test` ในโฟลเดอร์นี้ ส่วน Electron GUI ต้องมี graphical display
