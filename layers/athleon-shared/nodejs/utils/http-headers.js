/**
 * Standard HTTP headers for Lambda responses
 * Provides consistent CORS and content-type headers across all Lambda functions
 */

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

/**
 * Get standard CORS headers for API responses
 * @returns {Object} Headers object
 */
function getCorsHeaders() {
  return { ...CORS_HEADERS };
}

/**
 * Create a success response with CORS headers
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body (will be JSON stringified)
 * @param {Object} additionalHeaders - Additional headers to merge
 * @returns {Object} Lambda response object
 */
function createResponse(statusCode, body, additionalHeaders = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...additionalHeaders },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

/**
 * Create an OPTIONS response for CORS preflight
 * @returns {Object} Lambda response object
 */
function createOptionsResponse() {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: ''
  };
}

/**
 * Create an error response with CORS headers
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} additionalData - Additional error data
 * @returns {Object} Lambda response object
 */
function createErrorResponse(statusCode, message, additionalData = {}) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      message,
      ...additionalData
    })
  };
}

module.exports = {
  getCorsHeaders,
  createResponse,
  createOptionsResponse,
  createErrorResponse,
  CORS_HEADERS
};
