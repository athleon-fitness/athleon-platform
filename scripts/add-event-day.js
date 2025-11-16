const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

const EVENT_DAYS_TABLE = 'Athleon-development-CompetitionsEventDaysTable85BC2612-UJ0P3GPF65BR';
const eventId = 'evt-1762664019818';

async function addEventDay() {
  try {
    const dayId = `day-${Date.now()}`;
    
    await ddb.send(new PutCommand({
      TableName: EVENT_DAYS_TABLE,
      Item: {
        eventId,
        dayId,
        date: '2025-11-17',
        name: 'Competition Day 1',
        description: 'Main competition day',
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }
    }));
    
    console.log(`✅ Added event day ${dayId} to event ${eventId}`);
  } catch (error) {
    console.error('❌ Error adding event day:', error);
  }
}

addEventDay();
