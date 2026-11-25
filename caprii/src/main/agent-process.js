'use strict';
const { spawn, execFile } = require('node:child_process');

// A separate process group makes Stop terminate npm's child processes on Unix.
// On Windows taskkill /T /F terminates the command tree, rather than only cmd.exe.
function runProcess(file, args, { cwd, signal, timeoutMs = 60000, maxBytes = 128000, input, env = process.env } = {}) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    let stdout = '', stderr = '', bytes = 0, reason = null, stopped = false;
    const child = spawn(file, args, { cwd, env, detached: process.platform !== 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const stop = (why) => {
      if (stopped) return;
      stopped = true; reason = why;
      if (!child.pid) return;
      if (process.platform === 'win32') execFile('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true }, () => {});
      else { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
    };
    const aborted = () => stop('cancelled');
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) aborted();
    const timer = setTimeout(() => stop('timeout'), timeoutMs);
    const clean = () => { clearTimeout(timer); signal?.removeEventListener('abort', aborted); };
    for (const [stream, key] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) stream.setEncoding('utf8').on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBytes) { stop('output_limit'); return; }
      if (key === 'stdout') stdout += chunk.toString('utf8'); else stderr += chunk.toString('utf8');
    });
    child.once('error', (err) => { clean(); reject(err); });
    child.once('close', (code) => {
      clean();
      if (reason) return reject(Object.assign(new Error(reason === 'cancelled' ? 'stopped' : 'Process ' + reason), { code: reason }));
      resolve({ passed: code === 0, exitCode: code, stdout, stderr });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input || '');
  });
}

// Do not pass provider keys or inherited login tokens into project scripts.
function scriptEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !/(?:API_?KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTHORIZATION)/i.test(key)));
}
module.exports = { runProcess, scriptEnvironment };
