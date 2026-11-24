// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { _electron } from 'playwright-core';
import { root, runtime, initialize, environment } from '../../packages/runtime/src/index.mjs';
import { settingsView, saveSettings } from './settings-view.mjs';

const parent = path.join(root, '.runtime/response-length-verification');
mkdirSync(parent, { recursive: true });
const folder = mkdtempSync(path.join(parent, 'fixture-'));
const server = createServer((_request, response) => {
  response.setHeader('content-type', 'application/json');
  response.end('{"data":[]}');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const rt = runtime({
  stateDir: path.join(folder, 'openclaw'),
  workspace: path.join(folder, 'workspace'),
  gatewayPort: port,
});
initialize(rt);
const env = {
  ...environment(rt),
  CAPRI_DESKTOP_VERIFICATION_DIR: folder,
  CAPRI_DESKTOP_VERIFICATION_PORT: String(port),
  CAPRI_DESKTOP_VERIFICATION_SKIP_START: '1',
};
delete env.ELECTRON_RUN_AS_NODE;
let application;
const errors = [];
async function launch() {
  application = await _electron.launch({
    executablePath: createRequire(import.meta.url)('electron'),
    args: [path.join(root, 'apps/desktop/main.mjs'), '--verification'],
    env,
    timeout: 60000,
  });
  application.on('window', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  const owner = await application.firstWindow();
  await owner.waitForFunction(() => document.body.dataset.phase === 'ready', null, {
    timeout: 60000,
  });
  return settingsView(application, 'personality');
}
try {
  let page = await launch();
  const original = await page.locator('#personality-text').inputValue();
  assert.equal(await page.locator('#response-length').inputValue(), 'short');
  await page.locator('#response-length').selectOption('detailed');
  await saveSettings(page);
  const file = path.join(rt.workspace, '.capri/response-length.json');
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).length, 'detailed');
  await page.locator('#response-length').selectOption('balanced');
  await page.locator('#settings-window-close').click();
  await page.locator('#settings-discard').click();
  page = await settingsView(application, 'personality');
  assert.equal(await page.locator('#response-length').inputValue(), 'detailed');
  assert.equal(await page.locator('#personality-text').inputValue(), original);
  await application.close();
  application = null;
  page = await launch();
  assert.equal(await page.locator('#response-length').inputValue(), 'detailed');
  assert.equal(await page.locator('#personality-text').inputValue(), original);
  assert.deepEqual(errors, []);
  console.log(
    'PASS response length saves, discards and survives restart without changing the character.',
  );
} finally {
  if (application) await application.close();
  await new Promise((resolve) => server.close(resolve));
}
