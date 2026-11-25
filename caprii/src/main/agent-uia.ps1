$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;using System.Runtime.InteropServices;
public class CapriiUiaNative{[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);}
'@
$handle = [IntPtr]([long]$request.window.handle)
[uint32]$pidValue=0
[void][CapriiUiaNative]::GetWindowThreadProcessId($handle,[ref]$pidValue)
$process=Get-Process -Id $pidValue
# Desktop helper uses UTC StartTime.Ticks as the stable process identity.
if ($process.StartTime.ToUniversalTime().Ticks.ToString() -ne [string]$request.window.processStart) { throw 'Window process identity changed' }
if ($pidValue -ne $request.window.processId) { throw 'Window process changed' }
$root=[System.Windows.Automation.AutomationElement]::FromHandle($handle)
if ($root.Current.Name -ne $request.window.title) { throw 'Window title changed; inspect again' }
$elements=New-Object System.Collections.ArrayList
$queue=New-Object System.Collections.Queue
$queue.Enqueue($root)
$walker=[System.Windows.Automation.TreeWalker]::ControlViewWalker
$visited=0
while($queue.Count -gt 0 -and $visited -lt 500 -and $elements.Count -lt 200){
 $node=$queue.Dequeue();$visited++
 try{
  $info=$node.Current
  if(-not $info.IsOffscreen -and -not $info.IsPassword -and $info.IsEnabled){
   $valuePattern=$null;$invokePattern=$null
   $canValue=$node.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$valuePattern)
   $canInvoke=$node.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$invokePattern)
   $value=$null;$readOnly=$true
   if($canValue){$value=[string]$valuePattern.Current.Value;if($value.Length -gt 2000){$value=$value.Substring(0,2000)};$readOnly=$valuePattern.Current.IsReadOnly}
   $runtime=($node.GetRuntimeId() -join ',')
   [void]$elements.Add(@{id=$elements.Count;name=$info.Name;controlType=$info.ControlType.ProgrammaticName;runtime=$runtime;value=$value;readOnly=$readOnly;canInvoke=$canInvoke;canValue=$canValue;node=$node})
  }
  $child=$walker.GetFirstChild($node);$siblings=0
  while($null -ne $child -and $siblings -lt 200){$queue.Enqueue($child);$child=$walker.GetNextSibling($child);$siblings++}
 }catch{continue}
}
if($request.kind -eq 'read'){
 $public=@($elements | ForEach-Object {@{id=$_.id;name=$_.name;controlType=$_.controlType;runtime=$_.runtime;value=$_.value;readOnly=$_.readOnly;canInvoke=$_.canInvoke;canValue=$_.canValue}})
 @{elements=$public;limited=($queue.Count -gt 0);note='No password controls. Games/canvas may expose no actionable controls.'}|ConvertTo-Json -Depth 6 -Compress
 exit
}
$match=@($elements|Where-Object {$_.runtime -eq $request.element.runtime -and $_.name -eq $request.element.name -and $_.controlType -eq $request.element.controlType})
if($match.Count -ne 1){throw 'Control changed; read again'}
$element=$match[0].node
if($request.kind -eq 'invoke'){
 if(-not $match[0].canInvoke){throw 'Control does not support InvokePattern'}
 $pattern=$element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern);$pattern.Invoke()
 @{inputDelivered=$true;passed=$false;requiresVerification=$true}|ConvertTo-Json -Compress
}elseif($request.kind -eq 'type' -or $request.kind -eq 'verify'){
 if(-not $match[0].canValue){throw 'Control does not support ValuePattern'}
 $pattern=$element.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
 if($request.kind -eq 'type'){if($pattern.Current.IsReadOnly){throw 'Control is read-only'};$pattern.SetValue([string]$request.value)}
 $actual=$pattern.Current.Value
 @{inputDelivered=($request.kind -eq 'type');passed=($actual -ceq [string]$request.value);value=$actual;expected=$request.value}|ConvertTo-Json -Compress
}else{throw 'Unsupported UI Automation operation'}
