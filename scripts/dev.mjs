// Starts the API and the admin app (the page builder is served by admin at /build) together with prefixed output. Ctrl+C stops all.
// Needs `npm run dev:infra` (Docker) and `npm run setup:local` once beforehand.
import { spawn } from 'node:child_process';

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
const killTree = (c) => (process.platform === 'win32' ? spawn('taskkill', ['/pid', String(c.pid), '/T', '/F']) : c.kill());
const stop = () => { children.forEach(killTree); setTimeout(() => process.exit(), 500); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
console.log('API http://localhost:3001  |  Admin http://localhost:5173  |  Page Builder http://localhost:5173/build  |  Site http://localhost:8080');
