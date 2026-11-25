#!/usr/bin/env node
/**
 * Enforce the project's "no AI-style dash" rule (CONSTITUTION.md, Article XI).
 *
 * The em dash character U+2014 is prohibited in first-party content. Vendored
 * third-party skills under .opencode/ are exempt, as are generated lockfiles
 * and binary assets.
 *
 * Usage:
 *   node scripts/check-no-ai-dash.mjs          # check (exit 1 on violations)
 *   node scripts/check-no-ai-dash.mjs --fix    # replace U+2014 with "-"
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const FIX = process.argv.includes('--fix');
const EM_DASH = '\u2014';
const MAX_BYTES = 2 * 1024 * 1024;

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.agents', // vendored third-party skills are exempt
  '.opencode', // vendored third-party skills are exempt
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
]);

const SKIP_FILES = new Set([
  'pnpm-lock.yaml', // generated
  'tsconfig.tsbuildinfo', // generated
]);

const SKIP_EXTENSIONS = new Set([
  '.7z',
  '.avif',
  '.bmp',
  '.db',
  '.eot',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mp3',
  '.mp4',
  '.otf',
  '.pdf',
  '.png',
  '.sqlite',
  '.sqlite3',
  '.ttf',
  '.webp',
  '.woff',
  '.woff2',
  '.zip',
]);

function extensionOf(name) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

function isBinary(buffer) {
  const sample = buffer.subarray(0, 1024);
  for (const byte of sample) {
    if (byte === 0) return true;
  }
  return false;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;

    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      walk(full, files);
      continue;
    }

    if (!stat.isFile()) continue;
    if (stat.size > MAX_BYTES) continue;
    if (SKIP_FILES.has(entry)) continue;
    if (SKIP_EXTENSIONS.has(extensionOf(entry))) continue;

    const buffer = readFileSync(full);
    if (isBinary(buffer)) continue;

    files.push({ full, text: buffer.toString('utf8') });
  }

  return files;
}

const files = walk(ROOT);
const violations = [];
let fixedFiles = 0;
let fixedDashes = 0;

for (const file of files) {
  if (!file.text.includes(EM_DASH)) continue;

  if (FIX) {
    const count = file.text.split(EM_DASH).length - 1;
    writeFileSync(file.full, file.text.replaceAll(EM_DASH, '-'), 'utf8');
    fixedFiles += 1;
    fixedDashes += count;
    continue;
  }

  file.text.split(/\r?\n/).forEach((line, index) => {
    if (!line.includes(EM_DASH)) return;
    violations.push({
      file: relative(ROOT, file.full),
      line: index + 1,
      text: line.trim().replaceAll(EM_DASH, '<U+2014>'),
    });
  });
}

if (FIX) {
  console.log(`Replaced ${fixedDashes} em dash(es) in ${fixedFiles} file(s).`);
  process.exit(0);
}

if (violations.length === 0) {
  console.log('No AI-style em dash (U+2014) found in first-party content.');
  process.exit(0);
}

console.error(
  `Found ${violations.length} line(s) containing the prohibited em dash (U+2014):`,
);
for (const violation of violations) {
  console.error(`${violation.file}:${violation.line}: ${violation.text}`);
}
console.error(
  '\nReplace it with "-", ",", ":", "()", or a period. See CONSTITUTION.md, Article XI.',
);
process.exit(1);
