#!/bin/bash

# Fix React imports in all JSX files
find src -name "*.jsx" -type f -exec sed -i "s/import React, { /import { /g" {} \;
find src -name "*.jsx" -type f -exec sed -i "s/import React from 'react';//g" {} \;

echo "Fixed React imports in all JSX files"
