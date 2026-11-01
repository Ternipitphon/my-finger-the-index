@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Checking downloaded files. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '99D3D99FCA73D7C42A81917D98ADBC0079E2632630EE99613F96DC01D5749137') { throw 'Part verification failed. Download and extract the whole repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne 'A7BDA3E17E088DC50DBA3B043CCF1C7FD46F9ECC8D481C193899BDEB0718605F') { throw 'Part verification failed. Download and extract the whole repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne 'DA0CD1BABA3D60C8C9908BB1A7207925CC20B6E7D3C1318C44D4BB31D627FA08') { throw 'Part verification failed. Download and extract the whole repository ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.5.5.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining'; $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne 'B64E0F042EB1DACB0BCF23FD8840C5DAA6562F84B18C56764AA698CCB7161F89') { throw 'Installer verification failed. Do not run this file.' }; Move-Item -LiteralPath $temporary -Destination $destination }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne 'B64E0F042EB1DACB0BCF23FD8840C5DAA6562F84B18C56764AA698CCB7161F89') { throw 'Existing installer differs from verified release. Rename it and try again.' }; Write-Host 'Verified. Opening installer...'; Start-Process -FilePath $destination"
set "CAPRII_INSTALL_RESULT=%ERRORLEVEL%"
if not "%CAPRII_INSTALL_RESULT%"=="0" (
  echo Verification failed. Read the error above. Do not run an unverified installer.
  pause
)
exit /b %CAPRII_INSTALL_RESULT%
:missing_parts
echo Download the WHOLE repository ZIP and Extract All first.
echo Open downloads\Caprii-0.5.5 and keep INSTALL-CAPRII.cmd with ALL installer parts.
echo Required parts: Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03
pause
exit /b 1
