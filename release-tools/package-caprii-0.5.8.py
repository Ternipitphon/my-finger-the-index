from pathlib import Path
import subprocess,json,hashlib,zipfile,shutil
root=Path(__file__).resolve().parents[1];app=root/'caprii';out=root/'downloads/Caprii-0.5.8';out.mkdir(parents=True,exist_ok=True)
source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
installer=app/'dist/Caprii-Agent-Setup-0.5.8.exe'
data=installer.read_bytes();assert data[:2]==b'MZ' and len(data)>100_000_000
sha=lambda b:hashlib.sha256(b).hexdigest().upper()
parts=[]
for i,start in enumerate(range(0,len(data),60*1024*1024),1):
 name=f'Caprii-Setup.part{i:02}';chunk=data[start:start+60*1024*1024];(out/name).write_bytes(chunk);parts.append({'name':name,'bytes':len(chunk),'sha256':sha(chunk)})
manifest={'version':'0.5.8','platform':'Windows 10/11 x64','installer':installer.name,'bytes':len(data),'sha256':sha(data),'source_commit':source,'parts':parts,'validation':{'application_tests':148,'lab_unit_tests':3,'lab_browser_cases':8,'packaged_resource_check':'passed','real_windows_installation':'not tested','response_length':'short by default; balanced/detailed saved in settings','live_vision':'passed Gemini 3.5 Flash Lite synthetic image; correct 3 red boxes in 54 characters','chrome_extension_integration':'blocked by administrator policy; unit and authenticated broker smoke passed'}}
(out/'download-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
checks='; '.join(f"if ((Get-Item -LiteralPath '{p['name']}').Length -ne {p['bytes']} -or (Get-FileHash -LiteralPath '{p['name']}' -Algorithm SHA256).Hash -ne '{p['sha256']}') {{ throw 'Part verification failed. Extract the complete 0.5.8 download ZIP again.' }}" for p in parts)
names=','.join("'"+p['name']+"'" for p in parts)
ps=f"$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; {checks}; $destination=Join-Path (Get-Location) '{installer.name}'; if (-not (Test-Path -LiteralPath $destination)) {{ $temporary=$destination+'.joining-'+[guid]::NewGuid().ToString('N'); try {{ $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try {{ foreach ($part in @({names})) {{ $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try {{ $inputFile.CopyTo($output) }} finally {{ $inputFile.Dispose() }} }} }} finally {{ $output.Dispose() }}; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne '{sha(data)}') {{ throw 'Installer verification failed. Do not run it.' }}; Move-Item -LiteralPath $temporary -Destination $destination }} finally {{ if (Test-Path -LiteralPath $temporary) {{ Remove-Item -LiteralPath $temporary }} }} }}; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne '{sha(data)}') {{ throw 'An existing installer differs from this release. Rename it and try again.' }}; Write-Host 'Caprii 0.5.8 verified. Opening the Windows installer...'; Start-Process -FilePath $destination"
cmd='''@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (PARTS) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Close the previous Caprii app before installing 0.5.8.
echo Checking all downloaded parts. Please wait...
powershell.exe -NoLogo -NoProfile -Command "POWERSHELL"
set "CAPRII_INSTALL_RESULT=%ERRORLEVEL%"
if not "%CAPRII_INSTALL_RESULT%"=="0" (
  echo Verification failed. Read the error above. Do not run an unverified installer.
  pause
)
exit /b %CAPRII_INSTALL_RESULT%
:missing_parts
echo Extract ALL files from the Caprii 0.5.8 Windows ZIP first.
echo Keep INSTALL-CAPRII.cmd and ALL Caprii-Setup.part files in the SAME folder.
pause
exit /b 1
'''.replace('PARTS',' '.join(p['name'] for p in parts)).replace('POWERSHELL',ps)
(out/'INSTALL-CAPRII.cmd').write_bytes(cmd.replace('\n','\r\n').encode('utf-8'))
readme='''# Caprii 0.5.8 — ตัวติดตั้ง Windows x64

1. แตกไฟล์ ZIP ทั้งหมดก่อน อย่าเปิดสคริปต์จากในหน้าต่าง ZIP/WinRAR
2. ปิด Caprii รุ่นเก่าจากถาดระบบ
3. ดับเบิลคลิก **INSTALL-CAPRII.cmd** โดยให้ไฟล์ `Caprii-Setup.part*` ทุกส่วนอยู่ข้างกัน
4. สคริปต์ตรวจ SHA256 ทุกส่วนและตัวติดตั้ง แล้วเปิด **Caprii-Agent-Setup-0.5.8.exe** ให้ติดตั้ง
5. เปิด **Caprii Agent** จาก Desktop/Start Menu คลิกขวาตัวละคร → **Caprii 0.5.8** เพื่อดูรุ่น
6. ทดสอบ: คลิกขวาตัวละคร → **เปิดเว็บทดสอบ Caprii** เว็บจะเปิดเองใน browser ไม่ต้องติดตั้ง Node.js หรือเปิด server แยก ใช้ URL ที่แอปเปิดให้จริง

รุ่นนี้เพิ่มเมนู ความยาวคำตอบ / คำพูด เลือกสรุปสั้น (ค่าเริ่มต้น 1–3 ประโยค) สมดุล หรือละเอียด และจำค่าหลังปิดเปิดแอป ขอรายละเอียดเป็นรายครั้งได้ คำถาม ข้อนี้ตอบอะไร จะอ่านโจทย์จริงและตรวจคำตอบโดยไม่กรอกหรือส่งเอง ปรับข้อความผิดพลาดเชื่อม Chrome ให้ชัดขึ้น ยังมีบุคลิกแนวรีเบคก้าและปุ่ม 📎 แนบรูป/Ctrl+V รวมโค้ด DOM forms ล่าสุด (ข้อความ/dropdown/checkbox/radio), ตรวจค่ากลับและผลส่งที่แสดงช้า, Test Lab 8 เคส, ส่วนขยาย 0.5.8, และ Python/Agent Reach ที่ตรวจ checksum แล้ว ไม่ใช่แพตช์หรือซอร์สโค้ดอย่างเดียว

ทดสอบกับ Gemini โดยใช้ภาพสังเคราะห์จริง นับกล่องสีแดงถูกต้องและตอบสรุปสั้น 54 ตัวอักษร ทดสอบผ่าน 148 app tests, 3 lab checks, 8 เคส browser จริง และตรวจแพ็กเกจ ASAR/Windows x64/Python/ฟอนต์/ส่วนขยาย พร้อมเปิด Test Lab จาก ASAR จริงแล้ว **ยังไม่ได้ลองติดตั้งและควบคุมบน Windows จริง** ตัวติดตั้งยังไม่มีลายเซ็นดิจิทัล ไม่มีการ publish เว็บไซต์

การทดสอบส่วนขยายจริงบน Chromium รอบนี้ถูกนโยบายผู้ดูแลบล็อกไว้ ตรวจ unit และ broker ที่ทำได้โดยไม่เปลี่ยนนโยบาย

พื้นที่ว่างควรมีอย่างน้อย 2 GB สำหรับไฟล์ดาวน์โหลด ตัวติดตั้งที่รวมแล้ว และโปรแกรมติดตั้ง
'''
(out/'README-TH.md').write_text(readme)
shutil.copy(app/'CAPRII-TH.md',out/'GUIDE-TH.md');shutil.copy(app/'VALIDATION.md',out/'VALIDATION.md')
files=subprocess.check_output(['git','ls-files','-z','caprii'],cwd=root).decode().strip('\0').split('\0')
with zipfile.ZipFile(out/'Caprii-Agent-0.5.8-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in files:z.write(root/f,f)
joined=b''.join((out/p['name']).read_bytes() for p in parts);assert sha(joined)==manifest['sha256'] and len(joined)==manifest['bytes']
print(json.dumps({'installer_bytes':len(data),'sha256':manifest['sha256'],'parts':len(parts),'source_commit':source,'reconstruction_verified':True},indent=2))
