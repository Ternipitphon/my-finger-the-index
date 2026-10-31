# Caprii Agent 0.4.8 validation

Date: 30 October 2026 (Asia/Bangkok). Host: Linux x64, Node 24.19.0, Electron 44.9.3; virtual Xorg display with software WebGL. No cloud environment draft changes or cloud environment publication were performed in this development turn.

## Passed

- `npm test`: 59 tests executed, 59 passed, 0 failed, 0 skipped. Covers existing hooks, the chat deadline/retry/stop rules, fragmented Thai SSE decoding, credential redaction, model filtering, tool validation, path/symlink/Windows-device restrictions, approved backups and moves, actual npm execution, process-tree termination, changed-manifest rejection, DPI conversion in the JavaScript adapter, and preventing an unrelated passing check from hiding an unresolved tool failure.
- `npm run test:electron`: real Electron page navigation, text entry, button click, actual DOM assertion, screenshots, blocked unapproved cross-origin redirects, isolated page state, Thai task UI, Stop IPC, completion rendering, and actual virtual-display screenshot capture.
- Live Gemini `models/gemini-3.5-flash-lite`: Thai chat and follow-up context succeeded. Vision returned the correct Thai name of a generated red test image's color. No personal screen content was sent in that vision test.
- Live coding agent: Gemini inspected a temporary buggy `add` function, changed the fixture source from subtraction to addition, ran its real npm test, and reported the passing assertion. The verification script and package.json were not editable by this fixture's permission handler.
- Actual app setup IPC enumerated Gemini models and confirmed a generated response before selecting `models/gemini-3.5-flash-lite`.
- Actual renderer chat displayed a Thai answer through the normal renderer/main IPC path and returned the input to its ready state.
- Actual chat Stop button cancelled a deliberately stalled local provider request and restored the UI. This used a local synthetic fixture and restored Gemini afterward.
- Windows x64 NSIS installer was built using the supported custom-script path. It creates its unsigned uninstaller on the destination Windows PC, so Linux builds do not execute an intermediate Windows EXE. The final artifact is unsigned. Package-content verification and SHA-256 manifest accompany the release files.

## Not executed; requires Windows

- `npm run test:windows` real user32 window enumeration/focus, Thai Unicode keyboard injection, Ctrl+A, pointer click and resulting screenshots in an unlocked Windows desktop session.
- Physical multi-monitor DPI behavior, foreground restrictions, UAC/elevated app boundaries, and interaction with VS Code on Windows.
- Installing, launching from the shortcut, upgrading and uninstalling on a real Windows machine.
- The supplied `.github/workflows/windows-validation.yml` workflow has not been run or published to GitHub.

The JavaScript adapter's unit tests are not a substitute for the Windows native tests. Successful injection or a window PID is not proof a user's full task succeeded. Agent summaries include actual check evidence and an explicit notice when required verification is missing. Exit code zero from an arbitrary project script is evidence only of that script's result; it does not establish that the project has a comprehensive test suite.

## Operational limits

40 tool turns / 5 minutes per task, 30 seconds and 3 provider attempts per chat request, 4096 generated tokens per OpenAI-compatible request, 60 seconds / bounded output per npm check, 64 KB per project file. Provider quota/free-tier availability is not guaranteed. Browser sessions are ephemeral; new origins, files, scripts, desktop input and screen sharing require confirmation. No automatic cross-task agent memory or chat-history persistence by default. User-exported reports are optional local files.

Project scripts and desktop actions are approved capabilities, not an OS sandbox. Only run trusted project scripts. A Windows test failure remains a release limitation until investigated on Windows; do not describe this build as fully Windows-validated.

## Screen-routing hotfix

The exact reported Thai command ดูจอแล้วพิมพ์คำตอบไป is tested through the renderer Chat class: it invokes agent IPC, not text-only chat. Thai look-only commands select the screenshot flow. Refusals and unrelated chat do not start screen actions. Screenshot requests use the bounded/cancellable chat runner; the UI distinguishes capture and analysis stages. Electron browser/task UI smoke passed again. The revised Windows helper invocation is adapter-tested only; native Windows execution remains unrun.

## 0.4.8 calculation / mouse / website update

