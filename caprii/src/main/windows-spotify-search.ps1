$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
 $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
 if ($request.kind -notin @('inspect','invoke')) { throw 'Unsupported search operation' }
 Add-Type -AssemblyName UIAutomationClient
 Add-Type -AssemblyName UIAutomationTypes
 $windows = @(Get-Process -Name Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 })
 if ($windows.Count -ne 1) { throw 'Spotify window missing or ambiguous' }
 $process = $windows[0]
 $identity = "$($process.Id):$($process.StartTime.ToUniversalTime().Ticks):$($process.MainWindowHandle)"
 if ($request.kind -eq 'invoke' -and $request.window -cne $identity) { throw 'Spotify window changed' }
 $root = [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
 $rows = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::DataItem))
 $results = @()
 foreach ($row in $rows) {
  if ($results.Count -ge 60) { break }
  if ($row.Current.IsOffscreen -or -not $row.Current.IsEnabled) { continue }
  $children = $row.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
  $texts = @(); $buttons = @()
  foreach ($child in $children) {
   $info = $child.Current
   if ($info.IsPassword -or $info.IsOffscreen -or -not $info.IsEnabled) { continue }
   if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Text -or $info.ControlType -eq [System.Windows.Automation.ControlType]::Hyperlink) {
    if ($info.Name -and $info.Name.Length -le 500) { $texts += $info.Name }
   }
   if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $info.Name -match '^(Play( |$)|เล่น( |$))') {
    $pattern = $null
    if ($child.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)) { $buttons += $child }
   }
  }
  if ($texts.Count -eq 0 -or $buttons.Count -ne 1) { continue }
  $button = $buttons[0]
  $record = @{id=($row.GetRuntimeId() -join ',');texts=@($texts | Select-Object -Unique);button=($button.GetRuntimeId() -join ',');buttonName=$button.Current.Name}
  if ($request.kind -eq 'invoke' -and $record.id -ceq $request.row.id) {
   if ($record.button -cne $request.row.button -or $record.buttonName -cne $request.row.buttonName -or (($record.texts | ConvertTo-Json -Compress) -cne ($request.row.texts | ConvertTo-Json -Compress))) { throw 'Search result changed' }
   # Recheck process lifetime and window immediately before the single invocation.
   $fresh = Get-Process -Id $process.Id
   if ("$($fresh.Id):$($fresh.StartTime.ToUniversalTime().Ticks):$($fresh.MainWindowHandle)" -cne $identity) { throw 'Spotify window changed' }
   $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
   @{ok=$true;invoked=$true} | ConvertTo-Json -Compress
   exit
  }
  $results += $record
 }
 if ($request.kind -eq 'invoke') { throw 'Search result no longer visible' }
 @{ok=$true;window=$identity;rows=@($results)} | ConvertTo-Json -Depth 6 -Compress
} catch {
 @{ok=$false;code='spotify_search_ui_unavailable'} | ConvertTo-Json -Compress
}
