#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixFile(filePath, content) {
  let fixed = content;
  
  // Fix 1: Remove unused imports
  fixed = fixed.replace(/import\s+\{\s*useAuthenticator\s*\}\s+from\s+['"][^'"]+['"];?\n/g, '');
  fixed = fixed.replace(/import\s+\{\s*API\s*\}\s+from\s+['"]aws-amplify['"];?\n/g, '');
  fixed = fixed.replace(/import\s+\{\s*Storage\s*\}\s+from\s+['"]aws-amplify['"];?\n/g, '');
  
  // Fix 2: Prefix unused variables with underscore
  const unusedVarPatterns = [
    { pattern: /const\s+\[(\w+),\s*set\1\]\s*=\s*useState/g, replace: 'const [$1, _set$1] = useState' },
    { pattern: /\((\w+),\s*(\w+)\)\s*=>/g, check: true }
  ];
  
  // Fix 3: Add htmlFor to labels
  // Pattern: <label>Text</label> followed by <input id="x"
  fixed = fixed.replace(/<label>([^<]+)<\/label>\s*<input\s+([^>]*)id="([^"]+)"/g, 
    '<label htmlFor="$3">$1</label> <input $2id="$3"');
  
  // Fix 4: Wrap inputs in labels
  fixed = fixed.replace(/<label([^>]*)>\s*([^<]*)\s*<\/label>\s*<(input|select|textarea)/g,
    '<label$1>$2<$3');
  
  return fixed;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixFile(filePath, content);
    
    if (fixed !== content) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'build' && file !== '.git') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      callback(filePath);
    }
  });
}

const srcDir = path.join(__dirname, 'src');
let fixedCount = 0;

console.log('Fixing ESLint issues...\n');
walkDir(srcDir, (file) => {
  if (processFile(file)) fixedCount++;
});

console.log(`\n✓ Fixed ${fixedCount} files`);
console.log('\nRun: npm run build');
