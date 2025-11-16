#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  // Remove unused imports
  { file: 'src/App.js', find: "import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';", replace: "import { Authenticator } from '@aws-amplify/ui-react';" },
  { file: 'src/components/PublicEvents.js', find: "import { API } from 'aws-amplify';", replace: "" },
  { file: 'src/components/backoffice/EventManagement.js', find: "import { API, Storage } from 'aws-amplify';", replace: "import { API } from 'aws-amplify';" },
  { file: 'src/components/backoffice/OrganizationManagement.js', find: "import OrganizationSelector from './OrganizationSelector';", replace: "" },
  { file: 'src/components/backoffice/EventManagement/CategorySelector.js', find: "import { normalizeCategoryIds } from '../../../utils/categoryHelpers';", replace: "" },
  
  // Prefix unused variables with underscore
  { file: 'src/components/AthleteLeaderboard.js', find: 'const [leaderboardType, setLeaderboardType]', replace: 'const [leaderboardType, _setLeaderboardType]' },
  { file: 'src/components/AthleteLeaderboard.js', find: 'const [publishedSchedules, setPublishedSchedules]', replace: 'const [_publishedSchedules, setPublishedSchedules]' },
  { file: 'src/components/AthleteProfile.js', find: 'const navigate = useNavigate();', replace: 'const _navigate = useNavigate();' },
  { file: 'src/components/Dashboard.js', find: 'const [recentScores, setRecentScores]', replace: 'const [_recentScores, _setRecentScores]' },
  { file: 'src/components/backoffice/EventDetails.js', find: 'const [eventDays, setEventDays]', replace: 'const [_eventDays, setEventDays]' },
  { file: 'src/components/backoffice/EventManagement.js', find: 'const [uploading, setUploading]', replace: 'const [_uploading, setUploading]' },
  { file: 'src/components/backoffice/ScoringSystemManager.js', find: 'const [exercises, setExercises]', replace: 'const [_exercises, setExercises]' },
  { file: 'src/components/backoffice/GeneralLeaderboard.js', find: 'const getWorkoutName =', replace: 'const _getWorkoutName =' },
  { file: 'src/components/backoffice/EventManagement/index.js', find: 'const navigate = useNavigate();', replace: 'const _navigate = useNavigate();' },
  { file: 'src/components/backoffice/EventManagement/EventForm.js', find: 'const { success, error } =', replace: 'const { success: _success, error } =' },
];

function applyFix(filePath, find, replace) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠ File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes(find)) {
      console.log(`⚠ Pattern not found in ${filePath}`);
      return false;
    }
    
    content = content.replace(find, replace);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('Applying ESLint fixes...\n');

let fixedCount = 0;
fixes.forEach(fix => {
  if (applyFix(fix.file, fix.find, fix.replace)) {
    fixedCount++;
  }
});

console.log(`\n✓ Applied ${fixedCount}/${fixes.length} fixes`);
console.log('\nNext: Run node fix-labels.js to fix label issues');
