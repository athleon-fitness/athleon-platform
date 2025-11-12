/**
 * Error Handling Utilities
 * Provides consistent error handling and user-friendly messages
 */

/**
 * Parse API error and return user-friendly message
 */
export const parseApiError = (error) => {
  // Network error
  if (!error.response) {
    return {
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      type: 'network',
      statusCode: null
    };
  }

  const statusCode = error.response?.status;
  const apiMessage = error.response?.data?.message;

  // Map status codes to user-friendly messages
  const errorMessages = {
    400: apiMessage || 'Invalid request. Please check your input and try again.',
    401: 'Your session has expired. Please sign in again.',
    403: 'You don\'t have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: apiMessage || 'This action conflicts with existing data.',
    422: apiMessage || 'The data provided is invalid.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'A server error occurred. Our team has been notified.',
    502: 'The server is temporarily unavailable. Please try again in a moment.',
    503: 'The service is temporarily unavailable. Please try again later.'
  };

  return {
    message: errorMessages[statusCode] || apiMessage || 'An unexpected error occurred. Please try again.',
    type: 'api',
    statusCode
  };
};

/**
 * Handle API error with notification
 */
export const handleApiError = (error, showNotification, customMessage = null) => {
  const { message, statusCode } = parseApiError(error);
  
  // Log error for debugging
  console.error('API Error:', {
    statusCode,
    message,
    originalError: error
  });

  // Show notification to user
  if (showNotification) {
    showNotification(customMessage || message, 'error');
  }

  // Handle specific status codes
  if (statusCode === 401) {
    // Redirect to login after a short delay
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }

  return message;
};

/**
 * Validation error formatter
 */
export const formatValidationErrors = (errors) => {
  if (typeof errors === 'string') return errors;
  
  if (Array.isArray(errors)) {
    return errors.join(', ');
  }
  
  if (typeof errors === 'object') {
    return Object.values(errors).join(', ');
  }
  
  return 'Validation failed';
};

/**
 * Safe async operation wrapper
 * Handles errors and provides loading state
 */
export const safeAsync = async (operation, options = {}) => {
  const {
    onSuccess,
    onError,
    showNotification,
    successMessage,
    errorMessage
  } = options;

  try {
    const result = await operation();
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    if (successMessage && showNotification) {
      showNotification(successMessage, 'success');
    }
    
    return { success: true, data: result, error: null };
  } catch (error) {
    const message = handleApiError(error, showNotification, errorMessage);
    
    if (onError) {
      onError(error);
    }
    
    return { success: false, data: null, error: message };
  }
};

/**
 * Retry failed operation
 */
export const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
};

/**
 * Example usage:
 * 
 * // With safeAsync
 * const { success, data, error } = await safeAsync(
 *   () => API.post('CalisthenicsAPI', '/athletes', { body: athleteData }),
 *   {
 *     showNotification,
 *     successMessage: 'Athlete created successfully!',
 *     errorMessage: 'Failed to create athlete',
 *     onSuccess: (data) => {
 *       setAthletes([...athletes, data]);
 *     }
 *   }
 * );
 * 
 * // With retry
 * const data = await retryOperation(
 *   () => API.get('CalisthenicsAPI', '/events'),
 *   3, // max retries
 *   1000 // delay in ms
 * );
 */
