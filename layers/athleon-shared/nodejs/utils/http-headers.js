/**
 * Get allowed origins from environment variables
 * ALLOWED_ORIGINS should be a comma-separated list of domains
 */
function getAllowedOrigins() {
  const origins = [];
  
  // Get from environment variable (comma-separated list)
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    origins.push(...envOrigins);
  }
  
  // Add CloudFront domain if provided
  if (process.env.CLOUDFRONT_DOMAIN) {
    const domain = process.env.CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, '');
    origins.push(`https://${domain}`);
  }
  
  // Add custom domain if provided
  if (process.env.CUSTOM_DOMAIN) {
    const domain = process.env.CUSTOM_DOMAIN.replace(/^https?:\/\//, '');
    origins.push(`https://${domain}`);
    origins.push(`https://www.${domain}`);
  }
  
  // Fallback defaults for development
  if (origins.length === 0) {
    origins.push(
      'https://dev.athleon.fitness',
      'http://localhost:5173',
      'http://localhost:3000'
    );
  }
  
  return origins;
}

const ALLOWED_ORIGINS = getAllowedOrigins();

/**
 * Get the appropriate origin for CORS based on the request
 * @param {string} requestOrigin - Origin from the request headers
 * @returns {string} Allowed origin or default
 */
function getAllowedOrigin(requestOrigin) {
  // Check if the request origin is in our allowed list
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // Default to the first allowed origin (primary domain)
  return ALLOWED_ORIGINS[0] || 'https://dev.athleon.fitness';
}

/**
 * Get standard CORS headers for API responses
 * @param {string} requestOrigin - Origin from the request headers (optional)
 * @returns {Object} Headers object
 */
function getCorsHeaders(requestOrigin) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin' // Important for caching
  };
}

/**
 * Create a success response with CORS headers
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body (will be JSON stringified)
 * @param {string} requestOrigin - Origin from request headers (optional)
 * @param {Object} additionalHeaders - Additional headers to merge
 * @returns {Object} Lambda response object
 */
function createResponse(statusCode, body, requestOrigin, additionalHeaders = {}) {
  // Handle overloaded parameters (backward compatibility)
  let origin = requestOrigin;
  let headers = additionalHeaders;
  
  if (typeof requestOrigin === 'object' && !additionalHeaders) {
    // Old signature: createResponse(statusCode, body, additionalHeaders)
    headers = requestOrigin;
    origin = undefined;
  }
  
  return {
    statusCode,
    headers: { ...getCorsHeaders(origin), ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

/**
 * Create an OPTIONS response for CORS preflight
 * @param {string} requestOrigin - Origin from request headers (optional)
 * @returns {Object} Lambda response object
 */
function createOptionsResponse(requestOrigin) {
  return {
    statusCode: 200,
    headers: getCorsHeaders(requestOrigin),
    body: ''
  };
}

/**
 * Create an error response with CORS headers
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} requestOrigin - Origin from request headers (optional)
 * @param {Object} additionalData - Additional error data
 * @returns {Object} Lambda response object
 */
function createErrorResponse(statusCode, message, requestOrigin, additionalData = {}) {
  // Handle overloaded parameters (backward compatibility)
  let origin = requestOrigin;
  let data = additionalData;
  
  if (typeof requestOrigin === 'object' && !additionalData) {
    // Old signature: createErrorResponse(statusCode, message, additionalData)
    data = requestOrigin;
    origin = undefined;
  }
  
  return {
    statusCode,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({
      message,
      ...data
    })
  };
}

module.exports = {
  getCorsHeaders,
  createResponse,
  createOptionsResponse,
  createErrorResponse,
  getAllowedOrigin
};
