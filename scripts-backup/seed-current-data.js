#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

// Get table names from environment or use discovered names
const TABLES = {
  ORGANIZATIONS: 'ScorinGames-OrganizationsOrganizationsTableECC8F9CE-3MTY5XXIRLV0',
  ORGANIZATION_MEMBERS: 'ScorinGames-OrganizationsOrganizationMembersTable46313781-14LJLNYLY8PEZ',
  ORGANIZATION_EVENTS: 'ScorinGames-OrganizationsOrganizationEventsTable7597D5EB-KQ606XH74LLD',
  EVENTS: 'ScorinGames-CompetitionsEventsTable5FF68F4B-19W3OK2X2HX7D',
  ATHLETES: 'ScorinGames-AthletesAthletesTable83BA454D-1N1IH76W4RQ9P',
  CATEGORIES: 'ScorinGames-CategoriesCategoriesTable6441F570-U0RM4NSYM5YO',
  WODS: 'ScorinGames-WodsWodsTableC84CB78B-7UBMQVHUZ6WR',
  EXERCISES: 'ScorinGames-ScoringExerciseLibraryTable4BA87342-19F9WI8DI32SD'
};

async function seedData() {
  console.log('🌱 Seeding ScorinGames data...\n');

  try {
    // 1. Create demo organization
    const orgId = 'org-' + Date.now();
    console.log('📋 Creating organization...');
    await ddb.send(new PutCommand({
      TableName: TABLES.ORGANIZATIONS,
      Item: {
        organizationId: orgId,
        name: 'Athleon CC',
        description: 'Demo organization for testing',
        createdAt: new Date().toISOString(),
        createdBy: 'admin@athleon.fitness'
      }
    }));

    // 2. Add super admin as owner
    console.log('👤 Adding super admin as owner...');
    await ddb.send(new PutCommand({
      TableName: TABLES.ORGANIZATION_MEMBERS,
      Item: {
        organizationId: orgId,
        userId: 'admin@athleon.fitness',
        role: 'owner',
        joinedAt: new Date().toISOString(),
        invitedBy: 'system'
      }
    }));

    // 3. Create demo event
    const eventId = 'evt-' + Date.now();
    console.log('🏆 Creating demo event...');
    await ddb.send(new PutCommand({
      TableName: TABLES.EVENTS,
      Item: {
        eventId: eventId,
        name: 'Demo Competition 2025',
        description: 'Demo competition for testing the platform',
        startDate: '2025-12-01',
        endDate: '2025-12-01',
        location: 'Demo Gym',
        published: true,
        createdAt: new Date().toISOString(),
        createdBy: 'admin@athleon.fitness'
      }
    }));

    // 4. Link event to organization
    console.log('🔗 Linking event to organization...');
    await ddb.send(new PutCommand({
      TableName: TABLES.ORGANIZATION_EVENTS,
      Item: {
        organizationId: orgId,
        eventId: eventId,
        createdAt: new Date().toISOString(),
        createdBy: 'admin@athleon.fitness'
      }
    }));

    // 5. Create categories
    const categories = [
      { categoryId: 'rx-male', name: 'RX Male', gender: 'male' },
      { categoryId: 'rx-female', name: 'RX Female', gender: 'female' },
      { categoryId: 'scaled-male', name: 'Scaled Male', gender: 'male' },
      { categoryId: 'scaled-female', name: 'Scaled Female', gender: 'female' }
    ];

    console.log('📊 Creating categories...');
    for (const cat of categories) {
      await ddb.send(new PutCommand({
        TableName: TABLES.CATEGORIES,
        Item: {
          eventId: eventId,
          categoryId: cat.categoryId,
          name: cat.name,
          gender: cat.gender,
          createdAt: new Date().toISOString()
        }
      }));
    }

    // 6. Create sample WODs
    const wods = [
      {
        wodId: 'wod-fran',
        name: 'Fran',
        description: '21-15-9 Thrusters (95/65) and Pull-ups',
        format: 'time',
        timeCap: 300
      },
      {
        wodId: 'wod-grace',
        name: 'Grace',
        description: '30 Clean and Jerks (135/95) for time',
        format: 'time',
        timeCap: 600
      }
    ];

    console.log('💪 Creating WODs...');
    for (const wod of wods) {
      await ddb.send(new PutCommand({
        TableName: TABLES.WODS,
        Item: {
          eventId: eventId,
          wodId: wod.wodId,
          name: wod.name,
          description: wod.description,
          format: wod.format,
          timeCap: wod.timeCap,
          organizationId: orgId,
          createdAt: new Date().toISOString()
        }
      }));
    }

    // 7. Create sample exercises
    const exercises = [
      { exerciseId: 'ex-thruster', name: 'Thruster', category: 'strength', baseScore: 2 },
      { exerciseId: 'ex-pullup', name: 'Pull-up', category: 'strength', baseScore: 1 },
      { exerciseId: 'ex-clean-jerk', name: 'Clean and Jerk', category: 'strength', baseScore: 3 }
    ];

    console.log('🏋️ Creating exercises...');
    for (const ex of exercises) {
      await ddb.send(new PutCommand({
        TableName: TABLES.EXERCISES,
        Item: {
          exerciseId: ex.exerciseId,
          name: ex.name,
          category: ex.category,
          baseScore: ex.baseScore,
          isGlobal: true,
          createdAt: new Date().toISOString()
        }
      }));
    }

    console.log('\n✨ Seed data created successfully!');
    console.log(`📋 Organization ID: ${orgId}`);
    console.log(`🏆 Event ID: ${eventId}`);
    console.log(`🌐 Frontend URL: https://dbtrhlzryzh8h.cloudfront.net`);

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

seedData();
