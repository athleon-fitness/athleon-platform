#!/bin/bash

# Fix Amplify v6 imports - use legacy imports for compatibility
find src -name "*.jsx" -exec sed -i 's/import { API } from '\''aws-amplify'\'';/import { API } from '\''@aws-amplify\/api'\'';/g' {} \;
find src -name "*.jsx" -exec sed -i 's/import { getCurrentUser } from '\''aws-amplify\/auth'\'';/import { Auth } from '\''@aws-amplify\/auth'\'';/g' {} \;
find src -name "*.jsx" -exec sed -i 's/import { fetchAuthSession } from '\''aws-amplify\/auth'\'';/import { Auth } from '\''@aws-amplify\/auth'\'';/g' {} \;
find src -name "*.jsx" -exec sed -i 's/import { signUp } from '\''aws-amplify\/auth'\'';/import { Auth } from '\''@aws-amplify\/auth'\'';/g' {} \;

# Fix function calls
find src -name "*.jsx" -exec sed -i 's/getCurrentUser()/Auth.currentAuthenticatedUser()/g' {} \;
find src -name "*.jsx" -exec sed -i 's/fetchAuthSession()/Auth.currentSession()/g' {} \;
find src -name "*.jsx" -exec sed -i 's/signUp(/Auth.signUp(/g' {} \;

echo "Fixed Amplify v6 imports to use legacy format"
