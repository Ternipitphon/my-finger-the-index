// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { temporaryFolders } from './temporary-folders.mjs';
import {
  readResponseLength,
  saveResponseLength,
  responseLengthInstruction,
} from '../packages/runtime/src/response-length.mjs';
import { personaPrompt } from '../packages/runtime/src/context.mjs';
import { savePersonality } from '../packages/runtime/src/personality.mjs';
import { root } from '../packages/runtime/src/host/paths.mjs';
import { registerCompanionIpc } from '../apps/desktop/main/companion-ipc.mjs';
const folder = temporaryFolders('capri-length-');
test('response preference survives reloading and invalid writes preserve the last choice', () => {
  const workspace = folder();
  assert.equal(readResponseLength(workspace), 'short');
  for (const length of ['short', 'balanced', 'detailed']) {
    saveResponseLength(workspace, length);
    assert.equal(readResponseLength(workspace), length);
  }
  assert.throws(() => saveResponseLength(workspace, 'invented'));
  assert.equal(readResponseLength(workspace), 'detailed');
  writeFileSync(path.join(workspace, '.capri/response-length.json'), '{broken');
  assert.equal(readResponseLength(workspace), 'short');
});
test('IPC choice reaches the next prompt without altering the character; preview is reversible', () => {
  const workspace = folder(),
    handlers = new Map();
  const character = 'A custom character. Keep my wording.';
  savePersonality(workspace, character);
  registerCompanionIpc((name, handler) => handlers.set(name, handler), {
    root,
    state: workspace,
    rt: { workspace },
    preferences: {},
    shell: {},
    assertIdle() {},
  });
  assert.equal(handlers.get('capri:personality-get')().responseLength, 'short');
  handlers.get('capri:response-length')('detailed');
  assert.equal(handlers.get('capri:personality-get')().responseLength, 'detailed');
  assert.match(personaPrompt({ workspace }), /RESPONSE LENGTH: detailed/);
  assert.match(
    personaPrompt({ workspace }, { responseLength: 'balanced' }),
    /RESPONSE LENGTH: balanced/,
  );
  assert.equal(readResponseLength(workspace), 'detailed');
  assert.equal(readFileSync(path.join(workspace, 'PERSONALITY.md'), 'utf8'), character);
  assert.match(responseLengthInstruction('short'), /Follow explicit requests/);
  assert.match(responseLengthInstruction('short'), /structured output/);
});
test('linked settings cannot read or overwrite another file', (t) => {
  const workspace = folder(),
    outside = path.join(workspace, 'outside.json');
  mkdirSync(path.join(workspace, '.capri'));
  writeFileSync(outside, 'untouched');
  const file = path.join(workspace, '.capri/response-length.json');
  try {
    symlinkSync(outside, file);
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('OS denies creating symlinks');
    throw error;
  }
  assert.equal(readResponseLength(workspace), 'short');
  assert.throws(() => saveResponseLength(workspace, 'short'));
  assert.equal(readFileSync(outside, 'utf8'), 'untouched');
  rmSync(path.join(workspace, '.capri'), { recursive: true });
  const linked = path.join(workspace, 'linked');
  mkdirSync(linked);
  symlinkSync(linked, path.join(workspace, '.capri'), 'junction');
  assert.throws(() => saveResponseLength(workspace, 'short'));
});
