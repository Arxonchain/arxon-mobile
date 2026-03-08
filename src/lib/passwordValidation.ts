// Common weak passwords blocklist (top 100 most common)
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'abc123', 'monkey', 'letmein', 'dragon', 'master',
  'login', 'princess', 'qwerty123', 'welcome', 'shadow', 'ashley', 'football',
  'jesus', 'michael', 'ninja', 'mustang', 'password1!', 'passw0rd', 'admin',
  'admin123', 'iloveyou', 'trustno1', 'sunshine', 'princess1', 'baseball',
  'superman', 'harley', 'batman', 'soccer', 'charlie', 'jordan', 'thomas',
  'hunter', 'buster', 'tigger', 'hockey', 'ranger', 'robert', 'daniel',
  'starwars', 'klaster', 'killer', 'george', 'computer', 'michelle', 'jessica',
  'pepper', 'zxcvbn', 'zxcvbnm', '131313', 'freedom', 'whatever', 'qazwsx',
  'summer', 'jennifer', 'corvette', 'austin', 'cheese', 'diamond', 'thunder',
  'taylor', 'hello', 'chelsea', 'joshua', 'amanda', 'nicole', 'samsung',
  'test', 'test123', 'monkey123', 'asshole', 'fuckyou', 'fuckoff', 'biteme',
  'cookie', 'andrea', 'ginger', 'rocket', 'access', 'merlin', 'secret',
  '121212', 'flower', 'butter', 'silver', 'matrix', 'alpha', 'yankees',
  'winner', 'anthony', 'chicken', 'orange', 'banana', 'purple', 'yellow'
]);

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Minimum length (12 characters for better security)
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  } else {
    score += 25;
    if (password.length >= 16) score += 10;
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Include at least one uppercase letter');
  } else {
    score += 15;
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Include at least one lowercase letter');
  } else {
    score += 15;
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push('Include at least one number');
  } else {
    score += 15;
  }

  // Check for special characters
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password)) {
    errors.push('Include at least one special character (!@#$%^&*...)');
  } else {
    score += 20;
  }

  // Check against common passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowerPassword)) {
    errors.push('This password is too common. Choose something unique');
    score = Math.min(score, 10);
  }

  // Check for sequential patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Avoid repeating characters (e.g., "aaa")');
    score = Math.max(0, score - 15);
  }

  // Check for sequential numbers
  if (/012|123|234|345|456|567|678|789|890/.test(password)) {
    errors.push('Avoid sequential numbers (e.g., "123")');
    score = Math.max(0, score - 10);
  }

  // Determine strength
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score < 40) {
    strength = 'weak';
  } else if (score < 60) {
    strength = 'fair';
  } else if (score < 80) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, score)
  };
}

export function getStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'weak': return 'bg-destructive';
    case 'fair': return 'bg-orange-500';
    case 'good': return 'bg-yellow-500';
    case 'strong': return 'bg-green-500';
  }
}

export function getStrengthLabel(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'weak': return 'Weak';
    case 'fair': return 'Fair';
    case 'good': return 'Good';
    case 'strong': return 'Strong';
  }
}
