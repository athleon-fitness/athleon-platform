#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '../frontend/src');

// Find all JS files
function findJSFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'node_modules') {
      files.push(...findJSFiles(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix accessibility issues
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix labels without htmlFor
  const labelRegex = /<label(?![^>]*htmlFor)([^>]*)>/g;
  let match;
  let idCounter = 1;
  
  while ((match = labelRegex.exec(content)) !== null) {
    const labelTag = match[0];
    const attributes = match[1];
    
    // Find the next input/select/textarea
    const afterLabel = content.substring(match.index + match[0].length);
    const inputMatch = afterLabel.match(/<(input|select|textarea)([^>]*?)>/);
    
    if (inputMatch) {
      const inputTag = inputMatch[0];
      const inputType = inputMatch[1];
      const inputAttrs = inputMatch[2];
      
      // Generate unique ID
      const fileName = path.basename(filePath, '.js');
      const uniqueId = `${fileName}-${inputType}-${idCounter++}`;
      
      // Add htmlFor to label
      const newLabel = `<label htmlFor="${uniqueId}"${attributes}>`;
      
      // Add id to input if it doesn't have one
      let newInput = inputTag;
      if (!inputAttrs.includes('id=')) {
        newInput = `<${inputType} id="${uniqueId}"${inputAttrs}>`;
      }
      
      // Replace in content
      content = content.replace(labelTag, newLabel);
      content = content.replace(inputTag, newInput);
      changed = true;
    }
  }
  
  // Fix click handlers without keyboard events
  const clickRegex = /<(\w+)([^>]*?)onClick={([^}]+)}([^>]*?)>/g;
  content = content.replace(clickRegex, (match, tag, beforeAttrs, onClick, afterAttrs) => {
    if (!match.includes('onKeyDown') && !match.includes('role="button"')) {
      const keyHandler = onClick.replace(/\([^)]*\)/, '(e) => { if (e.key === "Enter" || e.key === " ") ' + onClick + '(e); }');
      return `<${tag}${beforeAttrs}onClick={${onClick}} onKeyDown={${keyHandler}} role="button" tabIndex={0}${afterAttrs}>`;
    }
    return match;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

// Process all files
const jsFiles = findJSFiles(frontendDir);
console.log(`Processing ${jsFiles.length} JS files...`);

jsFiles.forEach(fixFile);

console.log('Accessibility fixes completed!');
