'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const stylesPath = path.join(root, 'styles.css');
const lessonsPath = path.join(root, 'lessons.js');
const appPath = path.join(root, 'app.js');
const thumbnailsDir = path.join(root, 'assets', 'thumbnails');
const outStandalonePath = path.join(root, 'standalone.html');

console.log('Building standalone.html from canonical source files...');

if (!fs.existsSync(indexPath) || !fs.existsSync(stylesPath) || !fs.existsSync(lessonsPath) || !fs.existsSync(appPath)) {
  console.error('Error: missing core source files in project root.');
  process.exit(1);
}

const htmlSource = fs.readFileSync(indexPath, 'utf8');
const stylesSource = fs.readFileSync(stylesPath, 'utf8');
const lessonsSource = fs.readFileSync(lessonsPath, 'utf8');
const appSource = fs.readFileSync(appPath, 'utf8');

// Helper to escape closing script tags in inlined JavaScript
function safeInlineScript(code) {
  return code.replace(/<\/script/gi, '<\\/script');
}

// Evaluate lessons in sandbox
let lessons, playlist;
try {
  lessons = vm.runInNewContext(lessonsSource + '; LESSONS');
  playlist = vm.runInNewContext(lessonsSource + '; PLAYLIST');
} catch (e) {
  console.error('Error: failed to evaluate lessons.js:', e.message);
  process.exit(1);
}

if (!lessons || !Array.isArray(lessons)) {
  console.error('Error: LESSONS is not an array.');
  process.exit(1);
}

const standaloneLessons = lessons.map(lesson => {
  const copy = { ...lesson };
  const thumbPath = path.join(thumbnailsDir, `${lesson.id}.jpg`);
  if (fs.existsSync(thumbPath)) {
    const b64 = fs.readFileSync(thumbPath).toString('base64');
    copy.thumbnail = `data:image/jpeg;base64,${b64}`;
  } else if (lesson.thumbnail && lesson.thumbnail.startsWith('data:image/')) {
    // Already base64
  } else {
    console.warn(`Warning: local thumbnail not found for ${lesson.id} at ${thumbPath}`);
  }
  return copy;
});

const inlineLessonsJs = 'const LESSONS = ' + JSON.stringify(standaloneLessons) + ';\nconst PLAYLIST = ' + JSON.stringify(playlist || 'https://www.youtube.com/playlist?list=PLSq_n2PrJhKw') + ';\n';

let standaloneHtml = htmlSource;

// Inline CSS
standaloneHtml = standaloneHtml.replace(
  /<link\s+rel=["']stylesheet["']\s+href=["']styles\.css["']\s*\/?>/i,
  `<style>\n${stylesSource}\n</style>`
);

// Inline lessons.js
standaloneHtml = standaloneHtml.replace(
  /<script\s+src=["']lessons\.js["']\s*><\/script>/i,
  `<script>\n${safeInlineScript(inlineLessonsJs)}</script>`
);

// Inline app.js
standaloneHtml = standaloneHtml.replace(
  /<script\s+src=["']app\.js["']\s*><\/script>/i,
  `<script>\n${safeInlineScript(appSource)}</script>`
);

// Verify that external links were replaced
if (standaloneHtml.includes('<link rel="stylesheet"') || standaloneHtml.includes('<script src=')) {
  console.error('Error: standalone output still contains external stylesheet or script references!');
  process.exit(1);
}

fs.writeFileSync(outStandalonePath, standaloneHtml, 'utf8');

const stat = fs.statSync(outStandalonePath);
console.log(`Successfully built standalone.html (${stat.size} bytes)`);
