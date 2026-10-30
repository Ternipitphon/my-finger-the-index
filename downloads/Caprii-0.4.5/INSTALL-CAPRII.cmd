@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1
echo Checking downloaded files. Please wait...
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part01' -Algorithm SHA256).Hash -ne '863392374197C455FD2D3AC7EB1D2DC4A81071602F24A3DB0421D151A22261B0') { throw 'Part 1 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part02' -Algorithm SHA256).Hash -ne 'CE0129E344DC7BDA81FA37D3F6177C3EDAC716FC2646ED9AFA3C6C0A05203E32') { throw 'Part 2 is incomplete or corrupted. Download the repository ZIP again.' }; if ((Get-FileHash -LiteralPath 'Caprii-Setup.part03' -Algorithm SHA256).Hash -ne '9827DEDAF54CE0E250CF2674FBCE8942D6ADD20AD5E3263716F840DAC8196466') { throw 'Part 3 is incomplete or corrupted. Download the repository ZIP again.' }; $destination=Join-Path (Get-Location) 'Caprii-Agent-Setup-0.4.5.exe'; if (-not (Test-Path -LiteralPath $destination)) { $temporary=$destination+'.joining'; $output=[IO.File]::Open($temporary,[IO.FileMode]::CreateNew); try { foreach ($part in @('Caprii-Setup.part01','Caprii-Setup.part02','Caprii-Setup.part03')) { $inputFile=[IO.File]::OpenRead((Join-Path (Get-Location) $part)); try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() } } } finally { $output.Dispose() }; if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne '58D97F642C8285DDFF48875AA292923304A5A003BD810367A7B4847613CC45C1') { throw 'Installer verification failed. Do not run this file.' }; Move-Item -LiteralPath $temporary -Destination $destination }; if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne '58D97F642C8285DDFF48875AA292923304A5A003BD810367A7B4847613CC45C1') { throw 'Existing installer differs from the verified release. Rename it and try again.' }; Write-Host 'Verified. Opening the Caprii installer...'; Start-Process -FilePath $destination"
if errorlevel 1 (
 echo Could not assemble or verify the installer. Keep this window open and check the error above.
 pause
)
popd
