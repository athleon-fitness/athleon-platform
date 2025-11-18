const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// Import from Lambda Layer
const { 
  createResponse, 
  createOptionsResponse, 
  createErrorResponse 
} = require('/opt/nodejs/utils/http-headers');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const SCORING_SYSTEMS_TABLE = process.env.SCORING_SYSTEMS_TABLE;

exports.handler = async (event) => {
  console.log('Scoring Systems Service:', JSON.stringify(event, null, 2));
  
  // Extract origin for CORS
  const origin = event.headers?.origin || event.headers?.Origin;
  
  let path = event.path || '';
  if (event.pathParameters?.proxy) {
    path = '/' + event.pathParameters.proxy;
  }
  
  // Clean path - remove /scoring-systems prefix if present
  if (path.startsWith('/scoring-systems')) {
    path = path.substring('/scoring-systems'.length);
  }
  
  const method = event.httpMethod;
  const userId = event.requestContext?.authorizer?.claims?.sub;
  
  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return createOptionsResponse(origin);
  }
  
  try {
    // Authentication check for non-OPTIONS requests
    if (!userId) {
      return createErrorResponse(401, 'Authentication required', origin);
    }
    // GET /scoring-systems?eventId={eventId} - List scoring systems for event
    if (path === '' && method === 'GET') {
      const eventId = event.queryStringParameters?.eventId;
      
      if (!eventId) {
        return createErrorResponse(400, 'eventId query parameter is required', origin);
      }
      
      const { Items } = await ddb.send(new QueryCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: { ':eventId': eventId }
      }));
      
      return createResponse(200, Items || [], origin);
    }
    
    // POST /scoring-systems - Create scoring system
    if (path === '' && method === 'POST') {
      const body = JSON.parse(event.body);
      
      if (!body.eventId) {
        return createErrorResponse(400, 'eventId is required', origin);
      }
      
      const scoringSystemId = `sys-${Date.now()}`;
      const item = {
        eventId: body.eventId,
        scoringSystemId,
        name: body.name,
        type: body.type, // 'classic' | 'advanced'
        config: body.config,
        createdBy: userId,
        createdAt: new Date().toISOString()
      };
      
      await ddb.send(new PutCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        Item: item
      }));
      
      return createResponse(201, item, origin);
    }
    
    // POST /events/{eventId}/scoring-systems - Create scoring system (legacy)
    if (path.match(/^\/events\/[^/]+\/scoring-systems$/) && method === 'POST') {
      const eventId = path.split('/')[2];
      const body = JSON.parse(event.body);
      
      const scoringSystemId = `sys-${Date.now()}`;
      const item = {
        eventId,
        scoringSystemId,
        name: body.name,
        type: body.type, // 'classic' | 'advanced'
        config: body.config,
        createdBy: userId,
        createdAt: new Date().toISOString()
      };
      
      await ddb.send(new PutCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        Item: item
      }));
      
      return createResponse(201, item, origin);
    }
    
    // GET /events/{eventId}/scoring-systems - List scoring systems (legacy)
    if (path.match(/^\/events\/[^/]+\/scoring-systems$/) && method === 'GET') {
      const eventId = path.split('/')[2];
      
      const { Items } = await ddb.send(new QueryCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: { ':eventId': eventId }
      }));
      
      return createResponse(200, Items || [], origin);
    }
    
    // GET /scoring-systems/{scoringSystemId}?eventId={eventId} - Get scoring system
    if (path.match(/^\/[^/]+$/) && method === 'GET') {
      const scoringSystemId = path.substring(1); // Remove leading slash
      const eventId = event.queryStringParameters?.eventId;
      
      if (!eventId) {
        return createErrorResponse(400, 'eventId query parameter is required', origin);
      }
      
      const { Item } = await ddb.send(new GetCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        Key: { eventId, scoringSystemId }
      }));
      
      if (!Item) {
        return createErrorResponse(404, 'Scoring system not found', origin);
      }
      
      return createResponse(200, Item, origin);
    }
    
    // GET /events/{eventId}/scoring-systems/{id} - Get scoring system (legacy)
    if (path.match(/^\/events\/[^/]+\/scoring-systems\/[^/]+$/) && method === 'GET') {
      const [, , eventId, , scoringSystemId] = path.split('/');
      
      const { Item } = await ddb.send(new GetCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        Key: { eventId, scoringSystemId }
      }));
      
      if (!Item) {
        return createErrorResponse(404, 'Scoring system not found', origin);
      }
      
      return createResponse(200, Item, origin);
    }
    
    // PUT /scoring-systems/{scoringSystemId}?eventId={eventId} - Update scoring system
    if (path.match(/^\/[^/]+$/) && method === 'PUT') {
      const scoringSystemId = path.substring(1); // Remove leading slash
      const eventId = event.queryStringParameters?.eventId;
      const body = JSON.parse(event.body);
      
      if (!eventId) {
        return createErrorResponse(400, 'eventId query parameter is required', origin);
      }
      
      const updateExpr = [];
      const exprAttrNames = {};
      const exprAttrValues = {};
      
      if (body.name) {
        updateExpr.push('#name = :name');
        exprAttrNames['#name'] = 'name';
        exprAttrValues[':name'] = body.name;
      }
      
      if (body.config) {
        updateExpr.push('#config = :config');
        exprAttrNames['#config'] = 'config';
        exprAttrValues[':config'] = body.config;
      }
      
      if (updateExpr.length === 0) {
        return createErrorResponse(400, 'No valid fields to update', origin);
      }
      
      await ddb.send(new UpdateCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        Key: { eventId, scoringSystemId },
        UpdateExpression: `SET ${updateExpr.join(', ')}`,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues
      }));
      
      return createResponse(200, { message: 'Scoring system updated' }, origin);
    }
    
    // PUT /events/{eventId}/scoring-systems/{id} - Update scoring system (legacy)
    if (path.match(/^\/events\/[^/]+\/scoring-systems\/[^/]+$/) && method === 'PUT') {
      const [, , eventId, , scoringSystemId] = path.split('/');
      const body = JSON.parse(event.body);
      
      const updateExpr = [];
      const exprAttrNames = {};
      const exprAttrValues = {};
      
      if (body.name) {
        updateExpr.push('#name = :name');
        exprAttrNames['#name'] = 'name';
        exprAttrValues[':name'] = body.name;
      }
      
      if (body.config) {
        updateExpr.push('#config = :config');
        exprAttrNames['#config'] = 'config';
        exprAttrValues[':config'] = body.config;
      }
      
      if (updateExpr.length === 0) {
        return createErrorResponse(400, 'No valid fields to update', origin);
      }
      
      await ddb.send(new UpdateCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        Key: { eventId, scoringSystemId },
        UpdateExpression: `SET ${updateExpr.join(', ')}`,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues
      }));
      
      return createResponse(200, { message: 'Scoring system updated' }, origin);
    }
    
    // DELETE /scoring-systems/{scoringSystemId}?eventId={eventId} - Delete scoring system
    if (path.match(/^\/[^/]+$/) && method === 'DELETE') {
      const scoringSystemId = path.substring(1); // Remove leading slash
      const eventId = event.queryStringParameters?.eventId;
      
      if (!eventId) {
        return createErrorResponse(400, 'eventId query parameter is required', origin);
      }
      
      await ddb.send(new DeleteCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        Key: { eventId, scoringSystemId }
      }));
      
      return createResponse(200, { message: 'Scoring system deleted' }, origin);
    }
    
    // DELETE /events/{eventId}/scoring-systems/{id} - Delete scoring system (legacy)
    if (path.match(/^\/events\/[^/]+\/scoring-systems\/[^/]+$/) && method === 'DELETE') {
      const [, , eventId, , scoringSystemId] = path.split('/');
      
      await ddb.send(new DeleteCommand({
        TableName: SCORING_SYSTEMS_TABLE,
        Key: { eventId, scoringSystemId }
      }));
      
      return createResponse(200, { message: 'Scoring system deleted' }, origin);
    }
    
    return createErrorResponse(404, 'Route not found', origin);
    
  } catch (error) {
    console.error('Error:', error);
    return createErrorResponse(500, error.message || 'Internal server error', origin);
  }
};
