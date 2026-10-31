@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Checking downloaded files. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '5EF1F620921D8E337679A64056AF9794C3E06A8C1EF419E25F32F4B52E3A198E') { throw 'Part 1 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne '8BF1911AB0725BD64EE6B14155BBFB574EEB443F5314D5410BC7A3765CA7101D') { throw 'Part 2 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne 'B9E2D22B4FC784FF919275C119CAAECB2B12509A31A5E139AB2F1699D80D5AC6') { throw 'Part 3 is incomplete or corrupted. Download the repository ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.4.11.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining'; $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne '8DD9C2908ADB9FE55387CBDECFB381C1942FE30AB5AC2D8A831789DC65234192') { throw 'Installer verification failed. Do not run this file.' }; Move-Item -LiteralPath $temporary -Destination $destination }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne '8DD9C2908ADB9FE55387CBDECFB381C1942FE30AB5AC2D8A831789DC65234192') { throw 'Existing installer differs from the verified release. Rename it and try again.' }; Write-Host 'Verified. Opening the Caprii installer...'; Start-Process -FilePath $destination"
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
echo Open downloads\Caprii-0.4.11 inside the extracted folder.
echo INSTALL-CAPRII.cmd and Caprii-Setup.part01, part02, part03 must be together.
echo Do not run this file from inside the ZIP or download only this CMD file.
echo.
pause
exit /b 1
