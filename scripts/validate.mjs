#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const required = [
  'README.md',
  'README.en.md',
  'package.json',
  'bin/lobster-pm.mjs',
  'docs/installation.zh-CN.md',
  'docs/installation.en.md',
  'docs/architecture.md',
  'docs/roles-and-heartbeats.md',
  'docs/task-system.md',
  'docs/agent-chat-bus.md',
  'docs/evolution-system.md',
  'docs/starter-guide.md'
];

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /gho_[A-Za-z0-9_]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /password\s*[:=]\s*["']?[^"'\s]+/i,
  /api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i
];

let ok = true;
for (const file of required) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    console.error(`missing: ${file}`);
    ok = false;
  }
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'demo-workspace'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  if (rel === '.env.example') continue;
  if (!/\.(md|json|mjs|js|yml|yaml|txt|example|gitignore)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) {
      console.error(`possible secret in ${rel}: ${pattern}`);
      ok = false;
    }
  }
}

if (!ok) process.exit(1);
console.log('validation ok');
