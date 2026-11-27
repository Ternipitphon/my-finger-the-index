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
 $label=[string]$info.Name
 # Normal Invoke must not depend on optional legacy pattern types in a particular .NET runtime.
 if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $label -match '^(Play(\s|$)|เล่น(?:เพลง)?(?:\s|$))') {
  $invoke=$null
  if ($node.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$invoke)) { return @{method='invoke';defaultAction='';label=$label} }
 }
 $legacyType='System.Windows.Automation.LegacyIAccessiblePattern' -as [type]
 if ($null -eq $legacyType) { return $null }
 $legacy=$null
 if (-not $node.TryGetCurrentPattern($legacyType::Pattern,[ref]$legacy) -or $legacy.Current.Role -ne 43) { return $null }
 if (-not $label) { $label=[string]$legacy.Current.Name }
 if ($label -notmatch '^(Play(\s|$)|เล่น(?:เพลง)?(?:\s|$))') { return $null }
 if ($legacy.Current.DefaultAction -match 'Press|Click|Play|กด|คลิก|เล่น') { return @{method='legacy';defaultAction=[string]$legacy.Current.DefaultAction;label=$label} }
 return $null
}
function Get-CapriiSpotifySearchField($root,[string]$query) {
 if ($query -notmatch '\s') { return $null }
 $fields=@();$edits=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Edit))
 foreach ($edit in $edits) {
  $info=$edit.Current
  if ($info.IsPassword -or $info.IsOffscreen -or -not $info.IsEnabled) { continue }
  if ($info.Name -notmatch 'Search|ค้นหา|ต้องการ.*(?:เล่น|ฟัง)|อยาก.*(?:เล่น|ฟัง)' -and $info.AutomationId -notmatch 'search') { continue }
  $pattern=$null
  if (-not $edit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$pattern) -or $pattern.Current.IsReadOnly) { continue }
  $value=[string]$pattern.Current.Value
  # Only repair a known encoding of this exact query, never an unrelated search/edit field.
  $plus=$query -replace '\s+','+'
  $encoded=[Uri]::EscapeDataString($query)
  if ($value -ine $plus -and $value -ine $encoded) { continue }
  $fields+=@{id=($edit.GetRuntimeId() -join ',');value=$value;needsCorrection=$true;node=$edit}
 }
 if ($fields.Count -eq 1) { return $fields[0] }
 return $null
}
function Set-CapriiSpotifySearch($root,$expected,[string]$query,[scriptblock]$guard) {
 $field=Get-CapriiSpotifySearchField $root $query
 if ($null -eq $field -or $field.id -cne $expected.id -or $field.value -cne $expected.value) { throw 'Search field changed' }
 & $guard
 $pattern=$field.node.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
 $pattern.SetValue($query)
 # The accessibility provider may apply SetValue asynchronously. Read only; never type twice.
 for ($i=0;$i -lt 10;$i++) {
  $freshPattern=$field.node.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
  if ($freshPattern.Current.Value -ceq $query) { return }
  Start-Sleep -Milliseconds 80
 }
 throw 'Search input unconfirmed'
}
function Get-CapriiSpotifyParts($container,[string]$query) {
 $children = $container.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
 $texts = @(); $buttons = @(); $transport = $false; $detailsPanel=$false; $textPositions=@()
 foreach ($child in $children) {
  $info = $child.Current
  if ($info.IsPassword -or $info.IsOffscreen -or -not $info.IsEnabled) { continue }
  if ($info.Name -match '^(Credits|เครดิต|Lyrics|เนื้อเพลง|About the artist|เกี่ยวกับศิลปิน)$' -and (ConvertTo-CapriiSongTitle $info.Name) -cne (ConvertTo-CapriiSongTitle $query)) { $detailsPanel=$true }
  if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Slider -or ($info.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $info.Name -match '^(Next|Previous|Shuffle|Repeat|Mute|Volume|เพลงถัดไป|เพลงก่อนหน้า|สุ่ม|เล่นซ้ำ|ระดับเสียง)')) { $transport = $true }
  if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Text -or $info.ControlType -eq [System.Windows.Automation.ControlType]::Hyperlink) {
   if ($info.Name -and $info.Name.Length -le 500) { $texts += $info.Name;$box=$info.BoundingRectangle;if (-not $box.IsEmpty -and $box.Width -gt 0 -and $box.Height -gt 0 -and -not [double]::IsInfinity($box.Top)) { $textPositions+=@{text=$info.Name;top=$box.Top;left=$box.Left} } }
  }
  if ($info.ControlType -eq [System.Windows.Automation.ControlType]::Button -or $info.ControlType -eq [System.Windows.Automation.ControlType]::Custom) { if ($null -ne (Get-CapriiSpotifyPlayAction $child)) { $buttons += $child } }
 }
 return @{texts=@($texts | Select-Object -Unique);buttons=@($buttons);transport=$transport;detailsPanel=$detailsPanel;positions=@($textPositions);size=$children.Count}
}
function New-CapriiSpotifyCandidate($node,$parts,$kind,[string]$query) {
 $button=$null;$buttonId=$null;$buttonName=$null;$action=$null;$defaultAction=''
 if ($parts.buttons.Count -eq 1) { $button=$parts.buttons[0];$buttonId=($button.GetRuntimeId() -join ',');$support=Get-CapriiSpotifyPlayAction $button;$buttonName=$support.label;$action=$support.method;$defaultAction=$support.defaultAction }
 $titlePositions=@($parts.positions | Where-Object { (ConvertTo-CapriiSongTitle $_.text) -ceq (ConvertTo-CapriiSongTitle $query) } | Sort-Object top,left)
 if ($parts.texts.Count -lt 2 -or $titlePositions.Count -eq 0) { return $null }
 # A container spanning several same-title songs is not one selectable song.
 if ($titlePositions[-1].top-$titlePositions[0].top -gt 24) { return $null }
 $anchor=@($titlePositions | Select-Object -First 1)
 if ($anchor.Count -ne 1) { return $null }
 return @{id=($node.GetRuntimeId() -join ',');kind=$kind;action=$action;defaultAction=$defaultAction;texts=@($parts.texts);button=$buttonId;buttonName=$buttonName;top=$anchor[0].top;left=$anchor[0].left;playNode=$button}
}
function Test-CapriiSpotifyPlayerRegion($node,$root) {
 $walker=[System.Windows.Automation.TreeWalker]::ControlViewWalker
 for ($i=0;$i -lt 16 -and $null -ne $node -and -not $node.Equals($root);$i++) {
  $info=$node.Current
  if ($info.ControlType -ne [System.Windows.Automation.ControlType]::Window -and ($info.Name -match '^(Now playing|Currently playing|(?:มุมมอง|แถบ|แผง)?\s*กำลังเล่น|Lyrics|เนื้อเพลง|Credits|เครดิต|About the artist|เกี่ยวกับศิลปิน)(\b|$)' -or $info.AutomationId -match 'now.?playing|lyrics|credits')) { return $true }
  $node=$walker.GetParent($node)
 }
 return $false
}
function Get-CapriiSpotifyCandidates($root,[string]$query) {
 $results=New-Object System.Collections.ArrayList
 $rows=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::DataItem))
 foreach ($row in $rows) {
  if ($results.Count -ge 60) { break }
  if ($row.Current.IsOffscreen -or -not $row.Current.IsEnabled -or (Test-CapriiSpotifyPlayerRegion $row $root)) { continue }
  $parts=Get-CapriiSpotifyParts $row $query
  if ($parts.texts.Count -and -not $parts.transport -and -not $parts.detailsPanel) { $candidate=New-CapriiSpotifyCandidate $row $parts 'row' $query;if ($null -ne $candidate) { [void]$results.Add($candidate) } }
 }
 # Top-result cards expose their Play outside the DataItem song rows.
 # Find its nearest small ancestor with this exact title, never the footer transport.
 $allButtons=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.OrCondition]::new([System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Button),[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Custom)))
 $walker=[System.Windows.Automation.TreeWalker]::ControlViewWalker
 foreach ($button in $allButtons) {
  if ($results.Count -ge 60) { break }
  if ($null -eq (Get-CapriiSpotifyPlayAction $button) -or (Test-CapriiSpotifyPlayerRegion $button $root)) { continue }
  $node=$button
  for ($depth=0;$depth -lt 12;$depth++) {
   $node=$walker.GetParent($node)
   if ($null -eq $node -or $node.Equals($root)) { break }
   $type=$node.Current.ControlType
   if ($type -eq [System.Windows.Automation.ControlType]::DataItem -or $type -eq [System.Windows.Automation.ControlType]::Document -or $type -eq [System.Windows.Automation.ControlType]::Window) { break }
   $parts=Get-CapriiSpotifyParts $node $query
   if ($parts.transport -or $parts.detailsPanel -or $parts.size -gt 80) { break }
   $sameTitle=@($parts.texts | Where-Object { (ConvertTo-CapriiSongTitle $_) -ceq (ConvertTo-CapriiSongTitle $query) })
   if ($sameTitle.Count -eq 0) { continue }
   if ($parts.buttons.Count -ne 1 -or -not $parts.buttons[0].Equals($button)) { break }
   $candidate=New-CapriiSpotifyCandidate $node $parts 'card' $query
   if ($null -ne $candidate -and -not @($results | Where-Object { $_.button -eq $candidate.button }).Count) { [void]$results.Add($candidate) }
   break
  }
 }
 # Screen positions only establish order. They are never used as click coordinates.
 $ordered=@($results | Sort-Object top,left,@{Expression={$_.texts.Count}})
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
