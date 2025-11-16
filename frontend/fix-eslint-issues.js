#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to fix
const fixes = {
  // Fix unused variables by prefixing with underscore
  unusedVars: (content) => {
    // This is complex and error-prone, skip for now
    return content;
  },
  
  // Fix clickable divs/spans without keyboard support
  clickableElements: (content) => {
    const lines = content.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line has onClick but is missing role/tabIndex/onKeyPress
      if (line.includes('onClick=') && (line.includes('<div') || line.includes('<span'))) {
        const indent = line.match(/^(\s*)/)[1];
        
        // Check if next few lines already have role, tabIndex, onKeyPress
        const nextLines = lines.slice(i, i + 5).join('\n');
        const hasRole = nextLines.includes('role=');
        const hasTabIndex = nextLines.includes('tabIndex=');
        const hasKeyHandler = nextLines.includes('onKeyPress=') || nextLines.includes('onKeyDown=');
        
        result.push(line);
        
        // Add missing attributes
        if (!hasRole) {
          result.push(`${indent}  role="button"`);
        }
        if (!hasTabIndex) {
          result.push(`${indent}  tabIndex={0}`);
        }
        if (!hasKeyHandler) {
          // Extract onClick handler
          const onClickMatch = line.match(/onClick=\{([^}]+)\}/);
          if (onClickMatch) {
            const handler = onClickMatch[1];
            result.push(`${indent}  onKeyPress={(e) => {`);
            result.push(`${indent}    if (e.key === 'Enter' || e.key === ' ') {`);
            result.push(`${indent}      e.preventDefault();`);
            result.push(`${indent}      (${handler})(e);`);
            result.push(`${indent}    }`);
            result.push(`${indent}  }}`);
          }
        }
      } else {
        result.push(line);
      }
    }
    
    return result.join('\n');
  },
  
  // Fix labels without htmlFor
  labels: (content) => {
    // Add htmlFor to labels that have a following input
    let result = content;
    
    // Pattern: <label>...</label> followed by <input id="something"
    const labelInputPattern = /<label([^>]*)>(.*?)<\/label>\s*<input([^>]*?)id="([^"]+)"/gs;
    result = result.replace(labelInputPattern, (match, labelAttrs, labelContent, inputAttrs, inputId) => {
      if (labelAttrs.includes('htmlFor=')) {
        return match;
      }
      return `<label${labelAttrs} htmlFor="${inputId}">${labelContent}</label> <input${inputAttrs}id="${inputId}"`;
    });
    
    return result;
  }
};

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Apply fixes
    // content = fixes.clickableElements(content);
    // content = fixes.labels(content);
    
    // For now, just report files that need fixing
    const hasClickableIssues = content.match(/<(div|span)[^>]*onClick=/g);
    const hasLabelIssues = content.match(/<label(?![^>]*htmlFor=)[^>]*>/g);
    
    if (hasClickableIssues || hasLabelIssues) {
      console.log(`\nFile: ${filePath}`);
      if (hasClickableIssues) {
        console.log(`  - ${hasClickableIssues.length} clickable elements need keyboard support`);
      }
      if (hasLabelIssues) {
        console.log(`  - ${hasLabelIssues.length} labels need htmlFor attribute`);
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
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

// Main
const srcDir = path.join(__dirname, 'src');
console.log('Analyzing files for ESLint issues...\n');

walkDir(srcDir, processFile);

console.log('\n\nTo fix these issues, you need to:');
console.log('1. Add role="button", tabIndex={0}, and onKeyPress handlers to clickable divs/spans');
console.log('2. Add htmlFor attributes to labels or wrap inputs inside labels');
console.log('3. Fix React Hook dependencies in useEffect');
console.log('4. Remove or prefix unused variables with underscore');
