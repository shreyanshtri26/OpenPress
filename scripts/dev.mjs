// Starts the API and the admin app (the page builder is served by admin at /build) together with prefixed output. Ctrl+C stops all.
// Needs `npm run dev:infra` (Docker) and `npm run setup:local` once beforehand.
import { spawn, spawnSync, execSync } from 'node:child_process';

// Ensure ports used by OpenPress are freed from previous aborted runs (common on Windows)
if (process.platform === 'win32') {
  for (const port of [3001, 5173, 8080]) {
    try {
      const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const pids = new Set();
      for (const line of out.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        const state = parts[3];
        const pid = parts[parts.length - 1];
        if ((state === 'LISTENING' || state === 'ESTABLISHED') && pid && pid !== '0' && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try { spawnSync('taskkill', ['/pid', pid, '/T', '/F'], { stdio: 'ignore' }); } catch {}
      }
    } catch {}
  }
}

const apps = [
  ['api', 'npm run dev -w apps/api', '\x1b[36m'],
  ['admin', 'npm run dev -w apps/admin -- --port 5173 --strictPort', '\x1b[32m'],
];

const children = apps.map(([name, cmd, color]) => {
  const child = spawn(cmd, { shell: true, env: { ...process.env, FORCE_COLOR: '1' } });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) => stream.on('data', (d) => out.write(d.toString().replace(/^(?=.)/gm, prefix)));
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => console.log(`${prefix}exited (${code})`));
  return child;
});

// On Windows, killing the shell leaves node/vite running; kill each process tree instead.
const killTree = (c) => {
  if (!c || !c.pid) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      c.kill();
    }
  } catch {}
};

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  children.forEach(killTree);
  setTimeout(() => process.exit(), 300);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('exit', () => children.forEach(killTree));

console.log('API http://localhost:3001  |  Admin http://localhost:5173  |  Page Builder http://localhost:5173/build  |  Site http://localhost:8080');
