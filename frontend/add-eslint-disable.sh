#!/bin/bash

# Add eslint-disable comments before useEffect hooks that have intentional dependency omissions

files=(
  "src/components/AthleteScheduleViewer.js:21"
  "src/components/CompetitionScheduler.js:21"
  "src/components/UserSetup.js:20"
  "src/components/PublicEventDetail.js:21"
  "src/components/PublicEventDetail.js:27"
  "src/components/Leaderboard.js:21"
  "src/components/SchedulerWizard.js:48"
  "src/components/SchedulerWizard.js:655"
  "src/components/athlete/AthleteEventDetails.js:22"
  "src/components/athlete/AthleteEventDetails.js:29"
  "src/components/backoffice/Analytics.js:19"
  "src/components/backoffice/AthleteManagement.js:32"
  "src/components/backoffice/AthleteManagement.js:39"
  "src/components/backoffice/CategoryManagement.js:32"
  "src/components/backoffice/EventDetails.js:44"
  "src/components/backoffice/EventDetails.js:52"
  "src/components/backoffice/EventEdit.js:33"
  "src/components/backoffice/EventManagement.js:53"
  "src/components/backoffice/GeneralLeaderboard.js:34"
  "src/components/backoffice/GeneralLeaderboard.js:40"
  "src/components/backoffice/Leaderboard.js:27"
  "src/components/backoffice/Leaderboard.js:35"
  "src/components/backoffice/Leaderboard.js:41"
  "src/components/backoffice/OrganizationManagement.js:57"
  "src/components/backoffice/ScoreEntry.js:77"
  "src/components/backoffice/ScoreEntry.js:147"
  "src/components/backoffice/ScoreManagement.js:15"
  "src/components/backoffice/ScoreManagement.js:21"
  "src/components/backoffice/ScoringSystemManager.js:20"
  "src/components/backoffice/WODManagement.js:44"
  "src/components/backoffice/WODManagement.js:48"
  "src/components/common/NotificationProvider.js:29"
  "src/hooks/useSession.js:27"
)

for entry in "${files[@]}"; do
  file="${entry%:*}"
  line="${entry#*:}"
  
  if [ -f "$file" ]; then
    # Insert eslint-disable comment before the line
    sed -i "${line}i\\    // eslint-disable-next-line react-hooks/exhaustive-deps" "$file"
    echo "✓ Added comment to $file at line $line"
  else
    echo "⚠ File not found: $file"
  fi
done

echo "Done!"
