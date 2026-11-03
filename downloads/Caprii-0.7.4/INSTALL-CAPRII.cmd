@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Close the previous Caprii app before installing 0.7.4.
echo Checking all downloaded parts. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-Item -LiteralPath 'Caprii-Setup.part01').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne 'C1352D4590EF2791860147D97A6D64014B7812CBB5B09C365673AAAD96F07942') { throw 'Part verification failed. Extract the complete 0.7.4 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part02').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne '29984D49886C8C0559C684D52D879CE8C94AE1E477CA2B5978EA99B2CB274894') { throw 'Part verification failed. Extract the complete 0.7.4 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part03').Length -ne 57936029 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne '5A5D97AACF866B0C24963FA9FE2CC5970E7E0E26D5FCBA9DB7DFD625D1054B0E') { throw 'Part verification failed. Extract the complete 0.7.4 download ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.7.4.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining-'+[guid]::NewGuid().ToString('N'); try { $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne 'DCBBFE869049B9323166E7E427C6C37299C1675AE1E665ADAF2D5260035E12C0') { throw 'Installer verification failed. Do not run it.' }; Move-Item -LiteralPath $temporary -Destination $destination } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } } }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne 'DCBBFE869049B9323166E7E427C6C37299C1675AE1E665ADAF2D5260035E12C0') { throw 'An existing installer differs from this release. Rename it and try again.' }; Write-Host 'Caprii 0.7.4 verified. Opening the Windows installer...'; Start-Process -FilePath $destination"
set "CAPRII_INSTALL_RESULT=%ERRORLEVEL%"
if not "%CAPRII_INSTALL_RESULT%"=="0" (
  echo Verification failed. Read the error above. Do not run an unverified installer.
  pause
)
exit /b %CAPRII_INSTALL_RESULT%
:missing_parts
echo Extract ALL files from the Caprii 0.7.4 Windows ZIP first.
echo Keep INSTALL-CAPRII.cmd and ALL Caprii-Setup.part files in the SAME folder.
pause
exit /b 1
