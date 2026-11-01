# Caprii 0.5.6 — อ่านเว็บ กรอกฟอร์ม และตรวจผลด้วย DOM (รวมในตัวติดตั้ง)

ฐานซอร์ส: `Ternipitphon/my-finger-the-index` commit `6c52879dc22666f8a443cbd50dfadfad86c4209d` ซึ่งประกาศเวอร์ชัน `0.5.5` ทั้งแอปและส่วนขยาย ไม่มีการนำสำเนา 0.4.7 มาใช้

ใช้กับ browser ของแอป หรือแท็บ Chrome ที่ผู้ใช้เลือกเชื่อมต่อผ่านส่วนขยายเดิม หลังอัปเดตไฟล์ส่วนขยาย ให้ Reload ส่วนขยายและเชื่อมแท็บใหม่ ไม่ต้องเพิ่มสิทธิ์ host หรือใช้ remote debugging ในการใช้งานปกติ

## ลำดับการใช้งานของ agent

1. `browser.read` อ่านข้อความที่แสดงบนเว็บและรับ `elements` พร้อม `generation` ใหม่ มีชื่อช่อง ค่าปัจจุบัน สถานะ disabled/readOnly ตัวเลือก dropdown และสถานะ checked ของ checkbox/radio
2. กรอกทีละช่องด้วย `browser.type` (ข้อความ/ช่อง contenteditable), `browser.select` (ค่า option ที่มีอยู่จริง) หรือ `browser.check` (checked เป็น boolean; radio ใช้ true)
3. ทุกคำสั่งคืน snapshot ใหม่ ใช้ ID และ generation จาก snapshot ล่าสุดเท่านั้น ตรวจค่ากลับด้วย `browser.expect_value` โดยระบุ `value` หรือ `checked` อย่างใดอย่างหนึ่ง
4. เมื่อผู้ใช้ขอให้ส่ง ใช้ `browser.click` พร้อม `intent: "submit"` บนปุ่มที่อ่านได้จริง
5. ใช้ `browser.expect` ระบุ `contains` และ `selector` ของส่วนผลลัพธ์ เช่น `#result` หรือ `[role="status"]` พร้อม `timeoutMs` ระหว่าง 0–5000 (ค่าเริ่มต้น 2000) เพื่อรอการแสดงผล ตรวจเฉพาะข้อความที่มองเห็นในแต่ละ element ไม่รวมข้อความหลาย element มาสร้างผลผ่าน

ตัวอย่างโครงสร้างคำสั่ง (ต้องใช้ ID/generation ที่อ่านได้จริง):

```json
{"tool":"browser.select","id":1,"generation":"<latest>","value":"th"}
{"tool":"browser.expect_value","id":1,"generation":"<new latest>","value":"th"}
{"tool":"browser.check","id":2,"generation":"<new latest>","checked":true}
{"tool":"browser.expect_value","id":2,"generation":"<new latest>","checked":true}
{"tool":"browser.expect","contains":"ส่งสำเร็จ","selector":"#result","timeoutMs":3000}
```

การอ่านค่าช่องผ่านยืนยันเฉพาะการกรอก ไม่ยืนยันว่าฟอร์มถูกส่งหรือ server บันทึกข้อมูลแล้ว การตรวจผลหลังส่งไม่ยอมรับข้อความที่มีอยู่ก่อนคลิกส่งจริง แม้ข้อความนั้นเพิ่งปรากฏหลัง snapshot ล่าสุด ถ้าข้อความก่อนส่งยาวเกินขอบเขตที่เก็บได้ จะคืน `baselineIncomplete: true` และไม่ยืนยันผลส่งเพื่อหลีกเลี่ยงการนับข้อความเก่าเป็นผลใหม่ หากเว็บแสดงข้อความเดิมทุกครั้ง ต้องใช้หลักฐานผลลัพธ์ใหม่ที่ระบุครั้ง/รายการได้ ไม่ฝืนรายงานว่าผ่าน

## ขอบเขต

- ไม่เปลี่ยนระบบอนุญาตหรือโหมดอัตโนมัติเดิม คำสั่งใหม่เคารพ “ห้ามกรอก” และไม่ทำซ้ำเมื่อคำสั่งก่อนหน้า timeout จนผลยังไม่แน่ชัด
- ตรวจว่าปุ่ม/ช่องยังอยู่ มองเห็น ใช้งานได้ และมีตัวตน/ตัวเลือกเดิม ก่อนแก้ไข ตรวจ URL เพื่อปฏิเสธ snapshot เก่าหลังเปลี่ยนหน้าแบบ SPA ด้วย
- ไม่อ่านค่า password และไม่กรอก password/file/hidden ไม่รองรับ multi-select, iframe, shadow DOM หรือ canvas ในแพตช์นี้ ใช้ DOM ของ document หลักและรายการสูงสุด 80 element
- ข้อความทั้งหน้าใน snapshot จำกัด 14,000 ตัวอักษร ค่าช่องจำกัด 4,000 ตัวอักษร การตรวจส่วนผลลัพธ์ด้วย selector อ่านส่วนที่ระบุแยกจากข้อความ snapshot
- ไม่เพิ่ม dependency และคงเวอร์ชัน 0.5.5 ไว้ งานนี้ไม่มีการ publish release, deploy หรือสร้าง Windows installer (อัปโหลดซอร์สลง branch แยกตามคำขอผู้ใช้)

## ทดสอบ

```sh
npm test
npm run test:chrome-ui
npm run test:dom-ui
```

`test:dom-ui` ใช้ fixture HTTP บน loopback และ browser จริง ตรวจเส้นทาง browser ของแอปและ authenticated Chrome broker กับ isolated DOM world โดยไม่เรียก AI หรือเว็บไซต์ภายนอก การทดสอบ broker นี้จำลอง peer ฝั่งส่วนขยาย จึงไม่ใช่การยืนยัน UI ของ Google Chrome/การติดตั้งส่วนขยายจริงบน Windows

บน Linux ที่ไม่มีหน้าจอ สามารถรัน `electron --no-sandbox --ozone-platform=headless scripts/dom-form-smoke.js` ในสภาพแวดล้อมทดสอบที่จำเป็นต้องใช้ flags นี้ ไม่ใช่การเปลี่ยนค่า sandbox ของแอปใช้งานจริง
