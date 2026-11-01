# Caprii 0.5.1 — validation

## Executed in this Linux environment

- `npm test`: **105 passed, 0 failed**. Includes bounded/cancellable provider calls, file/path/process safeguards, exact math, requested-action completion, session permissions, selected-tab authentication/session isolation/abort/timeout, Thai dialogue shape and placeholder preservation, bounded English-to-Thai repair, bounded recovery/no replay after uncertain writes, current-chat short commands, explicit no-fill/no-submit guards, voice-typing process/sender/UI guards, and local Thai voice selection with no English/online-voice fallback.
- `npm run test:electron`: real sandboxed Electron browser form input, actual value readback, wrong-value detection, read-only keypad clicks, rejection when a page clears typed input, password-value redaction, post-submit DOM assertion, blocked cross-origin redirects, task UI/Stop IPC, and virtual screen capture.
- `npm run test:chrome-ui`: readonly typing failure -> fresh inspection -> actual visible keypad clicks -> exact matching field-value proof -> original edit marked recovered -> new submission acknowledgment. Also  authenticated loopback selected-tab protocol connected to a real isolated Electron DOM using the exact shared DOM bridge shipped in the extension. Exact math -> premature finish rejected -> actual field fill -> independent field readback -> submit click -> page acknowledgment assertion.
- `npm run test:site-ui`: actual app renderer/main IPC, Thai UI, centered character, idle motion paused during tasks, explicit website confirmation, user-selected session-only no-prompt mode, actual capture/math task without repeated prompts, mode revocation and no persisted permission.
- All 477 Thai dialogue strings retain the complete original structure and placeholders. Translation was performed locally, without exporting the dialogue corpus to an external translation service.

The selected-tab test simulates the extension transport peer in Electron; it is **not** a test of Chrome extension installation or real Windows Chrome interaction. It exercises the real broker and real DOM controls, not a mock field value.

## Required on the user's Windows/Chrome machine; not executed here

- Installing/upgrading/uninstalling the unsigned Windows x64 NSIS installer.
- Loading the Manifest V3 extension in Chrome, pairing through the popup, tab permission lifecycle, navigation/reload behavior, and interaction with the actual Fastmath site and its current controls.
- Real Windows user32 keyboard/mouse injection, maximized-window focus preservation, DPI/multiple displays, UAC/foreground restrictions, and the local menu diagnostic.
- Launching Windows Voice Typing via Win+H, foreground-window behavior, availability of Thai recognition, actual audio recognition, and stopping its microphone through Windows. The helper launch/validation was tested with a process stub; no microphone was activated in cloud tests.
- Playback through an installed local Windows Thai voice. Voice selection/mute/error handling were unit tested; no real Thai speech engine was available here.
- Live provider Thai/vision checks were not rerun in this release. API readiness and available models depend on the configured provider/account/quota.

The UI voice-button test verifies explicit activation, busy/secret-field exclusion, and no automatic command submission using a callback fixture. It does not verify Windows speech recognition.

Successful input delivery or field-value matching is not proof of form acceptance. A requested submission needs a separate post-submit page check; window-title checks cannot supply it. Timeouts are reported as uncertain outcomes without replaying a queued click.

## Packaging

The release process checks all packaged source files against the working source, verifies the bundled extension files, tests installer archive integrity, and recombines split installer parts against SHA256 before upload. The manifest records the final installer and part hashes. Linux packaging does not establish Windows installation/native-input readiness.
