#!/bin/bash

# Fix Amplify v6 imports correctly
find src -name "*.jsx" -exec sed -i 's/import { API } from '\''@aws-amplify\/api'\'';/import { generateClient } from '\''aws-amplify\/api'\'';/g' {} \;
find src -name "*.jsx" -exec sed -i 's/import { Auth } from '\''@aws-amplify\/auth'\'';/import { getCurrentUser, fetchAuthSession, signUp } from '\''aws-amplify\/auth'\'';/g' {} \;

# Fix API calls to use client
find src -name "*.jsx" -exec sed -i 's/API\.get(/client.get(/g' {} \;
find src -name "*.jsx" -exec sed -i 's/API\.post(/client.post(/g' {} \;
find src -name "*.jsx" -exec sed -i 's/API\.put(/client.put(/g' {} \;
find src -name "*.jsx" -exec sed -i 's/API\.delete(/client.del(/g' {} \;

# Fix auth calls
find src -name "*.jsx" -exec sed -i 's/Auth\.currentAuthenticatedUser()/getCurrentUser()/g' {} \;
find src -name "*.jsx" -exec sed -i 's/Auth\.currentSession()/fetchAuthSession()/g' {} \;
find src -name "*.jsx" -exec sed -i 's/Auth\.signUp(/signUp(/g' {} \;

echo "Fixed Amplify v6 imports correctly"
