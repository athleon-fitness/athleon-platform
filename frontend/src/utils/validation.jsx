/**
 * Form Validation Utilities
 * Provides reusable validation functions for forms
 */

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate required field
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true, error: null };
};

/**
 * Validate name (letters, spaces, hyphens only)
 */
export const validateName = (name, fieldName = 'Name') => {
  const requiredCheck = validateRequired(name, fieldName);
  if (!requiredCheck.valid) return requiredCheck;
  
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { valid: false, error: `${fieldName} can only contain letters, spaces, and hyphens` };
  }
  
  if (name.length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters` };
  }
  
  if (name.length > 50) {
    return { valid: false, error: `${fieldName} must be less than 50 characters` };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate age
 */
export const validateAge = (age) => {
  if (!age) {
    return { valid: false, error: 'Age is required' };
  }
  
  const ageNum = parseInt(age);
  if (isNaN(ageNum)) {
    return { valid: false, error: 'Age must be a number' };
  }
  
  if (ageNum < 1 || ageNum > 120) {
    return { valid: false, error: 'Please enter a valid age (1-120)' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate phone number
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { valid: true, error: null }; // Phone is optional
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { valid: false, error: 'Please enter a valid phone number' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate date
 */
export const validateDate = (date, fieldName = 'Date') => {
  if (!date) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate date range
 */
export const validateDateRange = (startDate, endDate) => {
  const startCheck = validateDate(startDate, 'Start date');
  if (!startCheck.valid) return startCheck;
  
  const endCheck = validateDate(endDate, 'End date');
  if (!endCheck.valid) return endCheck;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end < start) {
    return { valid: false, error: 'End date must be after start date' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate number range
 */
export const validateNumberRange = (value, min, max, fieldName = 'Value') => {
  if (value === '' || value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (num < min || num > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  
  return { valid: true, error: null };
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate entire form
 * Returns { valid: boolean, errors: object }
 */
export const validateForm = (fields, validations) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(validations).forEach(fieldName => {
    const validation = validations[fieldName];
    const value = fields[fieldName];
    
    const result = validation(value);
    if (!result.valid) {
      errors[fieldName] = result.error;
      isValid = false;
    }
  });
  
  return { valid: isValid, errors };
};

/**
 * Example usage:
 * 
 * const { valid, errors } = validateForm(formData, {
 *   firstName: (value) => validateName(value, 'First name'),
 *   lastName: (value) => validateName(value, 'Last name'),
 *   email: validateEmail,
 *   age: validateAge
 * });
 */
