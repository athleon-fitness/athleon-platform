const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { CreateTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'us-east-2',
  credentials: { accessKeyId: 'fake', secretAccessKey: 'fake' }
});

const tables = [
  {
    TableName: 'EventsTable',
    KeySchema: [{ AttributeName: 'eventId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'eventId', AttributeType: 'S' }]
  },
  {
    TableName: 'OrganizationsTable',
    KeySchema: [{ AttributeName: 'organizationId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'organizationId', AttributeType: 'S' }]
  },
  {
    TableName: 'OrganizationMembersTable',
    KeySchema: [
      { AttributeName: 'organizationId', KeyType: 'HASH' },
      { AttributeName: 'userId', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'organizationId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' }
    ]
  },
  {
    TableName: 'ScoresTable',
    KeySchema: [
      { AttributeName: 'eventId', KeyType: 'HASH' },
      { AttributeName: 'scoreId', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'eventId', AttributeType: 'S' },
      { AttributeName: 'scoreId', AttributeType: 'S' }
    ]
  }
];

async function createTables() {
  for (const table of tables) {
    try {
      await client.send(new CreateTableCommand({
        ...table,
        BillingMode: 'PAY_PER_REQUEST'
      }));
      console.log(`✅ Created ${table.TableName}`);
    } catch (error) {
      if (error.name !== 'ResourceInUseException') {
        console.error(`❌ Error creating ${table.TableName}:`, error.message);
      }
    }
  }
}

createTables();
