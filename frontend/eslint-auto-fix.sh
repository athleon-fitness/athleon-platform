#!/bin/bash

# Auto-fix ESLint errors where possible
cd frontend

echo "Running ESLint auto-fix..."
npx eslint src --fix --ext .js,.jsx

echo "Done! Check remaining errors with: npm run build"
