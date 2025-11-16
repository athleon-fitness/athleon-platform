#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLES = {
  ATHLETES: process.env.ATHLETES_TABLE,
  ATHLETE_EVENTS: process.env.ATHLETE_EVENTS_TABLE || 'Athleon-development-AthletesAthleteEventsTable1485A78C-M3ZVGERDEKES',
  CATEGORIES: process.env.CATEGORIES_TABLE
};

async function updateAthletesCategories() {
  console.log('🔄 Updating athletes categories and removing RX categories...\n');

  try {
    // 1. Delete RX categories
    console.log('🗑️ Removing RX categories...');
    const categoriesResponse = await ddb.send(new ScanCommand({
      TableName: TABLES.CATEGORIES,
      FilterExpression: 'contains(categoryId, :rx)',
      ExpressionAttributeValues: { ':rx': 'rx-' }
    }));

    for (const category of categoriesResponse.Items) {
      await ddb.send(new DeleteCommand({
        TableName: TABLES.CATEGORIES,
        Key: {
          eventId: category.eventId,
          categoryId: category.categoryId
        }
      }));
    }
    console.log(`✅ Deleted ${categoriesResponse.Items.length} RX categories`);

    // 2. Get available categories
    const allCategoriesResponse = await ddb.send(new ScanCommand({
      TableName: TABLES.CATEGORIES
    }));

    const maleCategories = allCategoriesResponse.Items.filter(c => c.gender === 'Male').map(c => c.categoryId);
    const femaleCategories = allCategoriesResponse.Items.filter(c => c.gender === 'Female').map(c => c.categoryId);

    console.log(`📊 Available categories - Men: ${maleCategories.length}, Women: ${femaleCategories.length}`);

    // 3. Get all athletes
    const athletesResponse = await ddb.send(new ScanCommand({
      TableName: TABLES.ATHLETES
    }));

    const maleAthletes = athletesResponse.Items.filter(a => a.gender === 'Male');
    const femaleAthletes = athletesResponse.Items.filter(a => a.gender === 'Female');

    console.log(`👥 Athletes - Men: ${maleAthletes.length}, Women: ${femaleAthletes.length}`);

    // 4. Distribute athletes across categories
    console.log('🎯 Distributing athletes across categories...');
    
    // Distribute male athletes
    for (let i = 0; i < maleAthletes.length; i++) {
      const athlete = maleAthletes[i];
      const categoryId = maleCategories[i % maleCategories.length];
      
      await ddb.send(new UpdateCommand({
        TableName: TABLES.ATHLETES,
        Key: { userId: athlete.userId },
        UpdateExpression: 'SET categoryId = :categoryId',
        ExpressionAttributeValues: { ':categoryId': categoryId }
      }));
    }

    // Distribute female athletes
    for (let i = 0; i < femaleAthletes.length; i++) {
      const athlete = femaleAthletes[i];
      const categoryId = femaleCategories[i % femaleCategories.length];
      
      await ddb.send(new UpdateCommand({
        TableName: TABLES.ATHLETES,
        Key: { userId: athlete.userId },
        UpdateExpression: 'SET categoryId = :categoryId',
        ExpressionAttributeValues: { ':categoryId': categoryId }
      }));
    }

    console.log('✅ Updated athlete categories');

    // 5. Update event registrations
    console.log('📝 Updating event registrations...');
    const registrationsResponse = await ddb.send(new ScanCommand({
      TableName: TABLES.ATHLETE_EVENTS
    }));

    for (const registration of registrationsResponse.Items) {
      // Find the athlete's new category
      const athlete = athletesResponse.Items.find(a => a.userId === registration.userId);
      if (athlete) {
        const newCategoryId = athlete.gender === 'Male' 
          ? maleCategories[maleAthletes.findIndex(a => a.userId === athlete.userId) % maleCategories.length]
          : femaleCategories[femaleAthletes.findIndex(a => a.userId === athlete.userId) % femaleCategories.length];

        await ddb.send(new UpdateCommand({
          TableName: TABLES.ATHLETE_EVENTS,
          Key: { 
            userId: registration.userId,
            eventId: registration.eventId 
          },
          UpdateExpression: 'SET categoryId = :categoryId',
          ExpressionAttributeValues: { ':categoryId': newCategoryId }
        }));
      }
    }

    console.log('✅ Updated event registrations');

    // 6. Show distribution
    console.log('\n📊 Final Distribution:');
    const updatedAthletes = await ddb.send(new ScanCommand({
      TableName: TABLES.ATHLETES
    }));

    const distribution = {};
    updatedAthletes.Items.forEach(athlete => {
      distribution[athlete.categoryId] = (distribution[athlete.categoryId] || 0) + 1;
    });

    Object.entries(distribution).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} athletes`);
    });

    console.log('\n✨ Athletes successfully distributed across all categories!');

  } catch (error) {
    console.error('❌ Error updating athletes:', error.message);
    process.exit(1);
  }
}

updateAthletesCategories();
