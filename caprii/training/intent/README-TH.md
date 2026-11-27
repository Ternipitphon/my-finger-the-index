# Caprii intent training experiment

นี่คือการฝึก neural character CNN จากศูนย์บน CPU สำหรับเลือก route 8 ประเภท ไม่ใช่การ fine-tune Gemini, ไม่ใช่ LLM ที่คุยหรือใช้เครื่องมือได้ และไม่ได้ถูกเปิดใช้ใน Caprii รุ่นติดตั้ง

ชุดข้อมูลเป็นข้อความแต่งขึ้น ไทย/อังกฤษ ไม่มีประวัติส่วนตัวของผู้ใช้: train 124, dev 18, test 42 แยก input และ family ไม่ซ้ำข้ามชุด ตรวจด้วย `node scripts/benchmark-intents.cjs` จากซอร์สเต็ม โมเดลมี 29,816 parameters, seed 712 เลือก checkpoint จาก dev macro-F1 เท่านั้น รายงาน test รวมทั้งรายการที่ตอบผิดอยู่ใน results/report.json คะแนน softmax ไม่ใช่ confidence ที่ผ่านการ calibration

ผลที่บันทึก: test 32/42 (76.19%), macro-F1 ประมาณ 0.7895; เมื่อทุกข้อความมีสถานะ Chrome connected เป็นจริงได้ 34/42 (80.95%) ชุดข้อมูลยังเล็กและเป็นข้อมูลแต่ง ไม่ใช่หลักฐานว่าจะใช้กับผู้ใช้ทั่วไปได้ดี จึงไม่ใช้โมเดลนี้สั่งงานจริง เป้าหมาย route ถูกไม่ได้ยืนยันชื่อเพลง เป้าหมาย สิทธิ์ หรือผลการลงมือ

ตอนตรวจข้อมูลพบว่า connected อาจกลายเป็นทางลัดบอก label จึงสลับสถานะ connected ใน train/dev ของ route อื่นด้วยก่อนรันที่เผยแพร่ ไม่ได้เลือกค่าฝึกหรือ checkpoint จากคะแนน test ค่า settings ฝึกยังเป็นเดิม

## รันจากซอร์สเต็ม

Python 3.12 ตัวอย่างบน Windows ใช้ python แทน python3 ตามเครื่อง:

```
python -m venv .venv-intent
.venv-intent/Scripts/python -m pip install torch==2.5.1+cpu --index-url https://download.pytorch.org/whl/cpu
.venv-intent/Scripts/python -m pip install numpy==1.26.4 safetensors==0.4.5
.venv-intent/Scripts/python training/intent/train_cpu.py
.venv-intent/Scripts/python training/intent/predict_cpu.py --text "เปิดเพลง"
.venv-intent/Scripts/python training/intent/export_sft.py
```

Linux ใช้ `.venv-intent/bin/python` หากใช้ training ZIP แยกให้เปลี่ยน `training/intent/` เป็น `intent/` เท่านั้น การฝึกและ predict ทำในเครื่อง ไม่มี API calls และไม่อัปโหลดข้อความ

## ชุดสำหรับ fine-tuning ต่อ

`results/sft` เป็น JSONL แบบ messages สำหรับ route-only classifier แยก train/dev/test แล้ว ไม่มีการอัปโหลดหรือสร้าง paid job ไม่ใช่ข้อมูลฝึก full Caprii assistant เพราะยังไม่มีคำตอบแชต/arguments/ผลเครื่องมือครบทุกตัวอย่าง บริการ fine-tuning แต่ละเจ้าต้องตรวจรุ่นโมเดล รูปแบบข้อมูล สิทธิ์ และค่าใช้จ่ายก่อนใช้

การ fine-tune pretrained multilingual model ยังไม่ได้รัน: เครื่องไม่มี GPU และนโยบายเครือข่ายไม่อนุญาตดาวน์โหลด Hugging Face การขอเพิ่มโดเมนถูก published configuration ปฏิเสธ จึงไม่เปลี่ยนเส้นทางเพื่อข้ามข้อจำกัด โมเดลที่แจกเป็น CNN ที่ฝึกจากศูนย์ตามที่ระบุเท่านั้น

## การทดลอง Gemini แยกจากโมเดลเล็ก

`results/llm-pilot.json` บันทึก exploratory pilot 10 เคสก่อนแก้ URL continuation จุดสุดท้าย baseline 7/10 และ candidate 9/10 มี provider/format/validation failures รวมในคะแนน ไม่ใช่ final held-out accuracy หรือหลักฐานว่าเก่งขึ้นทั่วไป pilot นี้ใช้วินิจฉัยบั๊ก จึงไม่ควรนำมาโฆษณาเป็นคะแนนประเมินอิสระหลังแก้

จากซอร์สเต็ม `node scripts/benchmark-intents.cjs` ตรวจข้อมูลแบบ offline เท่านั้น `--live` เรียก Gemini API จริงและอาจใช้โควตาหรือมีค่าใช้จ่าย ไม่รันใน CI และไม่เรียกเครื่องมือบนบัญชี/เครื่องผู้ใช้ ไม่ควรรันซ้ำโดยไม่พิจารณาค่า API

ไฟล์ weights ใช้ safetensors ไม่มี pickle โหลดจากแหล่งที่เชื่อถือได้เท่านั้น ดูสิทธิ์ใช้งานใน LICENSE ที่มาพร้อมชุดทดลอง
