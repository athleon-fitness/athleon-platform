#!/bin/bash

# Fix Amplify v6 imports
find src -name "*.jsx" -exec sed -i 's/import { get, post, put, del } from '\''aws-amplify\/api'\'';/import { API } from '\''aws-amplify'\'';/g' {} \;
find src -name "*.jsx" -exec sed -i 's/get(/API.get(/g' {} \;
find src -name "*.jsx" -exec sed -i 's/post(/API.post(/g' {} \;
find src -name "*.jsx" -exec sed -i 's/put(/API.put(/g' {} \;
find src -name "*.jsx" -exec sed -i 's/del(/API.delete(/g' {} \;

echo "Fixed Amplify imports"
