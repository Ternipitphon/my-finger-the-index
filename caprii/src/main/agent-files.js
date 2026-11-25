'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { runProcess, scriptEnvironment } = require('./agent-process');
const { text } = require('./agent-registry');
const BLOCKED = /(^|[\\/])(\.git|\.capri-backups|node_modules|\.env(?:\.[^\\/]*)?|\.aws|\.ssh|\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519|credentials[^\\/]*|[^\\/]*\.(?:pem|key|p12))([\\/]|$)/i;

async function projectPath(root, relative) {
  text(relative, 'path', 2000);
  const parts = relative.split(/[\\/]/);
  if (path.isAbsolute(relative) || BLOCKED.test(relative) || parts.some(p => p === '..' || /[:\x00-\x1f]/.test(p) || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) throw new Error('Path is not permitted');
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) throw new Error('Path escapes project');
  let cursor = root;
  for (const part of path.relative(root, target).split(path.sep)) {
    cursor = path.join(cursor, part);
    try { if ((await fs.lstat(cursor)).isSymbolicLink()) throw new Error('Symlinks are not permitted'); }
    catch (err) { if (err.code !== 'ENOENT') throw err; }
  }
  return target;
}
async function readSmall(file) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > 64000) throw new Error('Only regular files up to 64 KB are supported');
  return fs.readFile(file);
}
async function backupFile(root, relative, session, previous) {
  const backup = path.join(root, '.capri-backups', session, relative);
  let cursor = root;
  for (const part of path.relative(root, backup).split(path.sep)) {
    cursor = path.join(cursor, part);
    try { if ((await fs.lstat(cursor)).isSymbolicLink()) throw new Error('Backup path cannot be a symlink'); }
    catch (err) { if (err.code !== 'ENOENT') throw err; }
  }
  await fs.mkdir(path.dirname(backup), { recursive: true });
  await fs.writeFile(backup, previous, { flag: 'wx' }).catch(err => { if (err.code !== 'EEXIST') throw err; });
  return path.relative(root, backup);
}

