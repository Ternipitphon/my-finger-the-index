@echo off
setlocal
set "CAPRII_INSTALL_ROOT=%~dp0"
for %%F in (Caprii-Setup.part01 Caprii-Setup.part02 Caprii-Setup.part03) do (
  if not exist "%~dp0%%F" goto missing_parts
)
echo Checking downloaded files. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; Set-Location -LiteralPath $env:CAPRII_INSTALL_ROOT; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '2E575EEBF276ECDD5A3955246A4BB2A80350024BE8610084B39982E5E5F857FE') { throw 'Part 1 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne 'FFE6D80ADA08ACC9D2A6C5361A32E59CD281C86D91F3720253E8E73B83615FC3') { throw 'Part 2 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne 'BBD01DBFB28E66C153584BE494AE7E99007F9EAED7D06F6D303756F4680ECA30') { throw 'Part 3 is incomplete or corrupted. Download the repository ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.5.0.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining'; $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne '436423253EFAD927B831DDC40E56399D1E2C2BABB80A4AFF6CE8CD1E3EF70C55') { throw 'Installer verification failed. Do not run this file.' }; Move-Item -LiteralPath $temporary -Destination $destination }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne '436423253EFAD927B831DDC40E56399D1E2C2BABB80A4AFF6CE8CD1E3EF70C55') { throw 'Existing installer differs from the verified release. Rename it and try again.' }; Write-Host 'Verified. Opening the Caprii installer...'; Start-Process -FilePath $destination"
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
echo Open downloads\Caprii-0.5.0 inside the extracted folder.
echo INSTALL-CAPRII.cmd and Caprii-Setup.part01, part02, part03 must be together.
echo Do not run this file from inside the ZIP or download only this CMD file.
echo.
pause
exit /b 1
