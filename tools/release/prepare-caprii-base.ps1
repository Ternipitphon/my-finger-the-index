# SPDX-License-Identifier: GPL-3.0-only
# Extract resources as PE data; never execute the downloaded installer.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$folder = Join-Path $root 'release/upstream-base'
[IO.Directory]::CreateDirectory($folder) | Out-Null
function Get-PinnedFile($Name, $Sha256, $Bytes) {
    $file = Join-Path $folder $Name
    & curl.exe --fail --location --retry 3 --max-time 300 --output $file ('https://github.com/CapriChooms/CapriCore/releases/download/v1.2.2/' + $Name)
    if ($LASTEXITCODE -ne 0) { throw ('Download failed: ' + $Name) }
    if ((Get-Item -LiteralPath $file).Length -ne $Bytes -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256) { throw ('Original release checksum mismatch: ' + $Name) }
    return $file
}
$installer = Get-PinnedFile 'CapriSetup-1.2.2.exe' 'f7752a4b4354bbff95f1e6c60163891d5e37d2ad9f10acf2f7c9e6e4465cb2ed' 70262784
$voice = Get-PinnedFile 'capri-en-v1.zip' '0bae63a24f3541dd8945de7ff16f04d250e45f941f9fface358a0ed76ebe71e4' 12522081
Add-Type -AssemblyName System.Reflection.Metadata
Add-Type -AssemblyName System.IO.Compression
$stream = [IO.File]::OpenRead($installer)
$pe = [System.Reflection.PortableExecutable.PEReader]::new($stream)
$found = $false
$archive = Join-Path $folder 'camera.zip'
try {
    $metadata = [System.Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($pe)
    [byte[]]$data = $pe.GetSectionData($pe.PEHeaders.CorHeader.ResourcesDirectory.RelativeVirtualAddress).GetContent()
    foreach ($handle in $metadata.ManifestResources) {
        $resource = $metadata.GetManifestResource($handle)
        if ($metadata.GetString($resource.Name) -ne 'CapriCameraPayload') { continue }
        if (-not $resource.Implementation.IsNil) { throw 'Camera resource must be embedded' }
        $offset = [int]$resource.Offset
        if ($offset -lt 0 -or $offset + 4 -gt $data.Length) { throw 'Invalid camera offset' }
        $length = [BitConverter]::ToInt32($data, $offset)
        if ($length -le 0 -or $length -gt 16777216 -or $offset + 4 + $length -gt $data.Length) { throw 'Invalid camera resource size' }
        $bytes = [byte[]]::new($length)
        [Buffer]::BlockCopy($data, $offset + 4, $bytes, 0, $length)
        [IO.File]::WriteAllBytes($archive, $bytes)
        $found = $true
    }
} finally { $pe.Dispose(); $stream.Dispose() }
if (-not $found) { throw 'Original camera payload is missing' }
$cameraFolder = Join-Path $folder 'camera'
[IO.Directory]::CreateDirectory($cameraFolder) | Out-Null
$expected = @('capri-camera-host.exe', 'capri-camera-x64.dll', 'capri-camera-x86.dll', 'THIRD-PARTY-LICENSES.txt')
$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    if ($zip.Entries.Count -ne $expected.Count) { throw 'Unexpected original camera contents' }
    foreach ($entry in $zip.Entries) {
        if ($entry.FullName -cnotin $expected -or $entry.Length -le 0 -or $entry.Length -gt 16777216) { throw 'Unexpected camera file' }
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $cameraFolder $entry.FullName), $true)
    }
} finally { $zip.Dispose() }
$voiceFolder = Join-Path $folder 'voice'
Expand-Archive -LiteralPath $voice -DestinationPath $voiceFolder -Force
if (-not (Test-Path -LiteralPath (Join-Path $voiceFolder 'voice-profile.json') -PathType Leaf)) { throw 'Voice profile is missing from the original pack' }
@{schemaVersion=1; repository='CapriChooms/CapriCore'; tag='v1.2.2'; installerSha256='f7752a4b4354bbff95f1e6c60163891d5e37d2ad9f10acf2f7c9e6e4465cb2ed'; voiceSha256='0bae63a24f3541dd8945de7ff16f04d250e45f941f9fface358a0ed76ebe71e4'; cameraSha256=(Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant()} | ConvertTo-Json | Set-Content (Join-Path $folder 'provenance.json')
Write-Host 'Verified original camera and English voice pack; original installer was not executed.'