function registerFiles(registry) {
  registry.add('list', {
    description: { path: 'relative directory, or . for root', purpose: 'List project files, excluding secrets and dependencies' },
    validate: a => text(a.path, 'path', 2000),
    run: async (a, c) => {
      await c.permission({ tool: a.tool, path: a.path, note: 'File names will be sent to the AI provider.' });
      const dir = a.path === '.' ? c.root : await projectPath(c.root, a.path);
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter(e => !e.isSymbolicLink() && !BLOCKED.test(e.name)).slice(0, 100).map(e => ({ name: e.name, directory: e.isDirectory() }));
    },
  });
  registry.add('search', {
    description: { query: 'file-name substring', purpose: 'Find files within the selected project, max 1000 entries and depth 6; no symlinks or secret files' },
    validate: a => text(a.query, 'search query', 200),
    run: async (a, c) => {
      await c.permission({ tool: a.tool, query: a.query, note: 'Search file names inside the chosen project and send matches to AI' });
      const matches = [], queue = [{ path: c.root, depth: 0 }]; let seen = 0;
      while (queue.length && seen < 1000 && matches.length < 50) {
        c.signal.throwIfAborted();
        const dir = queue.shift();
        for (const entry of await fs.readdir(dir.path, { withFileTypes: true })) {
          if (++seen > 1000) break;
          if (entry.isSymbolicLink() || BLOCKED.test(entry.name)) continue;
          const full = path.join(dir.path, entry.name), relative = path.relative(c.root, full);
          if (entry.name.toLowerCase().includes(a.query.toLowerCase())) matches.push({ path: relative, directory: entry.isDirectory() });
          if (entry.isDirectory() && dir.depth < 6) queue.push({ path: full, depth: dir.depth + 1 });
        }
      }
      return { matches, limited: queue.length > 0 || seen >= 1000 };
    },
  });
  registry.add('read', {
    description: { path: 'relative file', purpose: 'Read UTF-8 content, max 64 KB. Never read secrets.' },
    validate: a => text(a.path, 'path', 2000),
    run: async (a, c) => {
      await projectPath(c.root, a.path);
      await c.permission({ tool: a.tool, path: a.path, note: 'The file contents will be sent to the AI provider. Do not approve files containing secrets.' });
      return (await readSmall(await projectPath(c.root, a.path))).toString('utf8');
    },
  });
  registry.add('write', {
    description: { path: 'relative file', content: 'complete UTF-8 file content, max 64 KB', purpose: 'Write with approval and original backup; verify with check afterwards' },
    modifies: true,
    validate: a => { text(a.path, 'path', 2000); if (typeof a.content !== 'string' || Buffer.byteLength(a.content) > 64000) throw new Error('Invalid content or file too large'); },
    run: async (a, c) => {
      let previous = null;
      const file = await projectPath(c.root, a.path);
      try { previous = await readSmall(file); } catch (err) { if (err.code !== 'ENOENT') throw err; }
      await c.permission({ tool: a.tool, path: a.path, before: previous?.toString('utf8') ?? '(new file)', after: a.content });
      await projectPath(c.root, a.path);
      const current = await fs.readFile(file).catch(err => { if (err.code === 'ENOENT') return null; throw err; });
      if ((current === null) !== (previous === null) || (current && !current.equals(previous))) throw new Error('File changed while waiting for approval');
      const backup = previous === null ? null : await backupFile(c.root, a.path, c.session, previous);
      await fs.mkdir(path.dirname(file), { recursive: true });
      c.signal.throwIfAborted();
      // Open without following symlinks (supported on Unix; prevalidated above on Windows).
      const constants = require('node:fs').constants;
      const flags = constants.O_WRONLY | constants.O_CREAT | (previous === null ? constants.O_EXCL : 0) | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW);
      const handle = await fs.open(file, flags, 0o600);
      try { await handle.truncate(0); await handle.writeFile(a.content); } finally { await handle.close(); }
      return { written: a.path, backup, verified: (await fs.readFile(file, 'utf8')) === a.content };
    },
  });
  registry.add('move', {
    description: { from: 'relative source file', to: 'relative new file', purpose: 'Move an approved file without overwriting a destination; back up source first' },
    modifies: true,
    validate: a => { text(a.from, 'source path', 2000); text(a.to, 'destination path', 2000); },
    run: async (a, c) => {
      const source = await projectPath(c.root, a.from), target = await projectPath(c.root, a.to);
      const before = await readSmall(source);
      try { await fs.lstat(target); throw new Error('Destination already exists'); } catch (err) { if (err.code !== 'ENOENT') throw err; }
      await c.permission({ tool: a.tool, from: a.from, to: a.to, note: 'Move this file: create the destination, then remove the original after backing it up' });
      await projectPath(c.root, a.from); await projectPath(c.root, a.to);
      if (!(await readSmall(source)).equals(before)) throw new Error('Source changed while waiting for approval');
      const backup = await backupFile(c.root, a.from, c.session, before);
      await fs.mkdir(path.dirname(target), { recursive: true });
      c.signal.throwIfAborted();
      await fs.writeFile(target, before, { flag: 'wx' });
      // Only delete the source after confirming the destination contains identical bytes.
      if (!(await readSmall(target)).equals(before)) throw new Error('Destination verification failed; original retained');
      await projectPath(c.root, a.from);
      if (!(await readSmall(source)).equals(before)) throw new Error('Source changed during move; both files retained');
      await fs.unlink(source);
      return { moved: true, from: a.from, to: a.to, backup };
    },
  });
  registry.add('check', {
    description: { script: 'test, build, typecheck, lint', purpose: 'Run an approved package script, with process-tree cancellation and real exit-code evidence' },
    validate: a => { if (!['test', 'build', 'typecheck', 'lint'].includes(a.script)) throw new Error('Unsupported check'); },
    run: async (a, c) => {
      const file = await projectPath(c.root, 'package.json');
      const before = await readSmall(file);
      const manifest = JSON.parse(before.toString('utf8'));
      if (!manifest.scripts?.[a.script]) throw new Error('Script not found');
      const commands = Object.fromEntries([`pre${a.script}`, a.script, `post${a.script}`].filter(k => manifest.scripts[k]).map(k => [k, manifest.scripts[k]]));
      await c.permission({ tool: a.tool, script: a.script, commands, note: 'These scripts can run arbitrary code, modify files, or use the network. Output will be sent to the AI. Approve only trusted projects.' });
      if (!(await readSmall(await projectPath(c.root, 'package.json'))).equals(before)) throw new Error('Package scripts changed while waiting for approval');
      const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
      const args = process.platform === 'win32' ? ['/d', '/s', '/c', `npm run ${a.script}`] : ['run', a.script];
      const result = await runProcess(command, args, { cwd: c.root, signal: c.signal, env: scriptEnvironment(), timeoutMs: 60000 });
      return { ...result, script: a.script };
    },
  });
  return registry;
}
module.exports = { registerFiles, projectPath };
