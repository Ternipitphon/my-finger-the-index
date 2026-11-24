// SPDX-License-Identifier: GPL-3.0-only
import { existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { writeJsonAtomic } from './atomic-json.mjs';
export const RESPONSE_LENGTHS = Object.freeze({
  short: 'Prefer one to three short sentences. Give the answer or action result first.',
  balanced: 'Give a concise answer with the context needed to understand it.',
  detailed: 'Explain the useful reasoning and steps, with examples when helpful.',
});
function location(workspace) {
  const folder = path.join(workspace, '.capri');
  if (
    existsSync(folder) &&
    (!lstatSync(folder).isDirectory() || lstatSync(folder).isSymbolicLink())
  )
    throw new Error('Response settings folder must not be linked.');
  return path.join(folder, 'response-length.json');
}
export function readResponseLength(workspace) {
  const file = location(workspace);
  try {
    const info = lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 4096) return 'short';
    const value = JSON.parse(readFileSync(file, 'utf8'));
    return value.schemaVersion === 1 && Object.hasOwn(RESPONSE_LENGTHS, value.length)
      ? value.length
      : 'short';
  } catch {
    return 'short';
  }
}
export function validateResponseLength(length) {
  if (typeof length !== 'string' || !Object.hasOwn(RESPONSE_LENGTHS, length))
    throw new Error('Unknown response length.');
  return length;
}
export function saveResponseLength(workspace, length) {
  validateResponseLength(length);
  const file = location(workspace);
  if (existsSync(file) && (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()))
    throw new Error('Response settings must be a regular file.');
  mkdirSync(path.dirname(file), { recursive: true });
  writeJsonAtomic(file, { schemaVersion: 1, length });
  return length;
}
export function responseLengthInstruction(length = 'short') {
  if (!Object.hasOwn(RESPONSE_LENGTHS, length)) length = 'short';
  return `RESPONSE LENGTH: ${length}\n${RESPONSE_LENGTHS[length]} Follow explicit requests for more or less detail. Preserve necessary warnings, code, structured output and accurate tool results. Never claim an action succeeded without evidence. This is writing guidance, not a hard character limit.`;
}
