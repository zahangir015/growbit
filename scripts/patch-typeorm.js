const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', '@nestjs', 'typeorm', 'dist', 'common', 'typeorm.utils.js');

if (!fs.existsSync(target)) {
  console.log('[patch-typeorm] target file not found, skipping patch:', target);
  process.exit(0);
}

let src = fs.readFileSync(target, 'utf8');
const replacements = [
  {
    search: 'util_1.isNullOrUndefined(entity)',
    replace: '(entity === null || entity === undefined)',
  },
  {
    search: 'util_1.isNullOrUndefined(repository)',
    replace: '(repository === null || repository === undefined)',
  },
];

let changed = false;
for (const { search, replace } of replacements) {
  if (src.includes(search)) {
    src = src.split(search).join(replace);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(target, src, 'utf8');
  console.log('[patch-typeorm] applied patch to', target);
} else {
  console.log('[patch-typeorm] no changes needed');
}
