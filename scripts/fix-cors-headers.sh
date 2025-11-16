#!/bin/bash

# Fix CORS headers in all Lambda functions
# Replace hardcoded CORS headers with dynamic getCorsHeaders function

LAMBDA_DIR="/home/labvel/projects/athleon/web_app_athleon/lambda"

echo "🔧 Fixing CORS headers in Lambda functions..."

# Find all Lambda files with hardcoded CORS headers
LAMBDA_FILES=$(find "$LAMBDA_DIR" -name "*.js" -exec grep -l "Access-Control-Allow-Origin.*process.env.CORS_ORIGINS" {} \;)

for file in $LAMBDA_FILES; do
    echo "📝 Fixing $file"
    
    # Add getCorsHeaders import if not present
    if ! grep -q "getCorsHeaders" "$file"; then
        # Check if auth import exists
        if grep -q "require('/opt/nodejs/utils/auth')" "$file"; then
            # Add getCorsHeaders to existing import
            sed -i "s/require('\/opt\/nodejs\/utils\/auth')/require('\/opt\/nodejs\/utils\/auth')/g" "$file"
            sed -i "s/const { \([^}]*\) } = require('\/opt\/nodejs\/utils\/auth');/const { \1, getCorsHeaders } = require('\/opt\/nodejs\/utils\/auth');/g" "$file"
        else
            # Add new import line after logger import
            sed -i "/const logger = require('\/opt\/nodejs\/utils\/logger');/a const { getCorsHeaders } = require('/opt/nodejs/utils/auth');" "$file"
        fi
    fi
    
    # Remove hardcoded headers object
    sed -i '/^const headers = {$/,/^};$/d' "$file"
    
    # Replace headers usage in handler with dynamic headers
    sed -i 's/exports\.handler = async (event) => {/exports.handler = async (event) => {\n  const headers = getCorsHeaders(event);/g' "$file"
    
    echo "✅ Fixed $file"
done

echo "🎉 CORS headers fixed in all Lambda functions!"
