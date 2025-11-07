#!/usr/bin/env node
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const lambdaDirs = [
  'competitions', 'organizations', 'athletes', 'scoring',
  'scheduling', 'categories', 'wods'
];

async function buildLambdas() {
  for (const dir of lambdaDirs) {
    const entryPoint = `lambda/${dir}/index.js`;
    const outDir = `dist/lambda/${dir}`;
    
    if (!fs.existsSync(entryPoint)) continue;
    
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outdir: outDir,
      external: ['/opt/nodejs/*'], // Exclude layer dependencies
      minify: true,
      sourcemap: false,
      format: 'cjs'
    });
    
    console.log(`✅ Built ${dir} Lambda`);
  }
}

buildLambdas().catch(console.error);
