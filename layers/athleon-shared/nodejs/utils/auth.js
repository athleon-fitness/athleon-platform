const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const ORGANIZATION_MEMBERS_TABLE = process.env.ORGANIZATION_MEMBERS_TABLE;
const ORGANIZATION_EVENTS_TABLE = process.env.ORGANIZATION_EVENTS_TABLE;

/**
 * Extract user info from JWT token
 */
function verifyToken(event) {
  try {
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) {
      throw new Error('No authorization claims found');
    }
    
    return {
      userId: claims.sub,
      email: claims.email
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is super admin
 */
function isSuperAdmin(userEmail) {
  return userEmail === 'admin@athleon.fitness';
}

/**
 * Check organization access for user
 */
async function checkOrganizationAccess(userId, eventId = null, organizationId = null) {
  try {
    // If organizationId provided directly, check membership
    if (organizationId) {
      const { Item } = await ddb.send(new GetCommand({
        TableName: ORGANIZATION_MEMBERS_TABLE,
        Key: { organizationId, userId }
      }));
      return { hasAccess: !!Item, role: Item?.role };
    }
    
    // If eventId provided, find organization first
    if (eventId) {
      const { Items } = await ddb.send(new QueryCommand({
        TableName: ORGANIZATION_EVENTS_TABLE,
        IndexName: 'event-organization-index',
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: { ':eventId': eventId }
      }));
      
      if (!Items || Items.length === 0) {
        return { hasAccess: false };
      }
      
      const eventOrganizationId = Items[0].organizationId;
      const { Item } = await ddb.send(new GetCommand({
        TableName: ORGANIZATION_MEMBERS_TABLE,
        Key: { organizationId: eventOrganizationId, userId }
      }));
      
      return { hasAccess: !!Item, role: Item?.role, organizationId: eventOrganizationId };
    }
    
    return { hasAccess: false };
  } catch (error) {
    console.error('Error checking organization access:', error);
    return { hasAccess: false };
  }
}

/**
 * Get event organization ID
 */
async function getEventOrganization(eventId) {
  try {
    const { Items } = await ddb.send(new QueryCommand({
      TableName: ORGANIZATION_EVENTS_TABLE,
      IndexName: 'event-organization-index',
      KeyConditionExpression: 'eventId = :eventId',
      ExpressionAttributeValues: { ':eventId': eventId }
    }));
    
    return Items?.[0]?.organizationId || null;
  } catch (error) {
    console.error('Error getting event organization:', error);
    return null;
  }
}

module.exports = {
  verifyToken,
  isSuperAdmin,
  checkOrganizationAccess,
  getEventOrganization
};
