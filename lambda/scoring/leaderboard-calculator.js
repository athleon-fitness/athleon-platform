const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { parseTimeToSeconds } = require('./utils');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const SCORES_TABLE = process.env.SCORES_TABLE;
const LEADERBOARD_TABLE = process.env.LEADERBOARD_TABLE || 'LeaderboardCache';

/**
 * Rank time-based scores according to completion status and performance
 * @param {Array} scores - Array of score objects with breakdown data
 * @returns {Array} - Ranked scores with rank property assigned
 */
function rankTimeBasedScores(scores) {
  // Separate scores into completed vs incomplete groups
  const completed = scores.filter(s => s.breakdown?.allCompleted === true);
  const incomplete = scores.filter(s => s.breakdown?.allCompleted !== true);
  
  // Sort completed scores by time in ascending order (faster is better)
  completed.sort((a, b) => {
    const timeA = parseTimeToSeconds(a.breakdown.completionTime);
    const timeB = parseTimeToSeconds(b.breakdown.completionTime);
    return timeA - timeB;
  });
  
  // Sort incomplete scores by:
  // 1. Number of completed exercises (descending - more exercises is better)
  // 2. Total reps (descending - more reps is better)
  incomplete.sort((a, b) => {
    const completedDiff = b.breakdown.completedExercises - a.breakdown.completedExercises;
    if (completedDiff !== 0) return completedDiff;
    return b.breakdown.totalReps - a.breakdown.totalReps;
  });
  
  // Assign ranks with completed athletes ranked before incomplete athletes
  let rank = 1;
  const rankedCompleted = completed.map(score => ({ ...score, rank: rank++ }));
  const rankedIncomplete = incomplete.map(score => ({ ...score, rank: rank++ }));
  
  return [...rankedCompleted, ...rankedIncomplete];
}

exports.handler = async (event) => {
  console.log('Leaderboard Calculator Event:', JSON.stringify(event, null, 2));

  try {
    // Handle EventBridge event
    if (event.source === 'athleon.scores') {
      const scoreData = event.detail;
      await updateLeaderboard(scoreData.eventId, scoreData.wodId, scoreData.categoryId);
      return { statusCode: 200, body: 'Leaderboard updated' };
    }

    // Handle direct invocation
    if (event.eventId) {
      await updateLeaderboard(event.eventId, event.wodId, event.categoryId);
      return { statusCode: 200, body: 'Leaderboard updated' };
    }

    return { statusCode: 400, body: 'Invalid event' };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: error.message };
  }
};

// Export for testing
exports.rankTimeBasedScores = rankTimeBasedScores;

async function updateLeaderboard(eventId, wodId, categoryId) {
  console.log('Updating leaderboard:', { eventId, wodId, categoryId });

  // Fetch all scores for this event/wod/category
  const { Items: scores } = await ddb.send(new QueryCommand({
    TableName: SCORES_TABLE,
    KeyConditionExpression: 'eventId = :eventId',
    FilterExpression: wodId ? 'wodId = :wodId' : undefined,
    ExpressionAttributeValues: {
      ':eventId': eventId,
      ...(wodId && { ':wodId': wodId })
    }
  }));

  if (!scores || scores.length === 0) {
    console.log('No scores found');
    return;
  }

  // Group by category and WOD
  const grouped = {};
  scores.forEach(score => {
    const key = `${score.categoryId || 'all'}_${score.wodId || 'all'}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(score);
  });

  // Calculate leaderboard for each group
  for (const [key, groupScores] of Object.entries(grouped)) {
    const [cat, wod] = key.split('_');
    
    // Detect scoring system type from first score
    const isTimeBasedScoring = groupScores.length > 0 && 
                               groupScores[0].breakdown?.allCompleted !== undefined;
    
    let ranked;
    
    if (isTimeBasedScoring) {
      // Apply time-based ranking logic
      ranked = rankTimeBasedScores(groupScores);
    } else {
      // Apply default ranking logic (sort by score descending)
      const sorted = groupScores.sort((a, b) => {
        const scoreA = typeof a.score === 'number' ? a.score : parseFloat(a.score) || 0;
        const scoreB = typeof b.score === 'number' ? b.score : parseFloat(b.score) || 0;
        return scoreB - scoreA;
      });
      
      // Assign ranks
      ranked = sorted.map((score, idx) => ({
        ...score,
        rank: idx + 1
      }));
    }

    // Format leaderboard entries
    const leaderboard = ranked.map(score => ({
      rank: score.rank,
      athleteId: score.athleteId,
      score: score.score,
      breakdown: score.breakdown,
      scoringSystemId: score.scoringSystemId,
      timestamp: score.createdAt
    }));

    // Cache leaderboard
    await ddb.send(new PutCommand({
      TableName: LEADERBOARD_TABLE,
      Item: {
        leaderboardId: `${eventId}_${wod}_${cat}`,
        eventId,
        wodId: wod === 'all' ? null : wod,
        categoryId: cat === 'all' ? null : cat,
        leaderboard,
        updatedAt: new Date().toISOString()
      }
    }));

    console.log(`Updated leaderboard: ${key}, ${leaderboard.length} entries (${isTimeBasedScoring ? 'time-based' : 'standard'} ranking)`);
  }
}
