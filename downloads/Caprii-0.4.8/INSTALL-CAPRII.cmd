@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Checking downloaded files. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '26014F5CB0EAAE019848233296F364A2CFEBCE4CB7463660A3475878DA9CBCCE') { throw 'Part 1 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne '188A0399EA6399318127DE7CD7D9B5FA31D522995163D46B9D51BF335F87EE2F') { throw 'Part 2 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne 'FD0B94CAF324A92FFFADE9A14E062A29D89E09C3687D1F524DA8DA39E6618F04') { throw 'Part 3 is incomplete or corrupted. Download the repository ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.4.8.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining'; $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne '044B9256AC89B9BF69B393AC2FF3B99E696DEFF473DA6DB614F78048401FE917') { throw 'Installer verification failed. Do not run this file.' }; Move-Item -LiteralPath $temporary -Destination $destination }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne '044B9256AC89B9BF69B393AC2FF3B99E696DEFF473DA6DB614F78048401FE917') { throw 'Existing installer differs from the verified release. Rename it and try again.' }; Write-Host 'Verified. Opening the Caprii installer...'; Start-Process -FilePath $destination"
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
echo Open downloads\Caprii-0.4.8 inside the extracted folder.
echo INSTALL-CAPRII.cmd and Caprii-Setup.part01, part02, part03 must be together.
echo Do not run this file from inside the ZIP or download only this CMD file.
echo.
pause
exit /b 1
