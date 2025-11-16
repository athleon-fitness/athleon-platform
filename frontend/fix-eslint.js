const fs = require('fs');
const path = require('path');

// Helper to add role and keyboard handlers to clickable divs
function fixClickableElements(content) {
  // Pattern: <div ... onClick={handler}>
  // Fix: Add role="button" tabIndex={0} onKeyPress={handler}
  
  let fixed = content;
  
  // Find all div/span elements with onClick but missing keyboard handlers
  const clickPattern = /(<(?:div|span)[^>]*?)(\s+onClick=\{[^}]+\})([^>]*?>)/g;
  
  fixed = fixed.replace(clickPattern, (match, before, onClick, after) => {
    // Check if already has role and keyboard handler
    if (match.includes('role=') && match.includes('onKeyPress=')) {
      return match;
    }
    
    // Extract the onClick handler
    const handlerMatch = onClick.match(/onClick=\{([^}]+)\}/);
    if (!handlerMatch) return match;
    
    const handler = handlerMatch[1];
    
    // Add role, tabIndex, and onKeyPress
    let additions = '';
    if (!match.includes('role=')) {
      additions += '\n            role="button"';
    }
    if (!match.includes('tabIndex=')) {
      additions += '\n            tabIndex={0}';
    }
    if (!match.includes('onKeyPress=') && !match.includes('onKeyDown=')) {
      additions += `\n            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                ${handler}(e);
              }
            }}`;
    }
    
    return before + onClick + additions + after;
  });
  
  return fixed;
}

// Helper to fix label elements
function fixLabels(content) {
  let fixed = content;
  
  // Pattern 1: <label>Text</label><input ... />
  // Fix: Wrap input inside label or add htmlFor
  
  // Pattern 2: <label><input /></label> - already correct
  
  // For now, add htmlFor to labels that don't have it
  fixed = fixed.replace(/<label([^>]*?)>(?!.*<input|.*<select|.*<textarea)/g, (match, attrs) => {
    if (attrs.includes('htmlFor=') || attrs.includes('for=')) {
      return match;
    }
    // This is a label without associated control - needs manual fix
    return match;
  });
  
  return fixed;
}

// Process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Apply fixes
    content = fixClickableElements(content);
    content = fixLabels(content);
    
    // Only write if changed
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Find all JS/JSX files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('build')) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);

console.log(`Found ${files.length} files to process`);

let fixedCount = 0;
files.forEach(file => {
  if (processFile(file)) {
    fixedCount++;
  }
});

console.log(`\nFixed ${fixedCount} files`);
console.log('\nNote: Some issues require manual fixes:');
console.log('- Labels without associated controls');
console.log('- React Hook dependencies');
console.log('- Unused variables');
