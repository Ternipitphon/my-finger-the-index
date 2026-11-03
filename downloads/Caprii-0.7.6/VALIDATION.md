# Caprii 0.7.6 validation

- 235 application tests, 4 lab checks, 8 browser DOM cases and the media UI/transport fixtures pass.
- Autoplay is enabled for an explicit plain Spotify-open command and can be disabled in the tray menu. Failed/cancelled opens, other websites and deep links do not autoplay. Only validated public track metadata is remembered locally, with URL tracking parameters removed.
- Reconnect waits for the new active Spotify document before capturing a browser lease. The media preparation phase permits Spotify-only handoff without interrupting other tasks; remembered browser grants survive tab closure.
- Spotify pause, next and previous use fixed page controls with result checks. Document IDs reject stale mutations. Locale-prefixed Spotify URLs remain scoped to supported media paths.
- Chrome tab audio is distinguished from advancing playback position and from physical speaker audibility. Restored already-playing/no-audio state gets one same-track reload; fresh silent intros are not restarted. Muted tabs are diagnosed. Only an exact observed This web browser device option may be selected.
- Actual Electron DOM fixture closes/reopens a new window, restores a silent advancing clock, recovers the same track, pauses, skips, rejects old document IDs, detects mute and selects an exact local device. Audio flags and Spotify pages are fixtures, not real audio or a real account.
- Real HTTP broker/worker-emulation regression and 8 local Test Lab DOM cases remain separate from real Chrome/Windows/audio validation. Real Chrome account playback, autoplay permissions, device picker variants and physical output remain untested. No website deployment.

# Caprii 0.7.5 validation

- 217 app tests, 4 local lab checks and 8 DOM browser cases pass.
- Renderer periodically reasserts native hit reception while the cursor is on the panel, even if its cached hit state is already true. Actual Windows delivery remains unverified.
- Actual Panel/Chat fixture tests no DOM press/move/release events: native samples on the idle Talk button open exactly one chat. Unknown button state never fabricates a release; outside press/entry or outside release cancels activation.
- Combined DOM/native delivery activates once; late clicks on detached buttons are ignored. The fallback is scoped to the idle Talk action, never permission or submission controls.
- Real Electron mouse regression also verifies the actual button coordinates remain fixed while text would wrap and the idle timer expires. Existing delayed-status, cancellation, visible error and chat form checks remain.
- Real Windows physical sampling/input delivery remains untested; native samples are simulated in the fixture. Local Test Lab retains 8 DOM cases and separate desktop test scope. No website deployment.

# Caprii 0.7.4 validation

- Actual Panel/Chat Talk-button regression uses Electron mouse down/up on a nonfocusable transparent window. A moving anchor and expired idle timeout do not remove the pressed target. Loading appears before delayed AI status; repeated opening is coalesced; the final chat form is usable.
- A dismissed pending opening never reopens on a late reply; a rejected status request produces a visible diagnostic. Opening times out after 15 seconds rather than silently waiting indefinitely.
- Native button fallback shares the existing read-only cursor samples. Physical Windows click delivery and long-running use remain untested; Electron test input is not a Windows-native result.
- Keep local Test Lab DOM scoring separate from desktop Talk-button checks. No website deployment.

# Caprii 0.7.3 validation

- 217 app tests pass.
- Browser mode is opt-in with optional http/https origin grants and local-only pairing storage. Single-tab mode remains default. Chrome can reuse the code while the same app process remains open; app restart invalidates it.
- Tests emulate new active tabs, closed/reopened tabs, Chrome restart local storage, busy tasks, permission revocation, private/privileged tabs, explicit disconnect and stale app credentials. Real HTTP broker rejects automatic handoff with a pending command or app task.
- No eager injection on tab handoff; consumed commands are never replayed. Fixed packaged drivers and task leases remain enforced.
- Test Lab retains all 8 DOM cases and 4 media examples; browser reconnect is marked not measured by this page.
- Actual Chrome permission UI/lifecycle, Windows installation and real Spotify audio remain untested. No website deployment.

# Caprii 0.7.2 validation

- 206 app tests, 4 lab checks and 8 DOM browser cases pass.
- Added idle native cursor sampling and fresh primary-button edge recovery when DOM mouse forwarding is absent. Existing held-only sampling and delayed-generation guards remain covered.
- Companion fixture tests 20 entirely no-DOM press/move/release cycles plus 30 earlier cycles, outside press/held entry and panel exclusions, placement and cancellation. This uses the actual sprite with simulated cursor/button data in Electron; Windows native input and long-running Windows operation remain untested.
- Local Test Lab keeps its 8 DOM cases and media examples. Native drag is outside its DOM score. No website deployment.

# Caprii 0.7.1 validation

- 205 app checks include the >8-second false-disconnection regression using an injected clock, live popup acknowledgment, transient-offline recovery with the same session, no replay after a lost mutation acknowledgment, same-origin lease retention and cross-origin revocation.
- End-to-end fixture uses the real authenticated HTTP broker, emulated extension worker APIs and real Electron Spotify-shaped DOM. Page timers are disabled in the isolated world; playback and advancing position still verify. The selected tab is the only target, already-open Liked Songs is not reloaded, and changing origin disconnects. The >8-second age is simulated, not a claim of real Chrome background lifecycle QA.
- 4 Test Lab checks and the existing 8 DOM browser scenarios pass; external-media examples stay unmeasured by the Test Lab page. Existing media DOM checks pass.
- Bundled-resource validation includes exact worker source match, inactive legacy content polling, Spotify driver parity and the Windows runtime.
- Real Chrome installation/background suspension, Spotify account/audio and Windows installation remain untested. The managed browser blocks unpacked extensions; no policy bypass. Installer is unsigned and cross-built. No website deployment.

