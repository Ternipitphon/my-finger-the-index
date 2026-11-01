@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Checking downloaded files. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '72DA52203923B7960491B1DAA2D9B99A6197CC178F82EDCE828816C8C48203A5') { throw 'Part 1 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne '6B80A9F2768364D6D9496039D3C27D3096815C747025B1BB57382231C09ED337') { throw 'Part 2 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne '2FDC0C58502484630DEBCA671BE5E7C808A11FBF76C954767F09BC88DEFFBA9E') { throw 'Part 3 is incomplete or corrupted. Download the repository ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.5.1.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining'; $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne 'CF3F2FA1FBD4A8D1CBD1C80F7DD8BE2C97096DD69ED7489D8933EA61661CC07A') { throw 'Installer verification failed. Do not run this file.' }; Move-Item -LiteralPath $temporary -Destination $destination }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne 'CF3F2FA1FBD4A8D1CBD1C80F7DD8BE2C97096DD69ED7489D8933EA61661CC07A') { throw 'Existing installer differs from the verified release. Rename it and try again.' }; Write-Host 'Verified. Opening the Caprii installer...'; Start-Process -FilePath $destination"
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
echo Open downloads\Caprii-0.5.1 inside the extracted folder.
echo INSTALL-CAPRII.cmd and Caprii-Setup.part01, part02, part03 must be together.
echo Do not run this file from inside the ZIP or download only this CMD file.
echo.
pause
exit /b 1
