#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLES = {
  ATHLETES: process.env.ATHLETES_TABLE,
  ATHLETE_EVENTS: process.env.ATHLETE_EVENTS_TABLE || 'Athleon-development-AthletesAthleteEventsTable1485A78C-M3ZVGERDEKES',
  CATEGORIES: process.env.CATEGORIES_TABLE,
  EVENTS: process.env.EVENTS_TABLE
};

async function fixAthletesCategories() {
  console.log('🔄 Fixing athletes categories and events...\n');

  try {
    // 1. Delete RX categories
    console.log('🗑️ Removing RX categories...');
    const rxCategories = await ddb.send(new ScanCommand({
      TableName: TABLES.CATEGORIES,
      FilterExpression: 'contains(categoryId, :rx)',
      ExpressionAttributeValues: { ':rx': 'rx-' }
    }));

    for (const category of rxCategories.Items) {
      await ddb.send(new DeleteCommand({
        TableName: TABLES.CATEGORIES,
        Key: { eventId: category.eventId, categoryId: category.categoryId }
      }));
    }
    console.log(`✅ Deleted ${rxCategories.Items.length} RX categories`);

    // 2. Get demo event and add 3 global categories to it
    const eventsResponse = await ddb.send(new ScanCommand({
      TableName: TABLES.EVENTS,
      FilterExpression: 'contains(#name, :demo)',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: { ':demo': 'Demo' }
    }));

    const demoEvent = eventsResponse.Items?.[0];
    if (!demoEvent) {
      console.log('❌ No demo event found');
      return;
    }

    console.log('📊 Adding 3 global categories to demo event...');
    const eventCategories = [
      { eventId: demoEvent.eventId, categoryId: 'men-intermediate', name: "Men's Intermediate", gender: 'Male' },
      { eventId: demoEvent.eventId, categoryId: 'women-intermediate', name: "Women's Intermediate", gender: 'Female' },
      { eventId: demoEvent.eventId, categoryId: 'men-advanced', name: "Men's Advanced", gender: 'Male' }
    ];

    for (const category of eventCategories) {
      await ddb.send(new PutCommand({
        TableName: TABLES.CATEGORIES,
        Item: category
      }));
    }
    console.log('✅ Added 3 event categories');

    // 3. Get all global categories for distribution
    const globalCategories = await ddb.send(new ScanCommand({
      TableName: TABLES.CATEGORIES,
      FilterExpression: 'eventId = :global',
      ExpressionAttributeValues: { ':global': 'global' }
    }));

    const maleCategories = globalCategories.Items.filter(c => c.gender === 'Male').map(c => c.categoryId);
    const femaleCategories = globalCategories.Items.filter(c => c.gender === 'Female').map(c => c.categoryId);

    // 4. Update athletes with distributed categories
    console.log('👥 Distributing athletes across categories...');
    const athletes = await ddb.send(new ScanCommand({ TableName: TABLES.ATHLETES }));
    
    const maleAthletes = athletes.Items.filter(a => a.gender === 'Male');
    const femaleAthletes = athletes.Items.filter(a => a.gender === 'Female');

    // Distribute male athletes
    for (let i = 0; i < maleAthletes.length; i++) {
      const categoryId = maleCategories[i % maleCategories.length];
      await ddb.send(new UpdateCommand({
        TableName: TABLES.ATHLETES,
        Key: { userId: maleAthletes[i].userId },
        UpdateExpression: 'SET categoryId = :categoryId',
        ExpressionAttributeValues: { ':categoryId': categoryId }
      }));
    }

    // Distribute female athletes  
    for (let i = 0; i < femaleAthletes.length; i++) {
      const categoryId = femaleCategories[i % femaleCategories.length];
      await ddb.send(new UpdateCommand({
        TableName: TABLES.ATHLETES,
        Key: { userId: femaleAthletes[i].userId },
        UpdateExpression: 'SET categoryId = :categoryId',
        ExpressionAttributeValues: { ':categoryId': categoryId }
      }));
    }

    // 5. Update event registrations to use event categories
    console.log('📝 Updating event registrations...');
    const registrations = await ddb.send(new ScanCommand({ TableName: TABLES.ATHLETE_EVENTS }));

    for (const reg of registrations.Items) {
      const athlete = athletes.Items.find(a => a.userId === reg.userId);
      if (athlete && reg.eventId === demoEvent.eventId) {
        // Use event categories for demo event
        const newCategoryId = athlete.gender === 'Male' ? 'men-intermediate' : 'women-intermediate';
        await ddb.send(new UpdateCommand({
          TableName: TABLES.ATHLETE_EVENTS,
          Key: { userId: reg.userId, eventId: reg.eventId },
          UpdateExpression: 'SET categoryId = :categoryId',
          ExpressionAttributeValues: { ':categoryId': newCategoryId }
        }));
      }
    }

    // 6. Show final distribution
    console.log('\n📊 Final Distribution:');
    const updatedAthletes = await ddb.send(new ScanCommand({ TableName: TABLES.ATHLETES }));
    const distribution = {};
    updatedAthletes.Items.forEach(athlete => {
      distribution[athlete.categoryId] = (distribution[athlete.categoryId] || 0) + 1;
    });

    Object.entries(distribution).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} athletes`);
    });

    console.log('\n✨ Athletes distributed and events fixed!');
    console.log('📅 Demo event now has 3 categories: men-intermediate, women-intermediate, men-advanced');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAthletesCategories();
