'use strict';
const {runProcess}=require('./agent-process');
// Only a user gesture in Caprii's own ordinary chat can call this; not an agent tool.
const SCRIPT=`$ErrorActionPreference='Stop'
$r=[Console]::In.ReadToEnd()|ConvertFrom-Json
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public class CapriiDictation {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint id);
 [DllImport("user32.dll")] public static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
 public static bool OwnWindow(uint expected){uint id;GetWindowThreadProcessId(GetForegroundWindow(),out id);return id==expected;}
 public static void Start(){try{keybd_event(91,0,0,UIntPtr.Zero);keybd_event(72,0,0,UIntPtr.Zero);keybd_event(72,0,2,UIntPtr.Zero);}finally{keybd_event(91,0,2,UIntPtr.Zero);}}
}
'@
if(-not [CapriiDictation]::OwnWindow([uint32]$r.pid)){throw 'Caprii chat is not focused; dictation was not started'}
[CapriiDictation]::Start()
[Console]::Out.Write('requested')`;
async function startWindowsDictation({platform=process.platform,pid=process.pid,signal,run=runProcess}={}){
 if(platform!=='win32')throw Error('การพิมพ์ด้วยเสียงนี้ใช้ Windows Voice Typing บน Windows เท่านั้น');
 if(!Number.isInteger(pid)||pid<=0||pid>0xffffffff)throw Error('Invalid app process');
 signal?.throwIfAborted();
 const result=await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',SCRIPT],{input:JSON.stringify({pid}),signal,timeoutMs:4000});
 if(!result.passed||result.stdout.trim()!=='requested')throw Error('เปิดการพิมพ์ด้วยเสียงไม่สำเร็จ กรุณาโฟกัสช่องแชตแล้วลอง Win+H ด้วยตัวเอง');
 return{requested:true,verified:false};
}
module.exports={startWindowsDictation};
