const fs = require('fs');
const path = require('path');

const DIR = 'c:/Users/nelus/OneDrive/Desktop/Xeno/apps/web/app/(app)';

const colorMap = {
  '#f1f1ff': 'var(--color-text-primary)',
  '#9898c0': 'var(--color-text-secondary)',
  '#5a5a80': 'var(--color-text-muted)',
  '#2a2a40': 'var(--color-border)',
  '#1a1a28': 'var(--color-surface-2)',
  '#c8c8e8': 'var(--color-text-secondary)',
  // Brand colors that shouldn't change generally, but text/borders should.
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8');
      let modified = false;
      for (const [hex, cssVar] of Object.entries(colorMap)) {
        if (content.includes(hex)) {
          content = content.split(hex).join(cssVar);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(p, content);
        console.log('Fixed:', p);
      }
    }
  }
}

walk(DIR);
