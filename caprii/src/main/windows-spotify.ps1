$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
function Output-Result($value) { [Console]::Out.Write(($value | ConvertTo-Json -Depth 8 -Compress)) }
function Spotify-Source([string]$id) {
  return @('Spotify', 'Spotify.exe', 'SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify', 'SpotifyAB.SpotifyMusic_zpdnekdrzrea0!App') -contains $id
}
$stage = 'validate'
try {
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  if (@('inspect','play','pause','next','previous') -notcontains $request.action) { throw 'Unsupported operation' }
  $stage = 'runtime'
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
  $propertiesType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  } | Select-Object -First 1
  function Await-Operation($operation, [Type]$resultType) {
    $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
    if (-not $task.Wait(2500)) { throw 'Windows media request timed out' }
    return $task.GetAwaiter().GetResult()
  }
  if ($null -eq $asTask) { throw 'WinRT task adapter unavailable' }
  $stage = 'manager'
  $manager = Await-Operation ($managerType::RequestAsync()) $managerType
  $stage = 'sessions'
  $sessions = @($manager.GetSessions() | Where-Object { Spotify-Source $_.SourceAppUserModelId })
  if ($sessions.Count -eq 0) { Output-Result @{ok=$false;code='spotify_session_missing'}; exit 0 }
  if ($sessions.Count -ne 1) { Output-Result @{ok=$false;code='spotify_session_ambiguous'}; exit 0 }
  $session = $sessions[0]
  if ($request.sourceAppId -and $request.sourceAppId -cne $session.SourceAppUserModelId) { Output-Result @{ok=$false;code='spotify_session_changed'}; exit 0 }
  function Snapshot {
    $info = $session.GetPlaybackInfo()
    $title = ''; $artist = ''; $album = ''
    try {
      $props = Await-Operation ($session.TryGetMediaPropertiesAsync()) $propertiesType
      $title = [string]$props.Title; $artist = [string]$props.Artist; $album = [string]$props.AlbumTitle
    } catch { }
    $position = $null
    try { $position = [long]$session.GetTimelineProperties().Position.TotalMilliseconds } catch { }
    return @{sourceAppId=[string]$session.SourceAppUserModelId;status=[string]$info.PlaybackStatus;title=$title;artist=$artist;album=$album;positionMs=$position;controls=@{play=[bool]$info.Controls.IsPlayEnabled;pause=[bool]$info.Controls.IsPauseEnabled;next=[bool]$info.Controls.IsNextEnabled;previous=[bool]$info.Controls.IsPreviousEnabled}}
  }
  $stage = 'snapshot'
  $before = Snapshot
  if ($request.action -eq 'inspect') { Output-Result @{ok=$true;session=$before}; exit 0 }
  if ($request.expectedTitle -and ($request.expectedTitle -cne $before.title -or $request.expectedArtist -cne $before.artist)) { Output-Result @{ok=$false;code='spotify_track_changed'}; exit 0 }
  $stage = 'control'
  $already = ($request.action -eq 'play' -and $before.status -eq 'Playing') -or ($request.action -eq 'pause' -and @('Paused','Stopped') -contains $before.status)
  $accepted = $true
  if (-not $already) {
    if (-not $before.controls[$request.action]) { Output-Result @{ok=$false;code='spotify_control_disabled';session=$before}; exit 0 }
    switch ($request.action) {
      'play' { $accepted = Await-Operation ($session.TryPlayAsync()) ([bool]) }
      'pause' { $accepted = Await-Operation ($session.TryPauseAsync()) ([bool]) }
      'next' { $accepted = Await-Operation ($session.TrySkipNextAsync()) ([bool]) }
      'previous' { $accepted = Await-Operation ($session.TrySkipPreviousAsync()) ([bool]) }
    }
  }
  if (-not $accepted) { Output-Result @{ok=$false;code='spotify_control_rejected';session=$before}; exit 0 }
  $observations = @(); $stable = 0
  for ($i=0; $i -lt 8; $i++) {
    Start-Sleep -Milliseconds 300
    $state = Snapshot; $observations += $state
    if ($request.action -eq 'play' -and $state.status -eq 'Playing') { $stable++ }
    elseif ($request.action -eq 'pause' -and @('Paused','Stopped') -contains $state.status) { $stable++ }
    else { $stable=0 }
    if ($stable -ge 2) { break }
    if (@('next','previous') -contains $request.action -and $state.title -and ($state.title -cne $before.title -or $state.artist -cne $before.artist -or $state.album -cne $before.album)) { break }
    if ($request.action -eq 'previous' -and $null -ne $state.positionMs -and $null -ne $before.positionMs -and $state.positionMs -lt ($before.positionMs-1000)) { break }
  }
  Output-Result @{ok=$true;requested=(-not $already);accepted=[bool]$accepted;before=$before;observations=@($observations)}
} catch {
  # No key presses, process activation or fallback to a different media app.
  $rootError=$_.Exception
  while ($rootError.InnerException) { $rootError=$rootError.InnerException }
  Output-Result @{ok=$false;code='windows_media_unavailable';stage=$stage;hresult=([string]$rootError.HResult);kind=$rootError.GetType().FullName}
}
