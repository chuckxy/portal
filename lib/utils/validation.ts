// -------------------- USER VALIDATION --------------------
export interface UserValidationResult {
  isValid: boolean;
  errors: {
    username?: string;
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
}

export function validateUserInput(data: {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}): UserValidationResult {
  const errors: UserValidationResult['errors'] = {};

  // Username validation
  if (!data.username || data.username.trim().length === 0) {
    errors.username = 'Username is required';
  } else if (data.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  } else if (data.username.length > 30) {
    errors.username = 'Username must not exceed 30 characters';
  } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
    errors.username = 'Username can only contain letters, numbers, and underscores';
  }

  // Email validation
  if (!data.email || data.email.trim().length === 0) {
    errors.email = 'Email is required';
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!data.password || data.password.length === 0) {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  // First name validation (optional)
  if (data.firstName && data.firstName.length > 50) {
    errors.firstName = 'First name must not exceed 50 characters';
  }

  // Last name validation (optional)
  if (data.lastName && data.lastName.length > 50) {
    errors.lastName = 'Last name must not exceed 50 characters';
  }

  // Role validation (optional)
  if (data.role) {
    const validRoles = ['admin', 'author', 'editor', 'reader'];
    if (!validRoles.includes(data.role)) {
      errors.role = 'Invalid role. Must be admin, author, editor, or reader';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// -------------------- EMAIL VALIDATION --------------------
export function isValidEmail(email: string): boolean {
  return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
}

// -------------------- USERNAME VALIDATION --------------------
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}