- 59 automated unit/integration tests passed with no failures or skipped tests. New checks include exact rational arithmetic, rejecting executable expressions, enforcing use of puzzle numbers, the impossible 3/1/7/1 → 82 case, explicit digit joining, batch arithmetic, preventing unverified/number-word answer entry, natural Thai mouse/YouTube commands, and desktop-only mode without project tools.
- Live Gemini invoked math.solve for the reported puzzle under explicitly stated basic rules, received no solution, and reported that scoped result instead of inventing 42. No personal screenshot was sent in that test.
- Real Electron app UI test: Thai เปิดyoutube went through renderer and main IPC, requested confirmation, then called the OS browser-launch API. The external-launch API was replaced with a recording stub; this is not a claim that Chrome/YouTube actually opened on Windows. No LLM was called on that path.
- Real Electron browser, page assertions, task UI, Stop and capture smoke tests passed again.
- Native Windows mouse move/right/double click/drag, extended keys, and the new opt-in in-app diagnostic are implemented but have NOT executed on Windows here. The diagnostic is a way to obtain actual device evidence after installation; no native pass result is claimed.
- Exact arithmetic verifies the expression supplied to it, not the correctness of screenshot reading or the user's intended puzzle rules. The solver supports + - * / and parentheses, with optional explicit digit joining; unsupported rules must be clarified.


## เวอร์ชัน 0.4.8

เพิ่มปุ่ม “อนุญาตตลอดงานนี้” สำหรับจอหรือหน้าต่างที่เลือก สิทธิ์อยู่ในหน่วยความจำเฉพาะงาน ไม่เกิน 5 นาที จบงานหรือหยุดแล้วหมดสิทธิ์ การคลิกอาจส่งแบบฟอร์มหรือแก้ข้อมูลได้ เปลี่ยนหน้าต่าง/จอหรือใช้คำสั่งที่ไม่อยู่ในขอบเขตจะถามใหม่

ตัวละครเริ่มกลางจอ แล้วสุ่มเลื่อนเดิน ขยับ และแสดงข้อความไทยเมื่อว่าง หยุดพฤติกรรมสุ่มระหว่างเปิดแชตหรือทำงาน ไม่สุ่มควบคุมเมาส์หรือเปิดโปรแกรม

การติดตั้งทับ: ปิด Caprii ที่ถาดระบบก่อนเริ่มติดตั้ง Windows และการคลิกจริงต้องตรวจบน Windows ไม่ถือว่าทดสอบแล้วบน Linux

ผลตรวจ 0.4.8 ในสภาพแวดล้อมใหม่: npm test ผ่าน 65/65; test:electron ผ่านการกรอกเว็บ คลิก ตรวจ DOM ภาพหน้าจอ และ Stop IPC; test:site-ui ผ่านการเริ่มตัวละครกลางจอ การสร้างการเดินสุ่ม การหยุดระหว่างงาน และคำสั่งเปิด YouTube ผ่าน OS browser API จำลอง โดยไม่เรียก LLM ไม่มีการทดสอบการติดตั้งหรือ native input บน Windows ในรอบนี้


## 0.4.9: คำสั่งโจทย์บนหน้าเว็บ

รองรับ “ทำโจทที่อยู่บนหน้าให้หน่อย”, “ทำโจทย์ที่อยู่บนหน้าให้หน่อย” และ “ช่วยทำข้อที่อยู่บนหน้านี้ให้หน่อย” ให้เข้า Agent ผ่านขั้นตอนขออนุญาตจริง ไม่ส่งเป็นแชตข้อความอย่างเดียว คำสั่งห้ามทำ/ห้ามกรอก/ห้ามคลิกยังไม่เริ่มควบคุมหน้าจอ
ผลตรวจ: 68/68 tests ผ่าน รวมการเรียก agent IPC จาก Chat ด้วยข้อความจริงและคำปฏิเสธ การติดตั้งและ native input ยังต้องตรวจบน Windows


## 0.4.10: ทำตามคำสั่งกรอกและส่งให้ครบ

