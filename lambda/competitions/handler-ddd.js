/**
 * DDD-Aligned Lambda Handler for Competitions/Events
 * This is a thin HTTP adapter layer that delegates to the application service
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const DynamoEventRepository = require('./infrastructure/repositories/DynamoEventRepository');
const EventPublisher = require('./infrastructure/EventPublisher');
const EventApplicationService = require('./application/EventApplicationService');
const logger = require('./logger');
const { 
  createResponse, 
  createOptionsResponse, 
  createErrorResponse,
  getCorsHeaders 
} = require('/opt/nodejs/utils/http-headers');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const EVENTS_TABLE = process.env.EVENTS_TABLE;
const ORGANIZATION_EVENTS_TABLE = process.env.ORGANIZATION_EVENTS_TABLE;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'default';

// Use global CORS headers
const headers = getCorsHeaders();


// Initialize services (reused across warm Lambda invocations)
let eventService;

function getEventService() {
  if (!eventService) {
    const eventRepository = new DynamoEventRepository(
      ddb,
      EVENTS_TABLE,
      ORGANIZATION_EVENTS_TABLE
    );
    const eventPublisher = new EventPublisher(EVENT_BUS_NAME);
    eventService = new EventApplicationService(eventRepository, eventPublisher);
  }
  return eventService;
}

exports.handler = async (event) => {
  logger.info('DDD Event Handler', {
    method: event.httpMethod,
    path: event.path
  });

  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return createOptionsResponse();
  }

  try {
    const service = getEventService();
    
    // Extract path
    let path = event.path || '';
    if (event.pathParameters?.proxy) {
      path = '/' + event.pathParameters.proxy;
    }
    
    // Clean path
    if (path.startsWith('/competitions')) {
      path = path.substring('/competitions'.length);
    } else if (path.startsWith('/events')) {
      path = path.substring('/events'.length);
    }
    
    const method = event.httpMethod;
    const pathParts = path.split('/').filter(p => p);
    const eventId = pathParts[0];
    
    // Extract user info
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const userEmail = event.requestContext?.authorizer?.claims?.email;
    
    // Parse request body
    let requestBody = {};
    if (event.body && (method === 'PUT' || method === 'POST')) {
      requestBody = JSON.parse(event.body);
    }

    // ===== PUBLIC ENDPOINTS (No Auth Required) =====
    
    // GET /public/events - Get all published events
    if (path === '/public/events' && method === 'GET') {
      const events = await service.getPublishedEvents();
      return createResponse(200, events.map(e => e.toObject()));
    }

    // GET /public/events/{eventId} - Get single published event
    if (path.startsWith('/public/events/') && method === 'GET') {
      const publicEventId = pathParts[1];
      const event = await service.getEvent(publicEventId);
      
      if (!event || !event.published) {
        return createErrorResponse,
  getCorsHeaders(404, 'Event not found or not published');
      }
      
      return createResponse(200, event.toObject());
    }

    // ===== AUTHENTICATED ENDPOINTS =====
    
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Authentication required' })
      };
    }

    // GET /competitions?organizationId={orgId} - Get organization events
    if (path === '' && method === 'GET') {
      const organizationId = event.queryStringParameters?.organizationId;
      
      if (!organizationId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'organizationId is required' })
        };
      }
      
      const events = await service.getOrganizationEvents(organizationId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(events.map(e => e.toObject()))
      };
    }

    // POST /competitions - Create new event
    if (path === '' && method === 'POST') {
      const { categories, wods, ...eventData } = requestBody;
      
      const newEvent = await service.createEvent(eventData, userId);
      
      // Save categories to CATEGORIES_TABLE (DDD violation but necessary for functionality)
      if (categories && Array.isArray(categories) && categories.length > 0) {
        const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE;
        if (CATEGORIES_TABLE) {
          const { PutCommand } = require('@aws-sdk/lib-dynamodb');
          
          for (const category of categories) {
            if (typeof category === 'object' && category.categoryId) {
              await ddb.send(new PutCommand({
                TableName: CATEGORIES_TABLE,
                Item: {
                  eventId: newEvent.eventId,
                  categoryId: category.categoryId,
                  name: category.name,
                  description: category.description || '',
                  gender: category.gender || null,
                  minAge: category.minAge || null,
                  maxAge: category.maxAge || null,
                  maxParticipants: category.maxParticipants || null,
                  createdAt: new Date().toISOString()
                }
              }));
            }
          }
        }
      }
      
      // Save WODs to WODS_TABLE (DDD violation but necessary for functionality)
      if (wods && Array.isArray(wods) && wods.length > 0) {
        const WODS_TABLE = process.env.WODS_TABLE;
        if (WODS_TABLE) {
          const { PutCommand } = require('@aws-sdk/lib-dynamodb');
          
          for (const wod of wods) {
            if (typeof wod === 'object' && wod.wodId) {
              await ddb.send(new PutCommand({
                TableName: WODS_TABLE,
                Item: {
                  eventId: newEvent.eventId,
                  wodId: wod.wodId,
                  name: wod.name,
                  description: wod.description || '',
                  format: wod.format || '',
                  timeLimit: wod.timeLimit || null,
                  movements: wod.movements || [],
                  createdAt: new Date().toISOString()
                }
              }));
            }
          }
        }
      }
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newEvent.toObject())
      };
    }

    // GET /competitions/{eventId} - Get single event
    if (eventId && pathParts.length === 1 && method === 'GET') {
      const eventData = await service.getEvent(eventId);
      
      if (!eventData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Event not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(eventData.toObject())
      };
    }

    // PUT /competitions/{eventId} - Update event
    if (eventId && pathParts.length === 1 && method === 'PUT') {
      const updatedEvent = await service.updateEvent(eventId, requestBody, userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedEvent.toObject())
      };
    }

    // POST /competitions/{eventId}/publish - Publish event
    if (eventId && pathParts[1] === 'publish' && method === 'POST') {
      const publishedEvent = await service.publishEvent(eventId, userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(publishedEvent.toObject())
      };
    }

    // POST /competitions/{eventId}/unpublish - Unpublish event
    if (eventId && pathParts[1] === 'unpublish' && method === 'POST') {
      const unpublishedEvent = await service.unpublishEvent(eventId, userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(unpublishedEvent.toObject())
      };
    }

    // POST /competitions/{eventId}/leaderboard/public - Make leaderboard public
    if (eventId && pathParts[1] === 'leaderboard' && pathParts[2] === 'public' && method === 'POST') {
      const updatedEvent = await service.makeLeaderboardPublic(eventId, userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedEvent.toObject())
      };
    }

    // POST /competitions/{eventId}/leaderboard/private - Make leaderboard private
    if (eventId && pathParts[1] === 'leaderboard' && pathParts[2] === 'private' && method === 'POST') {
      const updatedEvent = await service.makeLeaderboardPrivate(eventId, userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedEvent.toObject())
      };
    }

    // DELETE /competitions/{eventId} - Delete event
    if (eventId && pathParts.length === 1 && method === 'DELETE') {
      await service.deleteEvent(eventId, userId);
      return {
        statusCode: 204,
        headers,
        body: ''
      };
    }

    // POST /competitions/{eventId}/upload-url - Generate S3 upload URL
    if (eventId && pathParts[1] === 'upload-url' && method === 'POST') {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      
      const s3Client = new S3Client({});
      const EVENT_IMAGES_BUCKET = process.env.EVENT_IMAGES_BUCKET;
      
      if (!EVENT_IMAGES_BUCKET) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Event images bucket not configured' })
        };
      }
      
      const { fileName, fileType } = requestBody;
      if (!fileName || !fileType) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'fileName and fileType are required' })
        };
      }
      
      const key = `events/${eventId}/${fileName}`;
      const command = new PutObjectCommand({
        Bucket: EVENT_IMAGES_BUCKET,
        Key: key,
        ContentType: fileType
      });
      
      try {
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        const imageUrl = `https://${EVENT_IMAGES_BUCKET}.s3.amazonaws.com/${key}`;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ uploadUrl, imageUrl })
        };
      } catch (error) {
        logger.error('Error generating upload URL', { error: error.message, eventId });
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Failed to generate upload URL' })
        };
      }
    }

    // Route not found
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Route not found' })
    };

  } catch (error) {
    logger.error('Error in DDD handler', { error: error.message, stack: error.stack });
    
    return {
      statusCode: error.message.includes('not found') ? 404 : 500,
      headers,
      body: JSON.stringify({
        message: error.message || 'Internal server error'
      })
    };
  }
};
