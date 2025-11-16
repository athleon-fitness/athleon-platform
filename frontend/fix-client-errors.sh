#!/bin/bash

# Fix client initialization in all files that use client.get/post/put/del
echo "Adding client initialization to files..."

# Find all files that use client. but don't have const client = generateClient()
for file in $(grep -l "client\." src/**/*.jsx src/**/*.js 2>/dev/null | grep -v node_modules); do
  if ! grep -q "const client = generateClient()" "$file"; then
    # Add client initialization after generateClient import
    sed -i '/import.*generateClient/a const client = generateClient();' "$file"
  fi
done

# Fix remaining API references that weren't converted
find src -name "*.jsx" -exec sed -i 's/API\.get(/client.get(/g' {} \;
find src -name "*.jsx" -exec sed -i 's/API\.post(/client.post(/g' {} \;
find src -name "*.jsx" -exec sed -i 's/API\.put(/client.put(/g' {} \;
find src -name "*.jsx" -exec sed -i 's/API\.delete(/client.del(/g' {} \;

# Fix React import in index.jsx
sed -i '1i import React from "react";' src/index.jsx

# Fix ScoreEntry JSX error
sed -i '446s/.*/        <\/div>/' src/components/ScoreEntry.jsx

echo "Fixed client initialization and API calls"
