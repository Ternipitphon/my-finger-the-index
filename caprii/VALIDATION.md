# Caprii 0.5.9 validation

- 155 app tests and 3 lab unit/server checks pass, including exact screenshot phrases, read/write separation, selected-tab IPC routing, observation-derived field reports and rejection of unverified success narratives.
- Live Gemini 3.5 Flash Lite drove the actual local Test Lab browser: name/email/select/checkbox, submit, then browser.expect; all fields and the page passed state were checked. An initial run exposed missing final verification, which is now prompted before finish without re-submitting.
- Attachment, authenticated DOM broker and 8 Test Lab browser cases were rechecked. Native Chrome unpacked-extension integration remains blocked by managed browser policy; Windows installation/control is not tested.
- Installer is unsigned and cross-built. Website hosting is not deployed.

# Caprii 0.5.8 validation

- 148 app tests pass, including saved response preferences/default migration, explicit detail overrides, intact image/tool payloads, answer-only observation and Chrome diagnostic/rollback cases.
- 3 lab unit/server tests pass; all 8 local browser cases pass. Attachment UI and authenticated DOM broker smoke tests also pass.
- Live Gemini 3.5 Flash Lite correctly counted 3 red boxes in a synthetic PNG with the default short response: 54 characters. This is a synthetic check, not a guarantee across models or arbitrary tasks.
- Real unpacked-extension Chromium QA was blocked by administrator policy. No policy bypass was attempted. Popup/worker integration and Windows-native installation/control remain unverified in this environment.
- Installer is cross-built and unsigned. Website remains local, with no hosting deployment.

# Caprii 0.5.7 validation

- 139 application tests and 3 Test Lab unit/server checks passed.
- Personality and image unit tests cover default-on behavior, opt-out, preserving tool/consent requirements, resize/limits/expiry, clipboard blobs, attached-image routing and unsupported-model errors.
- Real Electron Chat/Panel test covers attach button, thumbnail before sending, multimodal HTTP payload, Ctrl+V, image-only message, removal and text-only history. The provider in this UI test is a local fixture.
- A separate live Gemini 3.5 Flash Lite request correctly counted 3 red boxes in an actually attached synthetic PNG and replied with the personality prompt enabled. No private image was used.
- Test Lab has 8 cases and tests code readback from a sample picture; website pass status alone does not prove that an AI used vision or grade its personality.
- Windows installer is cross-built and unsigned. Actual Windows installation/native input remains untested. Website hosting is not deployed.

# Caprii 0.5.6 validation

- 132 application tests passed, including local Test Lab lifecycle and release-version alignment.
- 3 Test Lab unit/server checks passed. All 7 browser cases, negative scenarios, report export, filters and mobile viewport checks passed using real Electron and the current DOM bridge.
- Windows x64 installer is cross-built with the existing NSIS recipe and checksum-verified pinned Python/Agent Reach dependencies. Packaged ASAR/runtime checks are included in scripts/verify-release.cjs.
- The installer is unsigned. A Linux build and packaged-resource check do not establish successful installation, native controls or UI Automation on a real Windows machine. Website hosting has not been deployed.

# Caprii 0.5.5 — validation

## Executed in this Linux environment

- `npm test`: **124 passed, 0 failed**. Includes bounded/cancellable provider calls, file/path/process safeguards, exact math, requested-action completion, session permissions, selected-tab authentication/session isolation/abort/timeout, Thai dialogue shape and placeholder preservation, bounded English-to-Thai repair, bounded recovery/no replay after uncertain writes, current-chat short commands, explicit no-fill/no-submit guards, voice-typing process/sender/UI guards, and local Thai voice selection with no English/online-voice fallback.
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


## 0.5.2 reported-screen regression

The exact request “ดูจอแล้วหาคำตอบ” routes to calculator-capable Agent tools. Answer-only requests prohibit filling/submitting unless requested. The [7,6,3,4] target 82 fixture has no solution under the supported basic operators/parentheses/use-once rules; its summary cannot append an invented answer.

The real vision IPC uses the same bounded Thai/respectful-output check as ordinary chat. Synthetic inappropriate Thai output is rewritten before returning; persistent known inappropriate language is withheld. Previous unrelated chat history is excluded from each current-image question. Internal Caprii windows are temporarily hidden during capture and restored afterward, including capture failure; a following capture is verified to work. The marker check does not claim to detect every possible inappropriate expression or model hallucination. No live provider/image request was made for these synthetic output tests.

