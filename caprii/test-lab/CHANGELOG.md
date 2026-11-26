# Caprii 0.8.8 / Test Lab 1.16.0 — แก้การเรียบเรียงคำตอบกวนให้สุภาพ

หากคำตอบมีคำที่ระบบกันไว้ ขั้นเรียบเรียงใหม่ใช้บริบทแยกที่ไม่มีบุคลิกหรือประวัติเดิมทับ ไม่เรียกเครื่องมือและไม่ทำงานซ้ำ ยังคงมุกแซวสุภาพได้ โดยรักษาข้อมูลเดิม ตรวจค่าตัวเลข URL และโค้ดในคำตอบที่แก้ถ้อยคำ หากคำตอบใหม่ยังไม่สุภาพหรือเปลี่ยนข้อมูลสำคัญจะไม่แสดง ไม่ปิดตัวกรองคำดูถูก และไม่เพิ่มจำนวนครั้งที่เรียก AI จากเดิม

# Caprii 0.8.7 / Test Lab 1.15.0 — เมนูคลิกขวาเป็นระเบียบ

เมนูหลักเหลือคำสั่งใช้บ่อย คุย / ดูจอ / ย้ายตัวละคร / ซ่อนหรือแสดง แล้วแยกเป็น นิสัยและเสียง, Chrome และเพลง, AI และงาน, ตัวละครและหน้าจอ, ตั้งค่าและช่วยเหลือ เมนูนิสัยอยู่ที่ นิสัยและเสียง → นิสัย การเชื่อม Chrome อยู่ที่ Chrome และเพลง เครื่องมือทดสอบย้ายไปตั้งค่าและช่วยเหลือ → ทดสอบและแก้ปัญหา รายชื่อผู้ให้บริการกับรุ่นโมเดลแยกย่อย ไม่ลบคำสั่งหรือเปลี่ยนค่าที่เลือกไว้ เมนูยังใช้ระบบมาตรฐาน Windows และทางลัดเดิม

# Caprii 0.8.6 / Test Lab 1.14.0 — แยกนิสัยกวนกับเป็นห่วง

คลิกขวา → นิสัย มี กวน ๆ / เป็นห่วง / ปกติ กวน ๆ เน้นแซวสถานการณ์หรือสิ่งที่เห็นจริงแบบเป็นมิตร ไม่แทรกคำห่วงหรือเตือนให้พักเพียงเพราะเห็นเกมหรือหลายแท็บ เป็นห่วงเน้นอบอุ่น ใส่ใจและถามไถ่พอดี ไม่สรุปอารมณ์หรือสุขภาพจากภาพอย่างเดียว ทุกโหมดยังเป็น Caprii ตอบข้อมูลจริง เคารพข้อห้าม สิทธิ์ และรูปแบบเครื่องมือเดิม นิสัยเปลี่ยนน้ำเสียง ไม่เปลี่ยนข้อเท็จจริง

ใช้กับแชต ดูจอ และภาพแนบ แยกข้อความอารมณ์เก่าไม่ให้ทับนิสัยที่เลือก ค่ากวน/ปกติเดิมยังอยู่ ค่าเริ่มต้นยังกวน ๆ โหมดเป็นห่วงต้องเลือกเองและจำค่าเมื่อเปิดใหม่ ไม่เปิดดูจอหรือไมค์เพิ่มจากการเลือกนิสัย

# Caprii 0.8.5 / Test Lab 1.13.0 — AI เลือกเจตนาทุกข้อความ

ในโหมดแชต Gemini และผู้ให้บริการ Chat API ข้อความทุกข้อความผ่าน AI ตีความก่อน ไม่ใช้การมีคำว่าเปิด/เพลง/เล่นเป็นตัวเลือกทางทำงาน AI เลือกคุย เล่นเพลง เปิดเว็บ งานบนคอม/แท็บ หรือถามเพิ่มจากประโยคและบริบทหนึ่งข้อความก่อนหน้า หลัง route chat หรือ clarify ไม่ย้อนใช้ตัวจับคำหรือแท็กคำสั่งเก่า คุยทั่วไปยังใช้บุคลิกและภาษาที่เลือกไว้ ระบบตีความเป็นคำขอ AI เพิ่มหนึ่งครั้ง จำกัดเวลา 20 วินาที ถ้าไม่ตอบ/ไม่ชัดจะไม่สั่งงานเดา

เครื่องมือยังมีขอบเขตและตรวจรูปแบบคำสั่ง เป้าหมายเว็บใช้ปลายทางที่รู้จักหรือ URL ที่ผู้ใช้ระบุ ไม่แต่งโดเมน งานยังขอสิทธิ์และตรวจผลจากเครื่องมือจริง ไม่จับจอในขั้นตีความ โหมด Claude Code แยกใช้ระบบ Agent เดิมของตนเอง ปุ่ม เมนู และสวิตช์ autoplay เป็นการควบคุมที่ผู้ใช้เลือกโดยตรง นิสัยเริ่มต้นกวน ๆ แบบเดิมยังอยู่

