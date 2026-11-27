param([switch]$Library)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
function ConvertTo-CapriiSongTitle([string]$value) {
 return ($value.Normalize([Text.NormalizationForm]::FormKC).ToLowerInvariant() -replace '[‘’]',"'" -replace '[“”]','"' -replace '[\s\u200B-\u200D]','')
}
function Get-CapriiSpotifyPlayAction($node) {
 $info=$node.Current
 if ($info.IsPassword -or $info.IsOffscreen -or -not $info.IsEnabled) { return $null }
 $legacy=$null
 $hasLegacy=$node.TryGetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern,[ref]$legacy)
 $label=[string]$info.Name;if (-not $label -and $hasLegacy) { $label=[string]$legacy.Current.Name }
 if ($label -notmatch '^(Play(\s|$)|เล่น(?:เพลง)?(?:\s|$))') { return $null }
 if ($info.ControlType -ne [System.Windows.Automation.ControlType]::Button -and -not ($hasLegacy -and $legacy.Current.Role -eq 43)) { return $null }
 $invoke=$null
 if ($node.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$invoke)) { return @{method='invoke';defaultAction='';label=$label} }
 # Explicit MSAA button default action only; never keyboard/mouse fallback or a row selection.
 if ($hasLegacy -and $legacy.Current.Role -eq 43 -and $legacy.Current.DefaultAction -match 'Press|Click|Play|กด|คลิก|เล่น') { return @{method='legacy';defaultAction=[string]$legacy.Current.DefaultAction;label=$label} }
 return $null
}
function Get-CapriiSpotifySearchField($root,[string]$query) {
 if ($query -notmatch '\s') { return $null }
 $matches=@();$edits=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Edit))
 foreach ($edit in $edits) {
  $info=$edit.Current
  if ($info.IsPassword -or $info.IsOffscreen -or -not $info.IsEnabled) { continue }
  $pattern=$null
  if (-not $edit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$pattern) -or $pattern.Current.IsReadOnly) { continue }
  $value=[string]$pattern.Current.Value
  # Only repair a known encoding of this exact query, never an unrelated search/edit field.
  $plus=$query -replace '\s+','+'
  $encoded=[Uri]::EscapeDataString($query)
  if ($value -ine $plus -and $value -ine $encoded) { continue }
  $matches+=@{id=($edit.GetRuntimeId() -join ',');value=$value;needsCorrection=$true;node=$edit}
 }
 if ($matches.Count -eq 1) { return $matches[0] }
 return $null
}
function Set-CapriiSpotifySearch($root,$expected,[string]$query,[scriptblock]$guard) {
 $field=Get-CapriiSpotifySearchField $root $query
 if ($null -eq $field -or $field.id -cne $expected.id -or $field.value -cne $expected.value) { throw 'Search field changed' }
 & $guard
 $pattern=$field.node.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
 $pattern.SetValue($query)
 if ($pattern.Current.Value -cne $query) { throw 'Search input unconfirmed' }
}
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
  if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Button -or $info.ControlType -eq [System.Windows.Automation.ControlType]::Custom) { if ($null -ne (Get-CapriiSpotifyPlayAction $child)) { $buttons += $child } }
 }
 return @{texts=@($texts | Select-Object -Unique);buttons=@($buttons);transport=$transport;size=$children.Count}
}
function New-CapriiSpotifyCandidate($node,$parts,$kind) {
 $button=$null;$buttonId=$null;$buttonName=$null;$action=$null;$defaultAction=''
 if ($parts.buttons.Count -eq 1) { $button=$parts.buttons[0];$buttonId=($button.GetRuntimeId() -join ',');$support=Get-CapriiSpotifyPlayAction $button;$buttonName=$support.label;$action=$support.method;$defaultAction=$support.defaultAction }
 return @{id=($node.GetRuntimeId() -join ',');kind=$kind;action=$action;defaultAction=$defaultAction;texts=@($parts.texts);button=$buttonId;buttonName=$buttonName;top=$node.Current.BoundingRectangle.Top;left=$node.Current.BoundingRectangle.Left;playNode=$button}
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
 $allButtons=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.OrCondition]::new([System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Button),[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Custom)))
 $walker=[System.Windows.Automation.TreeWalker]::ControlViewWalker
 foreach ($button in $allButtons) {
  if ($results.Count -ge 60) { break }
  if ($null -eq (Get-CapriiSpotifyPlayAction $button)) { continue }
  $node=$button
  for ($depth=0;$depth -lt 12;$depth++) {
   $node=$walker.GetParent($node)
   if ($null -eq $node -or $node.Equals($root)) { break }
   $type=$node.Current.ControlType
   if ($type -eq [System.Windows.Automation.ControlType]::DataItem -or $type -eq [System.Windows.Automation.ControlType]::Document -or $type -eq [System.Windows.Automation.ControlType]::Window) { break }
   $parts=Get-CapriiSpotifyParts $node
   if ($parts.transport -or $parts.size -gt 80) { break }
   $sameTitle=@($parts.texts | Where-Object { (ConvertTo-CapriiSongTitle $_) -ceq (ConvertTo-CapriiSongTitle $query) })
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
 return @{id=$candidate.id;kind=$candidate.kind;action=$candidate.action;defaultAction=$candidate.defaultAction;order=$candidate.order;texts=@($candidate.texts);button=$candidate.button;buttonName=$candidate.buttonName}
}
function Invoke-CapriiSpotifyCandidate($candidates,$expected,[scriptblock]$guard) {
 $matches=@($candidates | Where-Object { $_.id -ceq $expected.id })
 if ($matches.Count -ne 1) { throw 'Search result no longer visible' }
 $candidate=$matches[0]
 if ($null -eq $candidate.playNode -or $candidate.kind -cne $expected.kind -or $candidate.action -cne $expected.action -or $candidate.defaultAction -cne $expected.defaultAction -or $candidate.order -ne $expected.order -or $candidate.button -cne $expected.button -or $candidate.buttonName -cne $expected.buttonName -or (($candidate.texts | ConvertTo-Json -Compress) -cne ($expected.texts | ConvertTo-Json -Compress))) { throw 'Search result changed' }
 & $guard
 if ($candidate.action -eq 'invoke') { $candidate.playNode.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() }
 elseif ($candidate.action -eq 'legacy') { $candidate.playNode.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern).DoDefaultAction() }
 else { throw 'Unsupported Play action' }
}
if ($Library) { return }
try {
 $request=[Console]::In.ReadToEnd() | ConvertFrom-Json
 if ($request.kind -notin @('inspect','invoke','prepare') -or $request.query -isnot [string] -or -not $request.query.Trim() -or $request.query.Length -gt 300) { throw 'Unsupported search operation' }
 $windows=@(Get-Process -Name Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 })
 if ($windows.Count -ne 1) { throw 'Spotify window missing or ambiguous' }
 $process=$windows[0]
 $identity="$($process.Id):$($process.StartTime.ToUniversalTime().Ticks):$($process.MainWindowHandle)"
 if ($request.kind -in @('invoke','prepare') -and $request.window -cne $identity) { throw 'Spotify window changed' }
 $root=[System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
 $searchQuery=$request.query
 if ($request.searchQuery -is [string] -and $request.searchQuery.Length -le 601) { $searchQuery=$request.searchQuery }
 $guard={
  $fresh=Get-Process -Id $process.Id
  if ("$($fresh.Id):$($fresh.StartTime.ToUniversalTime().Ticks):$($fresh.MainWindowHandle)" -cne $identity) { throw 'Spotify window changed' }
 }
 if ($request.kind -eq 'prepare') { Set-CapriiSpotifySearch $root $request.field $searchQuery $guard;@{ok=$true;confirmed=$true}|ConvertTo-Json -Compress;exit }
 $candidates=@(Get-CapriiSpotifyCandidates $root $request.query)
 if ($request.kind -eq 'inspect') {
  $search=Get-CapriiSpotifySearchField $root $searchQuery
  $publicSearch=$null;if ($null -ne $search) { $publicSearch=@{id=$search.id;value=$search.value;needsCorrection=$true} }
  @{ok=$true;window=$identity;search=$publicSearch;rows=@($candidates | ForEach-Object { ConvertTo-CapriiSpotifyPublic $_ })} | ConvertTo-Json -Depth 6 -Compress
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
