#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const stacks = ['categories', 'wods', 'scheduling'];

function updateStack(stackName) {
  const filePath = `infrastructure/${stackName}/${stackName}-stack.ts`;
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${filePath} not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import
  if (!content.includes('createBundledLambda')) {
    content = content.replace(
      "import { Construct } from 'constructs';",
      "import { Construct } from 'constructs';\nimport { createBundledLambda } from '../shared/lambda-bundling';"
    );
  }
  
  // Replace Lambda function patterns
  content = content.replace(
    /new lambda\.Function\(this, '(\w+)', \{[\s\S]*?runtime: lambda\.Runtime\.NODEJS_18_X,[\s\S]*?handler: '([^']+)',[\s\S]*?code: lambda\.Code\.fromAsset\('lambda\/\w+'\),[\s\S]*?timeout: cdk\.Duration\.seconds\(\d+\),[\s\S]*?memorySize: \d+,[\s\S]*?(environment: \{[\s\S]*?\}),[\s\S]*?\}\)/g,
    `createBundledLambda(this, '$1', '${stackName}', {\n      $3,\n    })`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${stackName} stack`);
}

console.log('🔧 Updating remaining Lambda stacks...');
stacks.forEach(updateStack);
console.log('🎉 All remaining stacks updated!');
