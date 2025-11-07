/**
 * Simple structured logger for Lambda functions
 */

function info(message, data = {}) {
  console.log(JSON.stringify({
    level: 'INFO',
    message,
    timestamp: new Date().toISOString(),
    ...data
  }));
}

function error(message, errorData = {}) {
  console.error(JSON.stringify({
    level: 'ERROR',
    message,
    timestamp: new Date().toISOString(),
    error: errorData.message || errorData,
    stack: errorData.stack
  }));
}

function warn(message, data = {}) {
  console.warn(JSON.stringify({
    level: 'WARN',
    message,
    timestamp: new Date().toISOString(),
    ...data
  }));
}

module.exports = {
  info,
  error,
  warn
};
