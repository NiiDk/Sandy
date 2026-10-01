'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const standalonePath = path.join(root, 'standalone.html');
const outDir = path.join(root, 'assets', 'thumbnails');

if (!fs.existsSync(standalonePath)) {
  console.error('Error: standalone.html not found at', standalonePath);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const html = fs.readFileSync(standalonePath, 'utf8');
const startToken = 'const LESSONS = ';
const endToken = 'const PLAYLIST';

const startIdx = html.indexOf(startToken);
if (startIdx === -1) {
  console.error('Error: could not find "const LESSONS = " in standalone.html');
  process.exit(1);
}

const endIdx = html.indexOf(endToken, startIdx);
if (endIdx === -1) {
  console.error('Error: could not find "const PLAYLIST" in standalone.html');
  process.exit(1);
}

const jsonStart = startIdx + startToken.length;
const jsonEnd = html.lastIndexOf('}]', endIdx) + 2;
const jsonStr = html.slice(jsonStart, jsonEnd);

let lessons;
try {
  lessons = JSON.parse(jsonStr);
} catch (e) {
  console.error('Failed to parse LESSONS JSON from standalone.html:', e.message);
  process.exit(1);
}

console.log(`Extracting thumbnails for ${lessons.length} lessons into assets/thumbnails/...`);

let extracted = 0;
for (const lesson of lessons) {
  if (!lesson.id || !lesson.thumbnail) {
    console.warn(`Warning: Lesson ${lesson.id || 'unknown'} has no thumbnail`);
    continue;
  }

  if (lesson.thumbnail.startsWith('data:image/jpeg;base64,')) {
    const base64Data = lesson.thumbnail.slice('data:image/jpeg;base64,'.length);
    const buffer = Buffer.from(base64Data, 'base64');
    const outFile = path.join(outDir, `${lesson.id}.jpg`);
    fs.writeFileSync(outFile, buffer);
    extracted++;
  } else {
    console.warn(`Warning: Lesson ${lesson.id} thumbnail is not a base64 JPEG data URL`);
  }
}

console.log(`Successfully extracted ${extracted} local JPEG thumbnails to assets/thumbnails/`);
