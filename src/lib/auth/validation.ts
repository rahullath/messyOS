// src/lib/auth/validation.ts - Form validation and password strength utilities
export interface PasswordStrength {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: string[];
  color: string;
  label: string;
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  if (email.length > 254) {
    return 'Email address is too long';
  }

  return null;
}

/**
 * Validate password strength and requirements
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (password.length > 128) {
    return 'Password is too long (maximum 128 characters)';
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '123456789', 'qwerty123',
    'admin123', 'welcome123', 'letmein123'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return 'This password is too common. Please choose a different one';
  }

  return null;
}

/**
 * Calculate password strength score and provide feedback
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      feedback: ['Enter a password'],
      color: 'text-gray-400',
      label: 'No password'
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }

  // Character variety checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (varietyCount >= 3) {
    score += 1;
  } else {
    if (!hasLower) feedback.push('Add lowercase letters');
    if (!hasUpper) feedback.push('Add uppercase letters');
    if (!hasNumber) feedback.push('Add numbers');
    if (!hasSpecial) feedback.push('Add special characters');
  }

  // Length bonus
  if (password.length >= 12) {
    score += 1;
  } else if (password.length >= 10) {
    score += 0.5;
  }

  // Pattern checks
  const hasRepeatingChars = /(.)\1{2,}/.test(password);
  const hasSequentialChars = /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password);
  
  if (!hasRepeatingChars && !hasSequentialChars) {
    score += 1;
  } else {
    if (hasRepeatingChars) feedback.push('Avoid repeating characters');
    if (hasSequentialChars) feedback.push('Avoid sequential characters');
  }

  // Common password check
  const commonPasswords = [
    'password', 'password123', '123456789', 'qwerty123',
    'admin123', 'welcome123', 'letmein123'
  ];
  
  if (!commonPasswords.includes(password.toLowerCase())) {
    score += 1;
  } else {
    feedback.push('Avoid common passwords');
  }

  // Normalize score to 0-4 range
  const normalizedScore = Math.min(4, Math.floor(score));

  // Determine color and label based on score
  let color: string;
  let label: string;

  switch (normalizedScore) {
    case 0:
    case 1:
      color = 'text-red-400';
      label = 'Very weak';
      break;
    case 2:
      color = 'text-orange-400';
      label = 'Weak';
      break;
    case 3:
      color = 'text-yellow-400';
      label = 'Good';
      break;
    case 4:
      color = 'text-green-400';
      label = 'Strong';
      break;
    default:
      color = 'text-gray-400';
      label = 'Unknown';
  }

  return {
    score: normalizedScore,
    feedback: feedback.slice(0, 3), // Limit to 3 most important feedback items
    color,
    label
  };
}

/**
 * Validate full name
 */
export function validateFullName(fullName: string): string | null {
  if (!fullName || !fullName.trim()) {
    return 'Full name is required';
  }

  const trimmedName = fullName.trim();

  if (trimmedName.length < 2) {
    return 'Full name must be at least 2 characters long';
  }

  if (trimmedName.length > 100) {
    return 'Full name is too long (maximum 100 characters)';
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmedName)) {
    return 'Full name can only contain letters, spaces, hyphens, and apostrophes';
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(trimmedName)) {
    return 'Full name must contain at least one letter';
  }

  return null;
}

/**
 * Sanitize and format full name
 */
export function formatFullName(fullName: string): string {
  return fullName
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Check if passwords match
 */
export function validatePasswordMatch(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
}