# Caprii 0.8.4 / Test Lab 1.12.0 — AI ตีความคำสั่งเพลงก่อนเล่น

คำขอเพลงและการควบคุมเพลงผ่าน AI ที่เลือกก่อนส่งให้ระบบเล่นเดิม เช่น “เล่นเพลงที่ผมกดชอบหน่อย”, “Play my liked songs”, “Could you play my Night Drive playlist?” และ “เปิดเพลง” รับไทย อังกฤษ และผสมกันได้ ไม่ต้องเปลี่ยนโหมด English ซึ่งเป็นภาษาหลักของเมนูและคำตอบ ขั้นตีความไม่มีการเล่นหรืออ่านบัญชี และจำกัดเวลา 15 วินาที หากไม่ชัด/โมเดลไม่พร้อมจะถาม ไม่สั่งเดาหรือย้อนใช้แพตเทิร์นเพื่อเล่นเอง คำสั่งที่เป็นคำอธิบายไม่เปิดเพลงจากแท็กของ AI

ชื่อเพลงและศิลปินต้องมาจากคำพูดผู้ใช้หรือบริบทคำสั่งสื่อที่ทำต่อชัดเจน ไม่รับ URL ที่ AI แต่ง ระบบเชื่อม Chrome ตรวจชื่อ เวลาเดินและเสียงแท็บเดิมยังใช้ต่อ การเปิดเว็บ Spotify อย่างเดียวคงสวิตช์เล่นอัตโนมัติเดิม โหมด Claude Code คงเส้นทางคำสั่งสื่อเดิม นิสัยเริ่มต้นยังกวน ๆ แบบเดิม

# Caprii 0.8.3 / Test Lab 1.11.0 — เพิ่มนิสัยปกติ

คลิกขวา Caprii → นิสัย → ปกติ: สุภาพ เป็นกันเอง ใจเย็น ตรงประเด็น ไม่บังคับเล่นมุกหรือสวมบทบาท เลือกกวน ๆ แบบเดิมกลับได้ บันทึกค่าด้วยการตั้งค่าเดิม ใช้กับแชต การดูจอและรูปที่แนบ คำสั่ง JSON สิทธิ์ทำงาน และผลตรวจยังเหมือนเดิม ไม่เปลี่ยนภาพตัวละครหรือเสียงที่เลือกไว้ ค่าเริ่มต้นและตัวเลือกเดิมของผู้ใช้ยังคงไว้

# Caprii 0.8.2 / Test Lab 1.10.0 — เล่นเพลงที่ค้างอยู่

เมื่อเปิด Spotify อัตโนมัติหรือสั่งเปิดเพลงล่าสุด จะรอตัวเล่นโหลดและเล่นเพลงปัจจุบันก่อน ไม่เอาเพลงเก่าที่ Caprii จำไว้ทับเพลงที่ผู้ใช้เปิดเอง หากตัวเล่นไม่มีเพลงหลังรอ จะใช้เฉพาะเพลงที่เคยตรวจและเก็บ public URL ไว้ ไม่สุ่มเพลง ตรวจเวลาเดินและเสียงแท็บตามระบบเดิม ต้องล็อกอินและเชื่อมส่วนขยาย Chrome การเล่นอัตโนมัติยังปิดได้

# 1.9.0 / Caprii 0.8.1

เพิ่ม contracts task-interpret-context และ task-plan-required แยกจากคะแนน DOM คง stable case IDs เดิมและ actor unknown ไม่เผยแพร่เว็บไซต์

# Changelog

## 1.8.0 / Caprii 0.8.0

ใช้ Caprii 0.7.6 commit 6899749c0c1e5ad33de58e05cb5420320443962d เป็นฐาน อัปเดตสัญญาการทดสอบ agent: JSON planning, หยุดเมื่อไม่คืบหน้า, ส่งเพียงครั้งเดียวแล้วตรวจเลขรับเรื่อง รักษาเคส DOM และ media IDs เดิม ข้อมูล agent ในรายงานไม่ถูกนับเป็นผลผ่าน DOM และไม่อ้างว่ารู้ผู้กระทำ

## 1.7.0 / Caprii 0.7.6

เพิ่ม stable examples spotify-reopen, spotify-controls, spotify-auto แยกจาก 8 เคส DOM และไม่ให้คะแนนผ่านเสียงจริง

## 1.6.2 / Caprii 0.7.5

เพิ่ม no-DOM Talk click, native/DOM dedup และตรวจตำแหน่งปุ่มจริงระหว่างไล่ข้อความ แยกจากคะแนน DOM

## 1.6.1 / Caprii 0.7.4

เพิ่ม Electron regression ปุ่มคุยตอนว่าง แยกจาก 8 เคส DOM และโหมดจำ Chrome เดิม

## 1.6.0 / Caprii 0.7.3

เพิ่มแนวทางตรวจโหมดจำ Chrome ปิดแท็บ/เปิดใหม่ ถอนสิทธิ์ และห้ามย้ายแท็บกลางงาน แยกจากคะแนน DOM เดิม

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
