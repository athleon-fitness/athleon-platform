#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const region = process.env.AWS_REGION || 'us-east-2';
const client = new DynamoDBClient({ region });
const ddb = DynamoDBDocumentClient.from(client);

// Get table names from environment variables
const TABLES = {
  ROLES: process.env.ROLES_TABLE,
  PERMISSIONS: process.env.PERMISSIONS_TABLE,
  USER_ROLES: process.env.USER_ROLES_TABLE
};

async function seedRoles() {
  if (!TABLES.ROLES) {
    console.log('❌ Roles table not found. Skipping RBAC setup.');
    return;
  }

  const roles = [
    {
      roleId: 'super_admin',
      name: 'Super Administrator',
      description: 'Full system access'
    },
    {
      roleId: 'organizer',
      name: 'Organizer',
      description: 'Organization owner/admin/member - manages events and athletes'
    },
    {
      roleId: 'athlete',
      name: 'Athlete',
      description: 'Register for events and view scores'
    }
  ];

  console.log('🔐 Creating roles...');
  for (const role of roles) {
    await ddb.send(new PutCommand({
      TableName: TABLES.ROLES,
      Item: role
    }));
  }
  console.log('✅ Created 5 roles');
}

async function seedPermissions() {
  if (!TABLES.PERMISSIONS) {
    console.log('❌ Permissions table not found. Skipping permissions setup.');
    return;
  }

  // Permissions are organized by roleId and resource (composite key)
  const permissions = [
    // Super Admin permissions - full access to everything
    { roleId: 'super_admin', resource: 'organizations', actions: ['*'], name: 'Full Organizations Access' },
    { roleId: 'super_admin', resource: 'events', actions: ['*'], name: 'Full Events Access' },
    { roleId: 'super_admin', resource: 'wods', actions: ['*'], name: 'Full WODs Access' },
    { roleId: 'super_admin', resource: 'categories', actions: ['*'], name: 'Full Categories Access' },
    { roleId: 'super_admin', resource: 'athletes', actions: ['*'], name: 'Full Athletes Access' },
    { roleId: 'super_admin', resource: 'scores', actions: ['*'], name: 'Full Scores Access' },
    { roleId: 'super_admin', resource: 'system', actions: ['*'], name: 'System Administration' },
    
    // Organizer permissions (covers owner/admin/member based on organization role)
    { roleId: 'organizer', resource: 'organizations', actions: ['read', 'update'], name: 'Manage Organization' },
    { roleId: 'organizer', resource: 'events', actions: ['create', 'read', 'update', 'delete'], name: 'Manage Events' },
    { roleId: 'organizer', resource: 'wods', actions: ['create', 'read', 'update', 'delete'], name: 'Manage WODs' },
    { roleId: 'organizer', resource: 'categories', actions: ['create', 'read', 'update', 'delete'], name: 'Manage Categories' },
    { roleId: 'organizer', resource: 'athletes', actions: ['create', 'read', 'update', 'delete'], name: 'Manage Athletes & Register' },
    { roleId: 'organizer', resource: 'scores', actions: ['create', 'read', 'update', 'delete'], name: 'Manage Scores' },
    
    // Athlete permissions - read only, no score creation
    { roleId: 'athlete', resource: 'events', actions: ['read'], name: 'View Events' },
    { roleId: 'athlete', resource: 'scores', actions: ['read'], name: 'View Scores' }
  ];

  console.log('🔑 Creating permissions...');
  for (const permission of permissions) {
    await ddb.send(new PutCommand({
      TableName: TABLES.PERMISSIONS,
      Item: permission
    }));
  }
  console.log(`✅ Created ${permissions.length} permissions`);
}

async function seedUserRoles() {
  if (!TABLES.USER_ROLES) {
    console.log('❌ User roles table not found. Skipping user role assignments.');
    return;
  }

  const userRoles = [
    { userId: 'admin@athleon.fitness', email: 'admin@athleon.fitness', contextId: 'global', roleId: 'super_admin' },
    { userId: 'organizer1@test.com', email: 'organizer1@test.com', contextId: 'global', roleId: 'organizer' },
    { userId: 'organizer2@test.com', email: 'organizer2@test.com', contextId: 'global', roleId: 'organizer' },
    { userId: 'athlete1@test.com', email: 'athlete1@test.com', contextId: 'global', roleId: 'athlete' }
  ];

  console.log('👥 Assigning user roles...');
  for (const userRole of userRoles) {
    await ddb.send(new PutCommand({
      TableName: TABLES.USER_ROLES,
      Item: userRole
    }));
  }
  console.log('✅ Assigned roles to 4 users');
}

async function seedAuthorization() {
  console.log('🔐 Seeding authorization system...\n');

  try {
    await seedRoles();
    await seedPermissions();
    await seedUserRoles();

    console.log('\n✨ Authorization system created successfully!');
  } catch (error) {
    console.error('❌ Error seeding authorization:', error.message);
    process.exit(1);
  }
}

seedAuthorization();
