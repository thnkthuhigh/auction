#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Automated setup script for new team members.
 * Run: node scripts/setup.mjs
 */
import { execSync, spawnSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function log(msg) {
  console.log(msg);
}
function success(msg) {
  log(`${GREEN}✓${RESET} ${msg}`);
}
function warn(msg) {
  log(`${YELLOW}⚠${RESET}  ${msg}`);
}
function error(msg) {
  log(`${RED}✗${RESET} ${msg}`);
}
function info(msg) {
  log(`${CYAN}→${RESET} ${msg}`);
}
function header(msg) {
  log(`\n${BOLD}${msg}${RESET}`);
}

function run(cmd, opts = {}) {
  return spawnSync(cmd, { shell: true, cwd: ROOT, stdio: 'inherit', ...opts });
}

function runCapture(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

// ─── 1. Check Node version ────────────────────────────────────────────────────
header('1/6  Checking Node.js version...');
const nodeVersion = process.versions.node;
const [major] = nodeVersion.split('.').map(Number);
if (major < 20) {
  error(`Node.js 20+ is required. Your version: ${nodeVersion}`);
  error(
    'Please install Node.js 20 via https://nodejs.org or use nvm: nvm install 20 && nvm use 20',
  );
  process.exit(1);
}
success(`Node.js ${nodeVersion} — OK`);

// ─── 2. Check Docker ──────────────────────────────────────────────────────────
header('2/6  Checking Docker...');
const dockerVersion = runCapture('docker --version');
if (!dockerVersion) {
  error('Docker is not installed or not in PATH.');
  error('Install Docker Desktop: https://www.docker.com/products/docker-desktop/');
  process.exit(1);
}
const dockerRunning = runCapture('docker info');
if (!dockerRunning) {
  error('Docker is installed but not running. Please start Docker Desktop and re-run this script.');
  process.exit(1);
}
success(`${dockerVersion} — running`);

// ─── 3. Install dependencies ─────────────────────────────────────────────────
header('3/6  Installing npm dependencies...');
info('Running npm install (this may take a minute)...');
const install = run('npm install');
if (install.status !== 0) {
  error('npm install failed. See output above for details.');
  process.exit(1);
}
success('All dependencies installed');

// ─── 4. Copy .env files ───────────────────────────────────────────────────────
header('4/6  Setting up environment files...');

const envFiles = [
  { example: resolve(ROOT, '.env.example'), target: resolve(ROOT, '.env') },
  { example: resolve(ROOT, 'backend', '.env.example'), target: resolve(ROOT, 'backend', '.env') },
  { example: resolve(ROOT, 'frontend', '.env.example'), target: resolve(ROOT, 'frontend', '.env') },
];

for (const { example, target } of envFiles) {
  const rel = target.replace(ROOT + '\\', '').replace(ROOT + '/', '');
  if (!existsSync(example)) {
    warn(`No .env.example found for ${rel}, skipping`);
    continue;
  }
  if (existsSync(target)) {
    warn(`${rel} already exists — skipping (delete it and re-run to reset)`);
  } else {
    copyFileSync(example, target);
    success(`Created ${rel}`);
  }
}

// ─── 5. Start Docker services ─────────────────────────────────────────────────
header('5/6  Starting PostgreSQL & Redis...');
info('Running docker-compose up -d postgres redis...');
const dcUp = run('docker-compose up -d postgres redis');
if (dcUp.status !== 0) {
  error('docker-compose failed. Make sure Docker Desktop is running.');
  process.exit(1);
}

// Wait for Postgres to be healthy
info('Waiting for PostgreSQL to be ready...');
let pgReady = false;
for (let i = 0; i < 30; i++) {
  const result = runCapture('docker-compose exec -T postgres pg_isready -U postgres');
  if (result && result.includes('accepting connections')) {
    pgReady = true;
    break;
  }
  process.stdout.write('.');
  await new Promise((r) => setTimeout(r, 1000));
}
process.stdout.write('\n');

if (!pgReady) {
  error('PostgreSQL did not become ready in time. Try running the script again.');
  process.exit(1);
}
success('PostgreSQL is ready');
success('Redis is running');

// ─── 6. Run Prisma migrations & seed ─────────────────────────────────────────
header('6/6  Initialising database...');
info('Running Prisma migrations...');
const migrate = run('npm run prisma:migrate --workspace=backend');
if (migrate.status !== 0) {
  error('Prisma migration failed. Check backend/.env DATABASE_URL is correct.');
  process.exit(1);
}
success('Database schema applied');

info('Seeding database with demo data...');
const seed = run('npm run prisma:seed --workspace=backend');
if (seed.status !== 0) {
  warn('Seeding failed or already seeded — this is usually fine, continuing.');
} else {
  success('Demo data seeded');
}

// ─── Done! ─────────────────────────────────────────────────────────────────────
log(`
${GREEN}${BOLD}╔══════════════════════════════════════════════════╗
║           Setup complete! 🎉                     ║
╚══════════════════════════════════════════════════╝${RESET}

${BOLD}Quick start:${RESET}
  ${CYAN}npm run dev${RESET}            → start backend + frontend together
  ${CYAN}npm run dev:backend${RESET}   → backend only (port 5000)
  ${CYAN}npm run dev:frontend${RESET}  → frontend only (port 5173)

${BOLD}Demo accounts (after seed):${RESET}
  Admin  : admin@auction.com   / password123
  Seller : seller@auction.com  / password123
  Buyer  : buyer@auction.com   / password123

${BOLD}Useful commands:${RESET}
  ${CYAN}npm run lint${RESET}           → check linting
  ${CYAN}npm run type-check${RESET}     → TypeScript check all packages
  ${CYAN}npm run format${RESET}         → format all files with Prettier
  ${CYAN}npm run docker:up${RESET}      → start all Docker services
  ${CYAN}npm run docker:down${RESET}    → stop all Docker services

${BOLD}Read before committing:${RESET}  CONTRIBUTING.md
`);
