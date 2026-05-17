#!/usr/bin/env node
// Copy root web assets into www/ so Capacitor's cap sync picks up the
// latest edits. Same pattern as customer-app/scripts/sync-www.js.

const fs   = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const FILES = ['index.html', 'manifest.json', 'sw.js', 'privacy-policy.html', 'terms.html', 'icon.svg'];
const DIRS  = ['js', 'css'];

let copied = 0;

function copyFile(rel) {
  const src = path.join(root, rel);
  const dst = path.join(root, 'www', rel);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dst), { recursive: true });

  if (fs.existsSync(dst)) {
    const a = fs.statSync(src);
    const b = fs.statSync(dst);
    if (a.size === b.size && a.mtimeMs === b.mtimeMs) return;
  }
  fs.copyFileSync(src, dst);
  const m = fs.statSync(src).mtime;
  fs.utimesSync(dst, m, m);
  copied++;
}

for (const f of FILES) copyFile(f);
for (const d of DIRS) {
  const dir = path.join(root, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (fs.statSync(path.join(dir, f)).isFile()) copyFile(path.join(d, f));
  }
}

console.log(`sync-www: ${copied} file(s) updated`);
