param([switch]$Library)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
function Get-CapriiSpotifyParts($container) {
 $children = $container.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
 $texts = @(); $buttons = @(); $transport = $false
 foreach ($child in $children) {
  $info = $child.Current
  if ($info.IsPassword -or $info.IsOffscreen -or -not $info.IsEnabled) { continue }
  if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Slider -or ($info.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $info.Name -match '^(Next|Previous|Shuffle|Repeat|Mute|Volume|เพลงถัดไป|เพลงก่อนหน้า|สุ่ม|เล่นซ้ำ|ระดับเสียง)')) { $transport = $true }
  if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Text -or $info.ControlType -eq [System.Windows.Automation.ControlType]::Hyperlink) {
   if ($info.Name -and $info.Name.Length -le 500) { $texts += $info.Name }
  }
  if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $info.Name -match '^(Play( |$)|เล่น( |$))') {
   $pattern = $null
   if ($child.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)) { $buttons += $child }
  }
 }
 return @{texts=@($texts | Select-Object -Unique);buttons=@($buttons);transport=$transport;size=$children.Count}
}
function New-CapriiSpotifyCandidate($node,$parts,$kind) {
 $button=$null;$buttonId=$null;$buttonName=$null
 if ($parts.buttons.Count -eq 1) { $button=$parts.buttons[0];$buttonId=($button.GetRuntimeId() -join ',');$buttonName=$button.Current.Name }
 return @{id=($node.GetRuntimeId() -join ',');kind=$kind;texts=@($parts.texts);button=$buttonId;buttonName=$buttonName;top=$node.Current.BoundingRectangle.Top;left=$node.Current.BoundingRectangle.Left;playNode=$button}
}
function Get-CapriiSpotifyCandidates($root,[string]$query) {
 $results=New-Object System.Collections.ArrayList
 $rows=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::DataItem))
 foreach ($row in $rows) {
  if ($results.Count -ge 60) { break }
  if ($row.Current.IsOffscreen -or -not $row.Current.IsEnabled) { continue }
  $parts=Get-CapriiSpotifyParts $row
  if ($parts.texts.Count) { [void]$results.Add((New-CapriiSpotifyCandidate $row $parts 'row')) }
 }
 # Top-result cards expose their Play outside the DataItem song rows.
 # Find its nearest small ancestor with this exact title, never the footer transport.
 $allButtons=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Button))
 $walker=[System.Windows.Automation.TreeWalker]::ControlViewWalker
 foreach ($button in $allButtons) {
  if ($results.Count -ge 60) { break }
  if ($button.Current.IsOffscreen -or -not $button.Current.IsEnabled -or $button.Current.Name -notmatch '^(Play( |$)|เล่น( |$))') { continue }
  $node=$button
  for ($depth=0;$depth -lt 5;$depth++) {
   $node=$walker.GetParent($node)
   if ($null -eq $node -or $node.Equals($root)) { break }
   $type=$node.Current.ControlType
   if ($type -eq [System.Windows.Automation.ControlType]::DataItem -or $type -eq [System.Windows.Automation.ControlType]::Document -or $type -eq [System.Windows.Automation.ControlType]::Window) { break }
   $parts=Get-CapriiSpotifyParts $node
   if ($parts.transport -or $parts.size -gt 80) { break }
   $sameTitle=@($parts.texts | Where-Object { $_.Normalize([Text.NormalizationForm]::FormKC).Trim() -ieq $query.Normalize([Text.NormalizationForm]::FormKC).Trim() })
   if ($sameTitle.Count -eq 0) { continue }
   if ($parts.buttons.Count -ne 1 -or -not $parts.buttons[0].Equals($button)) { break }
   $candidate=New-CapriiSpotifyCandidate $node $parts 'card'
   if (-not @($results | Where-Object { $_.button -eq $candidate.button }).Count) { [void]$results.Add($candidate) }
   break
  }
 }
 # Screen positions only establish order. They are never used as click coordinates.
 $ordered=@($results | Sort-Object top,left)
 for ($i=0;$i -lt $ordered.Count;$i++) { $ordered[$i].order=$i }
 return $ordered
}
function ConvertTo-CapriiSpotifyPublic($candidate) {
 return @{id=$candidate.id;kind=$candidate.kind;order=$candidate.order;texts=@($candidate.texts);button=$candidate.button;buttonName=$candidate.buttonName}
}
function Invoke-CapriiSpotifyCandidate($candidates,$expected,[scriptblock]$guard) {
 $matches=@($candidates | Where-Object { $_.id -ceq $expected.id })
 if ($matches.Count -ne 1) { throw 'Search result no longer visible' }
 $candidate=$matches[0]
 if ($null -eq $candidate.playNode -or $candidate.kind -cne $expected.kind -or $candidate.order -ne $expected.order -or $candidate.button -cne $expected.button -or $candidate.buttonName -cne $expected.buttonName -or (($candidate.texts | ConvertTo-Json -Compress) -cne ($expected.texts | ConvertTo-Json -Compress))) { throw 'Search result changed' }
 & $guard
 $candidate.playNode.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
}
if ($Library) { return }
try {
 $request=[Console]::In.ReadToEnd() | ConvertFrom-Json
 if ($request.kind -notin @('inspect','invoke') -or $request.query -isnot [string] -or -not $request.query.Trim() -or $request.query.Length -gt 300) { throw 'Unsupported search operation' }
 $windows=@(Get-Process -Name Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 })
 if ($windows.Count -ne 1) { throw 'Spotify window missing or ambiguous' }
 $process=$windows[0]
 $identity="$($process.Id):$($process.StartTime.ToUniversalTime().Ticks):$($process.MainWindowHandle)"
 if ($request.kind -eq 'invoke' -and $request.window -cne $identity) { throw 'Spotify window changed' }
 $root=[System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
 $candidates=@(Get-CapriiSpotifyCandidates $root $request.query)
 if ($request.kind -eq 'inspect') {
  @{ok=$true;window=$identity;rows=@($candidates | ForEach-Object { ConvertTo-CapriiSpotifyPublic $_ })} | ConvertTo-Json -Depth 6 -Compress
 } else {
  Invoke-CapriiSpotifyCandidate $candidates $request.row {
   $fresh=Get-Process -Id $process.Id
   if ("$($fresh.Id):$($fresh.StartTime.ToUniversalTime().Ticks):$($fresh.MainWindowHandle)" -cne $identity) { throw 'Spotify window changed' }
  }
  @{ok=$true;invoked=$true} | ConvertTo-Json -Compress
 }
} catch {
 @{ok=$false;code='spotify_search_ui_unavailable'} | ConvertTo-Json -Compress
}