การคำนวณได้อย่างเดียวไม่ถือว่ากรอกหรือส่งแล้ว หากขอกรอก/ส่ง Agent จะถูกเตือนให้เรียกเครื่องมือที่ยังขาดก่อนจบ (ไม่เกินสองครั้งและไม่เกินเวลางาน) ถ้าพบข้อผิดพลาดหรือโจทย์ไม่มีคำตอบ จะรายงานงานที่ยังไม่ทำ การกดแป้นคำตอบบนจอใช้ intent answer_key และปุ่มส่งใช้ intent submit โดยผ่านการอนุญาตเดิม การส่งคำสั่งเมาส์/คีย์บอร์ดไม่ใช่หลักฐานว่าหน้าเว็บรับคำตอบแล้ว การตรวจชื่อหน้าต่างไม่ยืนยันการส่งแบบฟอร์ม
ผลตรวจ 73/73 tests และ Electron GUI ผ่าน: คิดเลขได้แล้วพยายามจบก่อนกรอก ถูกสั่งให้ทำต่อ จากนั้นกรอก 15 ในช่องจริง คลิกปุ่ม และตรวจ DOM ตอบรับ การทดสอบนี้ใช้เบราว์เซอร์ Electron บน Linux ไม่ใช่การควบคุม Chrome/Windows ของผู้ใช้


## 0.4.11: โฟกัสและพิมพ์ในช่องคำตอบ

แก้การโฟกัสไม่ให้คืนขนาดหน้าต่างที่ขยายเต็มจอ (คืนเฉพาะหน้าต่างที่ย่ออยู่) เพิ่ม desktop.input kind type พร้อมพิกัด x,y เพื่อคลิกช่องและพิมพ์ในขั้นตอนเดียว และ replace true เพื่อเลือกแทนที่ข้อความหลังคลิก ตัวเลข/อักขระ ASCII ใช้ scan-code keyboard events ตาม layout ของหน้าต่างปลายทาง อักขระอื่นใช้ Unicode และไม่มีการเปลี่ยน layout ของผู้ใช้ พิกัดช่องตรวจขอบเขตหน้าต่างและ DPI ก่อนส่งอินพุต

ผลตรวจ: unit/integration 75/75 ผ่าน รวม validation และ JSON/DPI ของการคลิกพิมพ์ เพิ่ม test:windows สำหรับหน้าต่างขยายเต็มจอ โฟกัส พิมพ์ในช่อง และ keyboard event code แต่ยังไม่ได้รันบน Windows ใน cloud Linux นี้ การส่งอินพุตไม่ได้ยืนยันว่าช่องเว็บรับข้อความ ต้องตรวจภาพหรือค่าช่องจริงต่อ เมนู “ทดสอบเมาส์และการพิมพ์” เพิ่มการคลิกช่องและพิมพ์ 2*7+9/9 ในหน้าต่างทดสอบของ Caprii โดยไม่ส่งข้อมูลไป AI


## 0.4.12: โหมดไม่ถามสำหรับจอและเว็บ

คลิกขวา Caprii แล้วเปิด “โหมดไม่ถาม: ดูจอ/คลิก/พิมพ์/เปิดเว็บ (จนปิด Caprii)” ตัวเลือกเริ่มปิดทุกครั้ง ไม่เก็บลง config เมื่อเปิดแล้ว คำสั่งจอ/เว็บเริ่มทำงานโดยไม่ถามเลือกโหมดและไม่ถามยืนยันแต่ละเครื่องมือ รวมการส่งภาพจอ/ข้อมูลหน้าเว็บให้ผู้ให้บริการ AI ที่ตั้งค่าไว้ ปิดโหมดหรือเปลี่ยนโหมดจะหยุดงานปัจจุบัน ปุ่มหยุดและ Ctrl+Alt+Esc ยังหยุดงานได้ เวลางานยังจำกัด 5 นาที และไม่เปิดการดูจอเองเป็นพื้นหลัง

โหมดนี้ไม่ขยายสิทธิ์ไฟล์/สคริปต์หรืออนุมัติเปลี่ยนเลข/กติกาโจทย์อัตโนมัติ งานโปรเจกต์เลือกโฟลเดอร์ในโหมดปกติ หลักฐานว่าพิมพ์หรือส่งคำสั่งแล้วไม่ใช่การรับรองว่าเว็บรับคำตอบ

ผลตรวจ: 78/78 tests ผ่าน และ Electron GUI ผ่านเส้นทางจริง: เริ่มจากปิดโหมด เปิดเว็บไซต์ถามยืนยัน; คลิก checkbox เปิดโหมด เปิดเว็บและทำงานจับภาพจอ+คำนวณโดยไม่มี dialog เพิ่ม; ปิดโหมดแล้วกลับมาถาม; ไม่เก็บสิทธิ์ใน config การทดสอบ Windows native ยังต้องตรวจบน Windows
