// SPDX-License-Identifier: GPL-3.0-only
// Keep the original installer implementation; reuse the verified unchanged
// camera and voice artifacts from the exact upstream base release.
import path from 'node:path';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, copyFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { root, writeJsonAtomic } from '../../packages/runtime/src/index.mjs';
import { exportSource } from './source-export.mjs';
import { exportVoicePack } from './voice-pack-export.mjs';
import { fileHash } from '../../packages/installer/src/download.mjs';
import { copyRussianVoicePack } from '../../packages/installer/src/voice-pack.mjs';
import russianVoice from '../../config/qwen-ru-voice.json' with { type: 'json' };
import { parseVersion, REPOSITORY } from '../../packages/updater/src/releases.mjs';

if (process.platform !== 'win32') throw new Error('Build the installer on Windows.');
const base = path.join(root, 'release/upstream-base');
const provenance = JSON.parse(readFileSync(path.join(base, 'provenance.json'), 'utf8'));
if (
  provenance.repository !== 'CapriChooms/CapriCore' ||
  provenance.tag !== 'v1.2.2' ||
  provenance.installerSha256 !== 'f7752a4b4354bbff95f1e6c60163891d5e37d2ad9f10acf2f7c9e6e4465cb2ed'
)
  throw new Error('Unexpected base release.');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const release = JSON.parse(readFileSync(path.join(root, 'config/release.json'), 'utf8'));
if (release.repository !== REPOSITORY || parseVersion(release.tag).version !== version)
  throw new Error('Release metadata mismatch.');
using source = exportSource({ temporary: true });
const parent = path.join(root, 'release');
mkdirSync(parent, { recursive: true });
const folder = mkdtempSync(path.join(parent, `installer-${version}-`));
const voice = exportVoicePack({
  source: path.join(base, 'voice'),
  destination: path.join(folder, 'voice-pack'),
});
copyRussianVoicePack(path.join(base, 'voice/russian'), path.join(voice.directory, 'russian'));
const result = spawnSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    path.join(root, 'tools/release/build-installer.ps1'),
    '-Source',
    source.destination,
    '-Destination',
    folder,
    '-Version',
    version,
    '-CameraPack',
    path.join(base, 'camera'),
    '-VoicePack',
    voice.directory,
  ],
  { encoding: 'utf8', windowsHide: true },
);
if (result.error || result.status !== 0)
  throw new Error(result.error?.message || result.stdout + '\n' + result.stderr);
const executable = path.join(folder, `CapriSetup-${version}.exe`);
if (!existsSync(executable)) throw new Error('Installer output missing.');
const voiceFile = 'capri-test-voices.zip';
copyFileSync(path.join(base, 'capri-en-v1.zip'), path.join(folder, 'capri-en-v1.zip'));
copyFileSync(path.join(folder, 'voice.zip'), path.join(folder, voiceFile));
writeJsonAtomic(path.join(folder, 'BUILD_MANIFEST.json'), {
  schemaVersion: 1,
  version,
  releaseTag: release.tag,
  executable: path.basename(executable),
  sha256: await fileHash(executable),
  sourcePayloadSha256: await fileHash(path.join(folder, 'source.zip')),
  sourceFiles: source.files,
  bundledVoice: {
    id: voice.manifest.id,
    file: voiceFile,
    bytes: statSync(path.join(folder, voiceFile)).size,
    sha256: await fileHash(path.join(folder, voiceFile)),
    files: voice.manifest.files,
    russianTestVoice: {
      repository: russianVoice.model,
      revision: russianVoice.revision,
      files: russianVoice.pack.files.map(({ file, bytes, sha256 }) => ({
        path: 'russian/' + file,
        bytes,
        sha256,
      })),
    },
  },
  originalNativeResources: provenance,
  signature: 'unsigned release build',
});
console.log(JSON.stringify({ executable }));
