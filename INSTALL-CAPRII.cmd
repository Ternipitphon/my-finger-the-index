@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Close the previous Caprii app before installing 0.7.6.
echo Checking all downloaded parts. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-Item -LiteralPath 'Caprii-Setup.part01').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne 'A5EC300DCC5D8AB18847880A898BE601D73C1F841EB0AE3EE969476AE3B83619') { throw 'Part verification failed. Extract the complete 0.7.6 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part02').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne 'FED3CE8A8DF36B069242439B2804DA738B23F5A225C796F128736A2A4DDA995A') { throw 'Part verification failed. Extract the complete 0.7.6 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part03').Length -ne 57942863 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne '55AC2FF3CDC3735D7EFCA85252116312DFF719CD92845DD487EFD74021E940E0') { throw 'Part verification failed. Extract the complete 0.7.6 download ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.7.6.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining-'+[guid]::NewGuid().ToString('N'); try { $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne 'DAD59A1DB471DD27F3EA502E307D10A104722D991BFE87817B6F600C5D302D7A') { throw 'Installer verification failed. Do not run it.' }; Move-Item -LiteralPath $temporary -Destination $destination } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } } }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne 'DAD59A1DB471DD27F3EA502E307D10A104722D991BFE87817B6F600C5D302D7A') { throw 'An existing installer differs from this release. Rename it and try again.' }; Write-Host 'Caprii 0.7.6 verified. Opening the Windows installer...'; Start-Process -FilePath $destination"
set "CAPRII_INSTALL_RESULT=%ERRORLEVEL%"
if not "%CAPRII_INSTALL_RESULT%"=="0" (
  echo Verification failed. Read the error above. Do not run an unverified installer.
  pause
)
exit /b %CAPRII_INSTALL_RESULT%
:missing_parts
echo Extract ALL files from the Caprii 0.7.6 Windows ZIP first.
echo Keep INSTALL-CAPRII.cmd and ALL Caprii-Setup.part files in the SAME folder.
pause
exit /b 1
