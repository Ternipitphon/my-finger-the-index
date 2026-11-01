# Caprii Desktop AI

## ดาวน์โหลด Caprii 0.5.2

[ดาวน์โหลด ZIP ทั้งหมด](https://github.com/Ternipitphon/my-finger-the-index/archive/refs/heads/main.zip) แล้วแตกไฟล์ เปิด `downloads/Caprii-0.5.2/INSTALL-CAPRII.cmd` ปิด Caprii ตัวเดิมก่อนติดตั้ง

รุ่นนี้แก้คำสั่ง “ดูจอแล้วหาคำตอบ” ให้ใช้เครื่องคิดเลข ตรวจถ้อยคำก่อนแสดงผล และตัดบริบทเก่าจากภาพใหม่ คงการเชื่อม Chrome การแก้ช่อง read-only และเสียงไทย ไม่เพิ่ม Memory ข้ามงาน

อ่าน [วิธีติดตั้ง](downloads/Caprii-0.5.2/README.md), [คู่มือไทย](downloads/Caprii-0.5.2/GUIDE-TH.md) และ [วิธีเชื่อม Chrome](downloads/Caprii-0.5.2/CHROME-TH.md)

ซอร์สปัจจุบันอยู่ใน [caprii/](caprii/) ผ่าน 111 การทดสอบและการตรวจฟอร์มจริงบน Electron/Linux การติดตั้งและใช้ส่วนขยายใน Chrome/Windows ยังต้องตรวจบนเครื่องจริง

## เว็บทดสอบคณิตคิดเร็ว 10 ข้อ

[ดาวน์โหลด math-quiz.zip](https://github.com/Ternipitphon/my-finger-the-index/raw/refs/heads/main/math-quiz.zip) แล้วแตกไฟล์ เปิด `math-quiz/OPEN-QUIZ.cmd` จากโฟลเดอร์ที่แตกแล้ว

อ่าน [วิธีเปิดเว็บและคำสั่งทดสอบ Caprii](math-quiz/README-TH.md)


ซอร์สแอปปัจจุบันอยู่ใน `caprii/` เริ่มพัฒนาด้วย `npm ci` แล้ว `npm test` ในโฟลเดอร์นี้ ส่วน Electron GUI ต้องมี graphical display
