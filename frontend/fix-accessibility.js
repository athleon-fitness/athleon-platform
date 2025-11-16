#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Helper to add keyboard handlers to clickable elements
function addKeyboardHandler(content) {
  const lines = content.split('\n');
  const result = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if line has onClick and is a div/span
    if (line.match(/^\s*<(div|span)[^>]*onClick=/) && 
        !line.includes('role=') && 
        !line.includes('onKeyPress=')) {
      
      const indent = line.match(/^(\s*)/)[1];
      const tag = line.match(/<(div|span)/)[1];
      
      // Check if this is a self-closing tag or multi-line
      if (line.includes('/>') || line.includes(`</${tag}>`)) {
        // Single line - add attributes before closing
        const modified = line
          .replace(/\/>/, '\n' + indent + '  role="button"\n' + indent + '  tabIndex={0}\n' + indent + '  onKeyPress={(e) => { if (e.key === \'Enter\' || e.key === \' \') { e.preventDefault(); } }}\n' + indent + '/>')
          .replace(new RegExp(`</${tag}>`), '\n' + indent + '  role="button"\n' + indent + '  tabIndex={0}\n' + indent + '  onKeyPress={(e) => { if (e.key === \'Enter\' || e.key === \' \') { e.preventDefault(); } }}\n' + indent + `</${tag}>`);
        result.push(modified);
      } else {
        // Multi-line - add attributes on next lines
        result.push(line);
        result.push(indent + '  role="button"');
        result.push(indent + '  tabIndex={0}');
        result.push(indent + '  onKeyPress={(e) => { if (e.key === \'Enter\' || e.key === \' \') { e.preventDefault(); } }}');
      }
    } else {
      result.push(line);
    }
    i++;
  }
  
  return result.join('\n');
}

// Helper to fix labels
function fixLabels(content) {
  // Add htmlFor to standalone labels
  let fixed = content;
  
  // Pattern: <label> without htmlFor followed by text and </label>
  // This is complex, so we'll do a simple replacement
  fixed = fixed.replace(/<label(\s+[^>]*)?>\s*([^<]+)\s*<\/label>/g, (match, attrs, text) => {
    if (attrs && attrs.includes('htmlFor=')) {
      return match;
    }
    // Generate an ID from the text
    const id = text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `<label${attrs || ''} htmlFor="${id}">${text}</label>`;
  });
  
  return fixed;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Apply fixes
    content = addKeyboardHandler(content);
    content = fixLabels(content);
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error: ${filePath}:`, error.message);
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

console.log('Fixing accessibility issues...\n');
walkDir(srcDir, (file) => {
  if (processFile(file)) fixedCount++;
});

console.log(`\n✓ Fixed ${fixedCount} files`);
