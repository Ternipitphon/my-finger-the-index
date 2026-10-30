@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Checking downloaded files. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '8C8C33C60E8259630E877A0DD850F74F3A11F7F73EB6EA15AD8DCF2B5C15AF66') { throw 'Part 1 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne 'C542D364D578F421F0DBAC9DC69C1B8F60BADD6DE95FC2A2AC71B6B40524E4D9') { throw 'Part 2 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne '14940166A690AE351BCEB37AAF3CF7765D65EEA0C1DD0BEF086BE6A0A7DD3391') { throw 'Part 3 is incomplete or corrupted. Download the repository ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.4.6.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining'; $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne '59D0018B08671A56A1BC40A76C91F71F5388F50F76D318FB9E40769BEDC964E9') { throw 'Installer verification failed. Do not run this file.' }; Move-Item -LiteralPath $temporary -Destination $destination }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne '59D0018B08671A56A1BC40A76C91F71F5388F50F76D318FB9E40769BEDC964E9') { throw 'Existing installer differs from the verified release. Rename it and try again.' }; Write-Host 'Verified. Opening the Caprii installer...'; Start-Process -FilePath $destination"
set "CAPRII_INSTALL_RESULT=%ERRORLEVEL%"
if not "%CAPRII_INSTALL_RESULT%"=="0" (
  echo Could not verify the installer. Keep this window open and check the error above.
  pause
)
exit /b %CAPRII_INSTALL_RESULT%
:missing_parts
echo.
echo The installer parts are missing from this folder:
echo "%~dp0"
echo.
echo Download the WHOLE repository ZIP, then right-click it and select Extract All.
echo Open downloads\Caprii-0.4.6 inside the extracted folder.
echo INSTALL-CAPRII.cmd and Caprii-Setup.part01, part02, part03 must be together.
echo Do not run this file from inside the ZIP or download only this CMD file.
echo.
pause
exit /b 1
