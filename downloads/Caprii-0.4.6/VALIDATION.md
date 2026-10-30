# Caprii Agent 0.4.6 validation

Date: 30 October 2026 (Asia/Bangkok). Host: Linux x64, Node 24.19.0, Electron 44.9.3; virtual Xorg display with software WebGL. No environment draft changes or publication were performed in this development turn.

## Passed

- `npm test`: 40 tests executed, 40 passed, 0 failed, 0 skipped. Covers existing hooks, the chat deadline/retry/stop rules, fragmented Thai SSE decoding, credential redaction, model filtering, tool validation, path/symlink/Windows-device restrictions, approved backups and moves, actual npm execution, process-tree termination, changed-manifest rejection, DPI conversion in the JavaScript adapter, and preventing an unrelated passing check from hiding an unresolved tool failure.
- `npm run test:electron`: real Electron page navigation, text entry, button click, actual DOM assertion, screenshots, blocked unapproved cross-origin redirects, isolated page state, Thai task UI, Stop IPC, completion rendering, and actual virtual-display screenshot capture.
- Live Gemini `models/gemini-3.5-flash-lite`: Thai chat and follow-up context succeeded. Vision returned the correct Thai name of a generated red test image's color. No personal screen content was sent in that vision test.
- Live coding agent: Gemini inspected a temporary buggy `add` function, changed the fixture source from subtraction to addition, ran its real npm test, and reported the passing assertion. The verification script and package.json were not editable by this fixture's permission handler.
- Actual app setup IPC enumerated Gemini models and confirmed a generated response before selecting `models/gemini-3.5-flash-lite`.
- Actual renderer chat displayed a Thai answer through the normal renderer/main IPC path and returned the input to its ready state.
- Actual chat Stop button cancelled a deliberately stalled local provider request and restored the UI. This used a local synthetic fixture and restored Gemini afterward.
- Windows x64 NSIS installer was built using the supported custom-script path. It creates its unsigned uninstaller on the destination Windows PC, so Linux builds do not execute an intermediate Windows EXE. The final artifact is unsigned. Package-content verification and SHA-256 manifest accompany the release files.

## Not executed; requires Windows

- `npm run test:windows` real user32 window enumeration/focus, Thai Unicode keyboard injection, Ctrl+A, pointer click and resulting screenshots in an unlocked Windows desktop session.
- Physical multi-monitor DPI behavior, foreground restrictions, UAC/elevated app boundaries, and interaction with VS Code on Windows.
- Installing, launching from the shortcut, upgrading and uninstalling on a real Windows machine.
- The supplied `.github/workflows/windows-validation.yml` workflow has not been run or published to GitHub.

The JavaScript adapter's unit tests are not a substitute for the Windows native tests. Successful injection or a window PID is not proof a user's full task succeeded. Agent summaries include actual check evidence and an explicit notice when required verification is missing. Exit code zero from an arbitrary project script is evidence only of that script's result; it does not establish that the project has a comprehensive test suite.

## Operational limits

24 tool turns / 5 minutes per task, 30 seconds and 3 provider attempts per chat request, 4096 generated tokens per OpenAI-compatible request, 60 seconds / bounded output per npm check, 64 KB per project file. Provider quota/free-tier availability is not guaranteed. Browser sessions are ephemeral; new origins, files, scripts, desktop input and screen sharing require confirmation. No automatic cross-task agent memory or chat-history persistence by default. User-exported reports are optional local files.

Project scripts and desktop actions are approved capabilities, not an OS sandbox. Only run trusted project scripts. A Windows test failure remains a release limitation until investigated on Windows; do not describe this build as fully Windows-validated.

## Screen-routing hotfix

The exact reported Thai command ดูจอแล้วพิมพ์คำตอบไป is tested through the renderer Chat class: it invokes agent IPC, not text-only chat. Thai look-only commands select the screenshot flow. Refusals and unrelated chat do not start screen actions. Screenshot requests use the bounded/cancellable chat runner; the UI distinguishes capture and analysis stages. Electron browser/task UI smoke passed again. The revised Windows helper invocation is adapter-tested only; native Windows execution remains unrun.
