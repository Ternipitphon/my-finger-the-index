$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class CapriiDesktop {
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] public struct INPUTUNION { [FieldOffset(0)] public KEYBDINPUT ki; [FieldOffset(0)] public MOUSEINPUT mi; }
  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public INPUTUNION U; }
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc fn, IntPtr param);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr handle);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr handle);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr handle, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr handle);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr handle, int command);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr handle, out RECT rect);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT point);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint count, INPUT[] inputs, int size);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr handle, IntPtr processId);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr handle);
  public static bool Focus(IntPtr handle) {
    ShowWindow(handle, 9);
    uint current = GetCurrentThreadId();
    uint foreground = GetWindowThreadProcessId(GetForegroundWindow(), IntPtr.Zero);
    bool attached = current != foreground && AttachThreadInput(current, foreground, true);
    try { BringWindowToTop(handle); SetForegroundWindow(handle); }
    finally { if (attached) AttachThreadInput(current, foreground, false); }
    return GetForegroundWindow() == handle;
  }
  public static void TypeText(string text) {
    foreach (char c in text) {
      INPUT down = new INPUT(); down.type = 1; down.U.ki.wScan = c; down.U.ki.dwFlags = 4;
      INPUT up = down; up.U.ki.dwFlags = 6;
      if (SendInput(2, new INPUT[] { down, up }, Marshal.SizeOf(typeof(INPUT))) != 2) throw new Exception("Windows blocked text input");
    }
  }
  [DllImport("user32.dll", EntryPoint="GetWindowThreadProcessId")] public static extern uint WindowProcessId(IntPtr handle, out uint processId);
  public static string[] Identity(IntPtr h) {
    uint id; WindowProcessId(h,out id); string start=null;
    try { start=System.Diagnostics.Process.GetProcessById((int)id).StartTime.ToUniversalTime().Ticks.ToString(); } catch {}
    return new string[]{id.ToString(),start};
  }
  public static object State() {
    var windows = new List<object>();
    EnumWindows(delegate(IntPtr h, IntPtr ignored) {
      if (IsWindowVisible(h)) {
        var title = new StringBuilder(512); GetWindowText(h, title, title.Capacity);
        RECT r; GetWindowRect(h, out r);
        var identity=Identity(h);
        if (title.Length > 0 && r.Right > r.Left && r.Bottom > r.Top)
          windows.Add(new { handle = h.ToInt64().ToString(), processId=identity[0], processStart=identity[1], title = title.ToString(), x = r.Left, y = r.Top, width = r.Right-r.Left, height = r.Bottom-r.Top });
      } return true;
    }, IntPtr.Zero);
    POINT cursor; GetCursorPos(out cursor);
    return new { foreground = GetForegroundWindow().ToInt64().ToString(), cursor = new { x = cursor.X, y = cursor.Y }, windows = windows };
  }
}
'@
[void][CapriiDesktop]::SetThreadDpiAwarenessContext([IntPtr](-4))
if ($request.expectedProcessId) {
  $identityHandle = if ($request.kind -eq 'focus') { $request.handle } else { $request.targetHandle }
  $current = [CapriiDesktop]::Identity([IntPtr]([long]$identityHandle))
  $title = New-Object System.Text.StringBuilder 512
  [void][CapriiDesktop]::GetWindowText([IntPtr]([long]$identityHandle), $title, 512)
  if ($current[0] -ne $request.expectedProcessId -or $current[1] -ne $request.expectedProcessStart -or $title.ToString() -cne $request.expectedTitle) { throw 'Window identity changed; inspect and approve the new window first' }
}
if ($request.targetHandle -and $request.kind -ne 'focus') {
  $target = [IntPtr]([long]$request.targetHandle)
  if (-not [CapriiDesktop]::IsWindow($target)) { throw 'Target window no longer exists' }
  [void][CapriiDesktop]::ShowWindow($target, 9)
  if (-not [CapriiDesktop]::Focus($target)) { throw 'Windows refused to focus the target; no input was sent' }
  Start-Sleep -Milliseconds 150
  if ([CapriiDesktop]::GetForegroundWindow() -ne $target) { throw 'Target window lost focus; no input was sent' }
}
switch ($request.kind) {
  'state' { }
  'focus' {
    $handle = [IntPtr]([long]$request.handle)
    if (-not [CapriiDesktop]::IsWindow($handle)) { throw 'Window no longer exists' }
    [void][CapriiDesktop]::ShowWindow($handle, 9)
    if (-not [CapriiDesktop]::Focus($handle)) { throw 'Windows refused to focus this window' }
  }
  { $_ -in @('move','click','doubleclick','rightclick','drag') } {
    $rect = New-Object CapriiDesktop+RECT
    if (-not [CapriiDesktop]::GetWindowRect([IntPtr]([long]$request.targetHandle), [ref]$rect)) { throw 'Cannot inspect target window' }
    if (-not $request.allowOutsideWindow) {
      if ($request.x -lt $rect.Left -or $request.x -ge $rect.Right -or $request.y -lt $rect.Top -or $request.y -ge $rect.Bottom) { throw 'Target window moved; inspect again' }
      if ($request.kind -eq 'drag' -and ($request.toX -lt $rect.Left -or $request.toX -ge $rect.Right -or $request.toY -lt $rect.Top -or $request.toY -ge $rect.Bottom)) { throw 'Drag target moved; inspect again' }
    }
    if (-not [CapriiDesktop]::SetCursorPos([int]$request.x, [int]$request.y)) { throw 'Cannot move pointer' }
    if ($request.kind -eq 'click' -or $request.kind -eq 'doubleclick') {
      [CapriiDesktop]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
      [CapriiDesktop]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
      if ($request.kind -eq 'doubleclick') {
        Start-Sleep -Milliseconds 70
        [CapriiDesktop]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
        [CapriiDesktop]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
      }
    } elseif ($request.kind -eq 'rightclick') {
      [CapriiDesktop]::mouse_event(8, 0, 0, 0, [UIntPtr]::Zero)
      [CapriiDesktop]::mouse_event(16, 0, 0, 0, [UIntPtr]::Zero)
    } elseif ($request.kind -eq 'drag') {
      try {
        [CapriiDesktop]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
        for ($step = 1; $step -le 15; $step++) {
          $x = [int]($request.x + ($request.toX-$request.x)*$step/15)
          $y = [int]($request.y + ($request.toY-$request.y)*$step/15)
          [void][CapriiDesktop]::SetCursorPos($x, $y)
          Start-Sleep -Milliseconds 20
        }
      } finally { [CapriiDesktop]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero) }
    }
  }
  'release' {
    [CapriiDesktop]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
    [CapriiDesktop]::mouse_event(16, 0, 0, 0, [UIntPtr]::Zero)
  }
  'type' { [CapriiDesktop]::TypeText([string]$request.text) }
  'key' {
    $keys = @{
      'enter' = @(13); 'escape' = @(27); 'tab' = @(9); 'backspace' = @(8);
      'ctrl+a' = @(17,65); 'ctrl+s' = @(17,83); 'ctrl+c' = @(17,67);
      'ctrl+l' = @(17,76); 'ctrl+f' = @(17,70); 'ctrl+w' = @(17,87);
      'ctrl+tab' = @(17,9); 'ctrl+shift+tab' = @(17,16,9); 'alt+f4' = @(18,115);
      'up' = @(38); 'down' = @(40); 'left' = @(37); 'right' = @(39);
      'home' = @(36); 'end' = @(35); 'pageup' = @(33); 'pagedown' = @(34); 'delete' = @(46); 'space' = @(32);
      'ctrl+v' = @(17,86); 'alt+tab' = @(18,9); 'ctrl+z' = @(17,90)
    }
    if (-not $keys.ContainsKey([string]$request.key)) { throw 'Key combination not supported' }
    $pressed = @()
    try { foreach ($k in $keys[[string]$request.key]) { [CapriiDesktop]::keybd_event([byte]$k, 0, 0, [UIntPtr]::Zero); $pressed += $k } }
    finally { [array]::Reverse($pressed); foreach ($k in $pressed) { [CapriiDesktop]::keybd_event([byte]$k, 0, 2, [UIntPtr]::Zero) } }
  }
  'scroll' {
    $delta = [int]$request.amount * 120
    $bits = [BitConverter]::ToUInt32([BitConverter]::GetBytes($delta), 0)
    [CapriiDesktop]::mouse_event(2048, 0, 0, $bits, [UIntPtr]::Zero)
  }
  default { throw 'Unknown desktop command' }
}
Start-Sleep -Milliseconds 200
[CapriiDesktop]::State() | ConvertTo-Json -Depth 6 -Compress
