@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Close the previous Caprii app before installing 0.5.7.
echo Checking all downloaded parts. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-Item -LiteralPath 'Caprii-Setup.part01').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '3093FE637C0FA89664E3D097C2DB5ED64599A0EF0100457FCA9EF483BE2641BC') { throw 'Part verification failed. Extract the complete 0.5.7 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part02').Length -ne 62914560 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne 'AA9B64C422A8055674FBB62C1FA64BFD0D9E1549E7206F1B6D34802AF68B8372') { throw 'Part verification failed. Extract the complete 0.5.7 download ZIP again.' }; if ((Get-Item -LiteralPath 'Caprii-Setup.part03').Length -ne 57891214 -or (Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne '7691E9874481A69283949F57F05AABCB39EF8097C50B7BD9E2D41D6063A13542') { throw 'Part verification failed. Extract the complete 0.5.7 download ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.5.7.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining-'+[guid]::NewGuid().ToString('N'); try { $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne 'BB114F894BEE2563F81091BAC8BC795E47D5ACCCBAE541ABF545BCB8430A5E73') { throw 'Installer verification failed. Do not run it.' }; Move-Item -LiteralPath $temporary -Destination $destination } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } } }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne 'BB114F894BEE2563F81091BAC8BC795E47D5ACCCBAE541ABF545BCB8430A5E73') { throw 'An existing installer differs from this release. Rename it and try again.' }; Write-Host 'Caprii 0.5.7 verified. Opening the Windows installer...'; Start-Process -FilePath $destination"
set "CAPRII_INSTALL_RESULT=%ERRORLEVEL%"
if not "%CAPRII_INSTALL_RESULT%"=="0" (
  echo Verification failed. Read the error above. Do not run an unverified installer.
  pause
)
exit /b %CAPRII_INSTALL_RESULT%
:missing_parts
echo Extract ALL files from the Caprii 0.5.7 Windows ZIP first.
echo Keep INSTALL-CAPRII.cmd and ALL Caprii-Setup.part files in the SAME folder.
pause
exit /b 1
