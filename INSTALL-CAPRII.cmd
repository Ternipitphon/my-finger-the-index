@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Close the previous Caprii app before installing 0.7.0.
echo Checking all downloaded parts. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-Item -LiteralPath 'Caprii-Setup.part01').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '0FC7D560973AE4EC280795F605C6907F436F05CF0BB39170672A4CE9E221B685') { throw 'Part verification failed. Extract the complete 0.7.0 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part02').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne 'B12A67414ECB9282CA3FE8992197D613757496949DC7E3BDD1A085E6C6A4888E') { throw 'Part verification failed. Extract the complete 0.7.0 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part03').Length -ne 57921236 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne 'CE28F0482AF9F0A24FD3828CAE723F2225AB11F6D87BF5C5DBC3920317E31905') { throw 'Part verification failed. Extract the complete 0.7.0 download ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.7.0.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining-'+[guid]::NewGuid().ToString('N'); try { $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne '6A5947CA590E5FEFC45FFEDC828C93625F8006C77EFE197FE4A54E6D6A5B2C2F') { throw 'Installer verification failed. Do not run it.' }; Move-Item -LiteralPath $temporary -Destination $destination } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } } }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne '6A5947CA590E5FEFC45FFEDC828C93625F8006C77EFE197FE4A54E6D6A5B2C2F') { throw 'An existing installer differs from this release. Rename it and try again.' }; Write-Host 'Caprii 0.7.0 verified. Opening the Windows installer...'; Start-Process -FilePath $destination"
set "CAPRII_INSTALL_RESULT=%ERRORLEVEL%"
if not "%CAPRII_INSTALL_RESULT%"=="0" (
  echo Verification failed. Read the error above. Do not run an unverified installer.
  pause
)
exit /b %CAPRII_INSTALL_RESULT%
:missing_parts
echo Extract ALL files from the Caprii 0.7.0 Windows ZIP first.
echo Keep INSTALL-CAPRII.cmd and ALL Caprii-Setup.part files in the SAME folder.
pause
exit /b 1
