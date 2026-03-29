import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const isCI =
  process.env.CI === 'true' ||
  process.env.VERCEL === '1' ||
  process.env.RENDER === 'true' ||
  process.env.NODE_ENV === 'production';

if (process.env.HUSKY === '0' || isCI) {
  process.exit(0);
}

const huskyBin = resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'husky.cmd' : 'husky',
);

if (!existsSync(huskyBin)) {
  process.exit(0);
}

const result = spawnSync(huskyBin, [], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if ((result.status ?? 0) !== 0) {
  process.exit(result.status ?? 1);
}
