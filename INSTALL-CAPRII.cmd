@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Close the previous Caprii app before installing 0.5.6.
echo Checking all downloaded parts. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-Item -LiteralPath 'Caprii-Setup.part01').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '9E776796C7EDBADB4835EB7F0931F0BA180F3C21F37932897419012D8498751F') { throw 'Part verification failed. Extract the complete 0.5.6 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part02').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne '59952C3BDFFE606108C230DB15EE529EF8DFA0FAFC915BB2583AD3E86AD1D004') { throw 'Part verification failed. Extract the complete 0.5.6 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part03').Length -ne 57879393 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne 'ABCB4CD4D2B58B5ACA3D6A66391CFDCFEB0A35E31EBD0C3E820A6C64B77E04FC') { throw 'Part verification failed. Extract the complete 0.5.6 download ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.5.6.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining-'+[guid]::NewGuid().ToString('N'); try { $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne '8CD77C25C68F2195C41F6D30CFC5C7AE5C3001066C313630093D3CAF01CB32C7') { throw 'Installer verification failed. Do not run it.' }; Move-Item -LiteralPath $temporary -Destination $destination } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } } }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne '8CD77C25C68F2195C41F6D30CFC5C7AE5C3001066C313630093D3CAF01CB32C7') { throw 'An existing installer differs from this release. Rename it and try again.' }; Write-Host 'Caprii 0.5.6 verified. Opening the Windows installer...'; Start-Process -FilePath $destination"
set "CAPRII_INSTALL_RESULT=%ERRORLEVEL%"
if not "%CAPRII_INSTALL_RESULT%"=="0" (
  echo Verification failed. Read the error above. Do not run an unverified installer.
  pause
)
exit /b %CAPRII_INSTALL_RESULT%
:missing_parts
echo Extract ALL files from the Caprii 0.5.6 Windows ZIP first.
echo Keep INSTALL-CAPRII.cmd and ALL Caprii-Setup.part files in the SAME folder.
pause
exit /b 1
