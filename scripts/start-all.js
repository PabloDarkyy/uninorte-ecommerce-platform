import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['scripts/serve.js'], { stdio: 'inherit', cwd: process.cwd(), env: process.env }),
  spawn(process.execPath, ['backend/src/server.js'], { stdio: 'inherit', cwd: process.cwd(), env: process.env }),
];

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 200);
}

for (const child of children) {
  child.on('error', () => shutdown(1));
  child.on('exit', code => {
    if (!shuttingDown && code !== 0) shutdown(code || 1);
  });
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
