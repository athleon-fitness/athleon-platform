/**
 * Test helpers for Lambda functions
 */

function createApiEvent(method = 'GET', path = '/', body = null) {
  return {
    httpMethod: method,
    path: path,
    pathParameters: null,
    queryStringParameters: null,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-id',
          email: 'test@example.com'
        }
      }
    }
  };
}

function mockDynamoDBResponse(data) {
  return {
    promise: () => Promise.resolve(data)
  };
}

const mockDynamoDBClient = {
  send: jest.fn()
};

const mockEventBridgeClient = {
  send: jest.fn()
};

const mockS3Client = {
  send: jest.fn()
};

module.exports = {
  createApiEvent,
  mockDynamoDBResponse,
  mockDynamoDBClient,
  mockEventBridgeClient,
  mockS3Client
};
