; Custom NSIS script: create the unsigned uninstaller on the target Windows PC.
; This supports Linux builds without executing an intermediate EXE under Wine.
Unicode true
!include "MUI2.nsh"
!include "x64.nsh"
!include "WinVer.nsh"
Name "Caprii Agent"
InstallDir "$LOCALAPPDATA\Programs\CapriiAgent"
RequestExecutionLevel user
SetCompressor /SOLID zlib
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${PROJECT_DIR}/LICENSE"
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_FILENAME}.exe"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "Windows x64 is required."
    Abort
  ${EndIf}
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "Windows 10 or newer is required."
    Abort
  ${EndIf}
  StrCpy $INSTDIR "$LOCALAPPDATA\Programs\CapriiAgent"
FunctionEnd
Function un.onInit
  StrCmp $INSTDIR "$LOCALAPPDATA\Programs\CapriiAgent" +3
  MessageBox MB_ICONSTOP "Unexpected installation path. Uninstall aborted."
  Abort
  IfFileExists "$INSTDIR\caprii-install-marker.txt" +3
  MessageBox MB_ICONSTOP "Installation marker not found. Uninstall aborted."
  Abort
FunctionEnd
Section "Install"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File /r "${PROJECT_DIR}/dist/win-unpacked/*"
  FileOpen $0 "$INSTDIR\caprii-install-marker.txt" w
  FileWrite $0 "${APP_ID}"
  FileClose $0
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Caprii Agent.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe"
  CreateShortcut "$SMPROGRAMS\Caprii Agent.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CapriiAgent" "DisplayName" "Caprii Agent"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CapriiAgent" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CapriiAgent" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CapriiAgent" "InstallLocation" "$INSTDIR"
SectionEnd
Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\Caprii Agent.lnk"
  Delete "$SMPROGRAMS\Caprii Agent.lnk"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CapriiAgent"
  RMDir /r "$INSTDIR"
SectionEnd