- Pairing-code dialog capture guard: real app menu/dialog fixture opens the code dialog, capture returns a blocked result without calling desktop capture, and capture resumes after the dialog closes. Codes are not logged or transmitted in this test.

## 0.5.3 quality profiles

- Unit tests cover stable listed-model selection for Lite/Flash/Pro, absence of suitable models, quality fallback to non-Lite Flash when Pro is absent, and same-tier retry boundaries.
- Actual Electron menu test uses mocked provider responses: cancel sends no generation request, successful Thai test saves the proposed Pro, and failed Flash test preserves the prior model. This does not prove real Pro quota or output quality.
- Read-only Gemini model discovery succeeded in this environment. No paid Pro generation or intelligence comparison against Gemini web was performed. The user's app key and model access may differ.
- Focused assistant prompt removes the three-sentence roleplay cap, asks for factual Thai answers, and distinguishes missing evidence from performed actions. It is prompt guidance, not a factual-accuracy guarantee. Existing model choice is preserved until user selection.

## 0.5.4 desktop tools and actual Google Chrome

- `CAPRII_CHROME=/path/to/google-chrome DISPLAY=:100 node scripts/google-chrome-smoke.cjs`: **passed in official Google Chrome 156.0.8078.79 on Linux**, sandbox enabled, disposable profile, unmodified unpacked extension. CDP Extensions.triggerAction granted normal activeTab permission; actual popup paired; actual worker/content script polled the authenticated broker; real DOM field received 15, exact readback passed, click produced the real acknowledgment. Page reload invalidated the old task lease. New popup reused the session code and explicit reconnect read the new page. No AI API call or model-quality assessment in this test. Fixture is local, not the live Fastmath site.
- New tests cover real temporary-directory searches, shortcut results, script/secret exclusions, stale/changed file rejection, symlink replacement, no invented result IDs; native UIA process runner is stubbed to verify fixed shipped helper + separate JSON, process identity changes, 30-second expiry, and invalidation after use. Integrated tool tests require actual typed-action evidence plus a new acknowledgment and enforce no-input/no-submit before permissions/native calls.
- App UI smoke verifies task windows remain hidden by default; details are opt-in, Stop remains available. No-prompt mode remains default OFF and session-only, now explicitly includes UIA and name-search/open-file/program tools. File edits/scripts still ask separately.
- **Not executed**: native Windows UI Automation patterns/PowerShell runtime, Windows shell opening real documents/Steam shortcuts, physical game key injection, Limbus gameplay, Windows DPI/UAC, or the user's actual screen. Code support and mock tests do not prove these work on Windows. UIA may expose no useful controls for a game canvas; no automatic gameplay guarantee.

## 0.5.5 Agent Reach integration

- Pinned upstream 1.6.0 commit 21f0ead1dfc9d0fc8262f28adbfbff93219b998e, MIT license preserved. Adapter calls only public WebChannel/Jina, Exa search and YouTube yt-dlp metadata/search/subtitle methods, not upstream setup/session reuse/login/account import/paid transcription. User yt-dlp configs and plugin directories explicitly disabled; TLS checks remain enabled.
- Official Python Software Foundation NuGet Python 3.13.17 package verified against its catalog SHA512. All 13 pinned Windows wheel SHA256 values verified against PyPI metadata. `scripts/prepare-agent-reach.py` successfully recreated runtime from the checked-in lock; installer includes it, source ZIP excludes generated vendor-runtime.
- `python scripts/test-agent-reach.py` under dedicated Linux venv: **4 passed** using actual pinned upstream parsers with deterministic transport fixtures; actual subprocess status reports 1.6.0 and yt-dlp 2026.08.19. Includes metadata-versus-video evidence, config/plugin isolation, response truncation, and blocked management actions. Does not establish live website access.
- Node suite: **124 passed** including public URL validation, bounded/cancellable isolated JSON subprocess, stripped API secrets, malformed/platform-blocked responses, no install/login/transcription tool exposure, permission denial, and natural URL/search routing.
- Real Electron chat IPC smoke: pasted public URL uses Reach-only scope with no desktop tools; one mocked backend read followed by evidence-based finish, no visible tracking window. Existing model/Thai/voice/capture/Stop/session-permission checks passed.
- Cloud YouTube access was denied with HTTP 403 before integration; no alternate provider was used to bypass this policy and the supplied clip was not read. No live Jina/Exa/YouTube-content success is claimed. Windows Python execution, actual Windows network/site access, and captions availability remain untested on Windows.
