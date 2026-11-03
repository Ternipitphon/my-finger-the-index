from pathlib import Path
import subprocess,json,hashlib,zipfile,shutil
root=Path(__file__).resolve().parents[1];app=root/'caprii';out=root/'downloads/Caprii-0.7.5';out.mkdir(parents=True,exist_ok=True)
source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
installer=app/'dist/Caprii-Agent-Setup-0.7.5.exe'
data=installer.read_bytes();assert data[:2]==b'MZ' and len(data)>100_000_000
sha=lambda b:hashlib.sha256(b).hexdigest().upper()
parts=[]
for i,start in enumerate(range(0,len(data),60*1024*1024),1):
 name=f'Caprii-Setup.part{i:02}';chunk=data[start:start+60*1024*1024];(out/name).write_bytes(chunk);parts.append({'name':name,'bytes':len(chunk),'sha256':sha(chunk)})
manifest={'version':'0.7.5','platform':'Windows 10/11 x64','installer':installer.name,'bytes':len(data),'sha256':sha(data),'source_commit':source,'parts':parts,'validation':{'application_tests':217,'lab_unit_tests':4,'lab_browser_cases':8,'packaged_resource_check':'passed','real_windows_installation':'not tested','talk_native_fallback':'passed simulated no-DOM click, DOM/native dedup, unknown state and outside cancel; real Windows untested','talk_button':'passed Electron mouse input with moving anchor, idle timeout, delayed status, single flight, dismiss cancellation and visible error; native Windows not tested','browser_pairing':'passed emulated Chrome lifecycle, optional permissions, persisted local pairing, busy-task handoff and real HTTP broker guards; real Chrome not tested','drag_fixture':'passed 20 no-DOM cycles and 30 existing cycles; native Windows not tested','media_transport':'passed real HTTP broker + emulated worker + real DOM with disabled page timers, idle lease, live status, same tab and cross-origin revocation','real_chrome_background_and_spotify_audio':'not tested','media_ui':'passed local Spotify DOM fixture; no real Spotify account'}}
(out/'download-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
checks='; '.join(f"if ((Get-Item -LiteralPath '{p['name']}').Length -ne {p['bytes']} -or (Get-FileHash -LiteralPath '{p['name']}' -Algorithm SHA256).Hash -ne '{p['sha256']}') {{ throw 'Part verification failed. Extract the complete 0.7.5 download ZIP again.' }}" for p in parts)
names=','.join("'"+p['name']+"'" for p in parts)
ps=f"$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; {checks}; $destination=Join-Path (Get-Location) '{installer.name}'; if (-not (Test-Path -LiteralPath $destination)) {{ $temporary=$destination+'.joining-'+[guid]::NewGuid().ToString('N'); try {{ $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try {{ foreach ($part in @({names})) {{ $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try {{ $inputFile.CopyTo($output) }} finally {{ $inputFile.Dispose() }} }} }} finally {{ $output.Dispose() }}; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne '{sha(data)}') {{ throw 'Installer verification failed. Do not run it.' }}; Move-Item -LiteralPath $temporary -Destination $destination }} finally {{ if (Test-Path -LiteralPath $temporary) {{ Remove-Item -LiteralPath $temporary }} }} }}; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne '{sha(data)}') {{ throw 'An existing installer differs from this release. Rename it and try again.' }}; Write-Host 'Caprii 0.7.5 verified. Opening the Windows installer...'; Start-Process -FilePath $destination"
cmd='''@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (PARTS) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Close the previous Caprii app before installing 0.7.5.
echo Checking all downloaded parts. Please wait...
powershell.exe -NoLogo -NoProfile -Command "POWERSHELL"
set "CAPRII_INSTALL_RESULT=%ERRORLEVEL%"
if not "%CAPRII_INSTALL_RESULT%"=="0" (
  echo Verification failed. Read the error above. Do not run an unverified installer.
  pause
)
exit /b %CAPRII_INSTALL_RESULT%
:missing_parts
echo Extract ALL files from the Caprii 0.7.5 Windows ZIP first.
echo Keep INSTALL-CAPRII.cmd and ALL Caprii-Setup.part files in the SAME folder.
pause
exit /b 1
'''.replace('PARTS',' '.join(p['name'] for p in parts)).replace('POWERSHELL',ps)
(out/'INSTALL-CAPRII.cmd').write_bytes(cmd.replace('\n','\r\n').encode('utf-8'))
readme='''# Caprii 0.7.5 — ตัวติดตั้ง Windows x64

1. แตกไฟล์ ZIP ทั้งหมดก่อน อย่าเปิดสคริปต์จากในหน้าต่าง ZIP/WinRAR
2. ปิด Caprii รุ่นเก่าจากถาดระบบ
3. ดับเบิลคลิก **INSTALL-CAPRII.cmd** โดยให้ไฟล์ `Caprii-Setup.part*` ทุกส่วนอยู่ข้างกัน
4. สคริปต์ตรวจ SHA256 ทุกส่วนและตัวติดตั้ง แล้วเปิด **Caprii-Agent-Setup-0.7.5.exe** ให้ติดตั้ง
5. เปิด **Caprii Agent** จาก Desktop/Start Menu คลิกขวาตัวละคร → **Caprii 0.7.5** เพื่อดูรุ่น
6. ทดสอบ: คลิกขวาตัวละคร → **เปิดเว็บทดสอบ Caprii** เว็บจะเปิดเองใน browser ไม่ต้องติดตั้ง Node.js หรือเปิด server แยก ใช้ URL ที่แอปเปิดให้จริง

รุ่นนี้แก้อาการเชื่อมแล้วแต่แอปยังบอกไม่เชื่อม: ไม่ทิ้งสิทธิ์แท็บเพียงเพราะ heartbeat เกิน 8 วินาที Popup ตรวจแอปจริง ส่งคำสั่งจาก extension worker แทนตัวจับเวลาในหน้าเว็บ และฟื้นจากข้อผิดพลาดชั่วคราวโดยไม่กดคำสั่งที่ทำแล้วซ้ำ

ต้องอัปเดตทั้งแอปและส่วนขยาย 0.7.5: ปิด Caprii จากเมนู ออกจากโปรแกรม ในถาดระบบก่อนติดตั้ง เปิดโฟลเดอร์ส่วนขยายจากแอปใหม่ กด Reload ใน chrome://extensions เปิด Spotify ที่ล็อกอินแล้ว เชื่อมใหม่ด้วยรหัสรอบนี้หนึ่งครั้ง จากนั้นสั่ง เล่นเลย หรือ เล่น Liked Songs ไม่ต้องเชื่อมใหม่เพียงเพราะพักแท็บ

ผ่าน 217 app checks, 4 lab checks, 8 DOM browser cases และทดสอบ HTTP broker จริง + worker จำลอง + DOM จริงใน Electron ที่ปิด page timers ยังตรวจเพลงและเวลาเดินได้ ทดสอบสถานะ heartbeat ด้วยนาฬิกาจำลอง **ยังไม่ได้ทดสอบ Chrome/Spotify account/เสียงจริง/Windows จริง** ตัวติดตั้งไม่มีลายเซ็น ไม่มีการ publish เว็บไซต์

พื้นที่ว่างควรมีอย่างน้อย 2 GB สำหรับไฟล์ดาวน์โหลด ตัวติดตั้งที่รวมแล้ว และโปรแกรมติดตั้ง
'''
readme=readme.replace('รุ่นนี้แก้อาการเชื่อมแล้วแต่แอปยังบอกไม่เชื่อม:', 'รุ่นนี้แก้ลากตัวละครเมื่อปิดแชต โดยอ่าน native cursor ขณะ idle และตรวจการกดปุ่มใหม่เมื่อ DOM press หาย ทดสอบจำลอง 20 รอบไม่ใช้ DOM events และ 30 รอบเดิม ยังไม่ได้ทดสอบเมาส์ Windows จริง\n\nรวมการแก้อาการเชื่อมแล้วแต่แอปยังบอกไม่เชื่อม:')
readme+='\nโหมดใหม่: เปิด popup ส่วนขยาย ติ๊ก จำการเชื่อม Chrome และตามแท็บใช้งาน แล้วอนุญาตเว็บไซต์ http/https ครั้งเดียว ปิดแท็บหรือเปิด Chrome ใหม่ไม่ต้องกรอกรหัสซ้ำขณะที่แอป Caprii ยังเปิดอยู่ ปิด–เปิด Caprii ใหม่ต้องใช้รหัสใหม่ กดตัดการเชื่อมต่อเพื่อลบรหัสและถอนสิทธิ์เว็บไซต์\n'
readme+='\n0.7.5 แก้ปุ่มคุยกับฉัน: ล็อกปุ่มระหว่างกด แสดงสถานะเปิดแชตทันที ไม่รอ AI เงียบ ๆ และแสดงข้อผิดพลาดหากเชื่อมไม่ได้\n'
readme+='\n0.7.5 เพิ่มทางสำรองเมาส์จริงเฉพาะปุ่มคุยตอนว่าง และหยุดไล่ข้อความระหว่างกด เพื่อกันปุ่มขยับภายในกล่อง\n'
(out/'README-TH.md').write_text(readme)
shutil.copy(app/'CAPRII-TH.md',out/'GUIDE-TH.md');shutil.copy(app/'VALIDATION.md',out/'VALIDATION.md')
files=subprocess.check_output(['git','ls-files','-z','caprii'],cwd=root).decode().strip('\0').split('\0')
with zipfile.ZipFile(out/'Caprii-Agent-0.7.5-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in files:z.write(root/f,f)
joined=b''.join((out/p['name']).read_bytes() for p in parts);assert sha(joined)==manifest['sha256'] and len(joined)==manifest['bytes']
print(json.dumps({'installer_bytes':len(data),'sha256':manifest['sha256'],'parts':len(parts),'source_commit':source,'reconstruction_verified':True},indent=2))
