## 1.5.2 / Caprii 0.7.2

เพิ่ม regression ลากโดยปิดแชตและไม่มี DOM mouse events ใน companion fixture รักษา 8 เคส DOM และ media IDs เดิม การลาก native Windows ไม่ถูกนับผ่านในหน้าเว็บ

## 1.5.1 / Caprii 0.7.1

เพิ่มแนวทางตรวจสถานะเชื่อมจริง แยก paired/responsive และทดสอบ HTTP broker + worker emulation + Spotify DOM โดยปิด page timers ไม่เพิ่มคะแนนผ่าน native/Spotify จริง รักษา 8 เคส DOM และ 4 external-media IDs เดิม

## 1.5.0 / Caprii 0.7.0

เพิ่มตัวอย่าง stable IDs สำหรับ YouTube search, Spotify liked/track/playlist แยกจาก 8 เคส DOM เดิม รายงาน externalMedia เป็น not-measured-by-this-page ไม่มีปุ่ม manual pass; เพิ่ม Electron media fixture สำหรับตรวจชื่อเพลง/ศิลปินและเวลาเดิน

## 1.4.1 / Caprii 0.6.3

เพิ่มแนวทางทดสอบ drag lifecycle หลังใช้งานซ้ำ โดยแยกปุ่มเมาส์ Windows จากคะแนน DOM รักษา 8 เคสเดิม ไม่มีคะแนน manual หรือการ publish

## 1.4.0 / Caprii 0.6.2

เพิ่มตัวอย่างเปิด Spotify และโดเมนตามเส้นทาง default browser พร้อมระบุว่าการเปิดหน้าต่างภายนอกไม่ถูกนับผ่านจากคะแนน DOM รักษา 8 เคสเดิม

## 1.3.1 / Caprii 0.6.1

เพิ่ม regression การลากเมื่อ mousemove/pointermove ไม่มาพร้อมกันและ native click-through ระหว่างกดค้าง พร้อมเมนูถาดระบบจับย้าย รักษา 8 เคสเดิม

## 1.3.0 / Caprii 0.6.0

เพิ่มคู่มือทดสอบลากตัวละคร เปิด–ปิดดูจอระหว่างรอคำตอบ และภาษาหลัก English; รักษา 8 เคส DOM เดิม ไม่มีการ publish เว็บ

# Test Lab changelog

## 1.2.1 — Caprii 0.5.9

- Preserve the exact colloquial form prompt as a routing regression and document read-only inspection.
- Add live-model form regression using the actual fixture; require a fresh post-submit check without repeated submission.
- Keep eight observable cases and target 0.5.9.

## 1.2.0 — Caprii 0.5.8

- Document saved short/balanced/detailed response preferences and answer-only observation commands.
- Keep eight stable DOM cases and update target metadata without inventing automatic grading of AI style.

## 1.1.0 — Caprii 0.5.7

- Add an eighth, image-reading scenario with a downloadable PNG, exact code verification, and incorrect-answer regression checks.
- Document the default personality and the distinction between uploaded-image analysis and screen capture.
- Target app/extension 0.5.7; retain all prior cases and JSON evidence reports.

## 1.0.1 — Caprii 0.5.6

- Target the 0.5.6 installer and bundle the lab inside the installed app.
- Open the local lab from the tray menu without a separate Node.js installation; use an available loopback port and stop with Caprii.
- Preserve all seven regression cases and source-only website policy.

## 1.0.0 — Caprii 0.5.5

- Seven stable regression cases covering page reading, mixed form controls, arithmetic, readonly keypad input, delayed acknowledgments, replaced DOM elements, and do-not-submit instructions.
- Observable DOM checks, event evidence, per-case reset, passed/pending filters, and JSON reports with suite/app version identifiers.
- Offline static assets and a dependency-free loopback server. Source only; no website publication.
