#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

const WODS_TABLE = 'ScorinGames-WodsWodsTableC84CB78B-7UBMQVHUZ6WR';

async function seedTemplateWods() {
  console.log('🌱 Seeding template WODs...\n');

  const templateWods = [
    {
      eventId: 'template',
      wodId: 'template-fran',
      name: 'Fran',
      description: '21-15-9 Thrusters (95/65) and Pull-ups for time',
      format: 'time',
      timeCap: 300,
      movements: ['21-15-9 Thrusters (95/65)', '21-15-9 Pull-ups'],
      createdAt: new Date().toISOString()
    },
    {
      eventId: 'template',
      wodId: 'template-grace',
      name: 'Grace',
      description: '30 Clean and Jerks (135/95) for time',
      format: 'time',
      timeCap: 600,
      movements: ['30 Clean and Jerks (135/95)'],
      createdAt: new Date().toISOString()
    },
    {
      eventId: 'template',
      wodId: 'template-murph',
      name: 'Murph',
      description: '1 mile run, 100 pull-ups, 200 push-ups, 300 squats, 1 mile run',
      format: 'time',
      timeCap: 3600,
      movements: ['1 mile run', '100 pull-ups', '200 push-ups', '300 squats', '1 mile run'],
      createdAt: new Date().toISOString()
    },
    {
      eventId: 'template',
      wodId: 'template-cindy',
      name: 'Cindy',
      description: '20 minute AMRAP: 5 pull-ups, 10 push-ups, 15 squats',
      format: 'amrap',
      timeCap: 1200,
      movements: ['5 pull-ups', '10 push-ups', '15 squats'],
      createdAt: new Date().toISOString()
    }
  ];

  try {
    for (const wod of templateWods) {
      console.log(`💪 Creating template WOD: ${wod.name}`);
      await ddb.send(new PutCommand({
        TableName: WODS_TABLE,
        Item: wod
      }));
    }

    console.log('\n✨ Template WODs created successfully!');
    console.log('🌐 Visit: https://dbtrhlzryzh8h.cloudfront.net to see them');

  } catch (error) {
    console.error('❌ Error creating template WODs:', error.message);
    process.exit(1);
  }
}

seedTemplateWods();