# Caprii 0.7.0 validation

- Same-title/same-performer releases use Spotify search rank when no release was requested; distinct performers remain ambiguous and require clarification.
- 202 application checks include colloquial media parsing, exact reported commands, direct YouTube search URL, Chat media routing/context expiry, Spotify exact track/artist matching, ambiguous playlist refusal, once-only play and progress-based verification, authenticated same-origin location updates and extension navigation scope.
- Real Electron Spotify-shaped local fixture passes Liked Songs, named song/artist, named playlist, single click, advancing progress, frozen-progress rejection and logged-out gate. HTTPS Spotify-origin pages are intercepted with local fixtures; no real Spotify account, DRM playback or audible output was tested.
- 4 lab unit/server checks and the existing 8 real browser DOM cases pass. Four stable external-media examples are exported as not-measured-by-this-page, never marked passed by the site.
- Packaged resource checks include matching Spotify DOM drivers in ASAR/extension and the media controller. Real unpacked Chrome extension integration remains blocked by managed browser policy. Windows installation and real Spotify/YouTube operation remain untested.
- No website hosting deployment. Cross-built unsigned installer. Spotify login, account playback rights and browser autoplay permission are prerequisites; errors/unknown progress must not become a success claim.

# Caprii 0.6.3 validation

- 186 application tests pass. New checks cover fresh/stale/invalid/cleared physical-button samples, separation of button heartbeats from window snapshots, and rejecting delayed cursor replies from an earlier gesture.
- Real Electron sprite stress fixture passes 30 consecutive hold/move/release cycles (15 reduced, 15 full animation) with simulated primary-button state. Premature DOM pointerup/mouseup does not cancel a held button; physical release without DOM up finishes the gesture. Existing mouse-only, blur/lost capture, placement and cancel cases also pass.
- Pressing during a running idle walk cancels that walk and postpones autonomous movement; the real sprite fixture verifies this alongside repeated drag cycles.
- Native Windows code uses read-only GetAsyncKeyState, respects swapped primary buttons and shares the existing PowerShell window helper. No extra helper process, input injection or screen capture is added. The actual Win32/PowerShell path is not executable in this Linux environment; simulated state is not a substitute for Windows-native QA.
- 3 local lab checks and all 8 real DOM browser cases pass. Native drag checks remain outside the site's score. Packaged resource checks include the unpacked Windows helper and button-state module.
- Installer is cross-built and unsigned. Actual Windows installation, physical button sampling and long-running mouse operation remain unverified. Website hosting stays local.

# Caprii 0.6.2 validation

- 181 application tests cover direct Spotify/YouTube routing, all shared known-site aliases, arbitrary URL/domain preservation, explicit app/music/multistep separation, unknown-site clarification, canceled launches and OS shell HTTPS delegation. The OS handler is stubbed; this does not prove a real Windows browser opened.
- 3 Test Lab checks and all 8 real DOM browser cases are retained; informational external-browser examples are checked separately and never count as a DOM pass.
- Packaged resource validation checks versions, Windows x64 PE, bundled runtime/fonts/extension and local Test Lab from ASAR. Actual Windows installation and default-browser launch remain untested here. Installer is cross-built and unsigned. Website hosting is not deployed.

# Caprii 0.6.1 validation

- 173 application tests pass, including native click-through lock during drag/rearm, release/reload state, cursor sampling without DOM move events, no concurrent cursor requests and discarded late samples after release/stop.
- Real Electron transparent nonfocusable sprite fixture passes mouse-only drag after blur/lost mouse capture, cursor-sampler movement with controlled cursor coordinates and absent DOM moves, right-button release isolation, tray pickup/place/cancel, and ordinary hold/release. The fixture uses a virtual viewport and controlled cursor samples; it is not a Windows-native mouse test.
- 3 local lab checks and all 8 real browser cases pass. Test Lab stays local; no website deployment.
- Packaged resource validation checks ASAR/extension versions, Windows x64 PE, Python/fonts/DOM bridge and live Test Lab from ASAR.
- Actual Windows installation, mouse hooks, native cursor/capture delivery and shortcut availability on the user's PC remain untested. Installer is cross-built and unsigned. A tray pickup mode is provided so movement does not require holding a mouse button or a working pointer stream.

# Caprii 0.6.0 validation

- 165 app regression tests pass, including language selection/persistence, image-preserving English repair, intact tool JSON, selected local speech voice, independent screen/idle settings, capture failure and disabling/re-enabling while vision is pending.
- Real Electron Capri sprite test passes: alpha hit, busy/refusal override, pointer capture, drag outside the original sprite, release and pointer cancellation. This validates renderer input in a virtual viewport, not Windows click-through hooks.
- Live Gemini 3.5 Flash Lite read a synthetic screen capture and correctly returned READY-60 and Blue in English despite a Thai question. No private screen was used. This is one fixture, not a general accuracy guarantee.
- 3 lab unit/server checks and all 8 real browser cases pass. Attachment/clipboard UI regression passes. Test Lab stays local.
- Packaged-resource verification covers versions, Windows x64 PE, bundled Python/fonts/DOM bridge and live Test Lab from ASAR. Actual Windows installation, OS voice availability and Windows mouse hooks remain untested here. Installer is cross-built and unsigned.

# Caprii 0.5.9 validation

- 157 app tests and 3 lab unit/server checks pass, including exact screenshot phrases, read/write separation, selected-tab IPC routing, observation-derived field reports and rejection of unverified success narratives.
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
