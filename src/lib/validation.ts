export const sanitizeHtml = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

// Character sanitizer for free-text input. Intentionally does NOT trim:
// it runs on every keystroke in onChange, so trimming would strip the
// in-progress trailing space and make the spacebar appear dead in text fields.
// Validators handle whitespace/trimming on final values.
export const sanitizeText = (input: string, maxLength = 200): string => {
  return input
    .replace(/[<>\"'&]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .slice(0, maxLength);
};

export const validateName = (name: string): { valid: boolean; error?: string; sanitized: string } => {
  const sanitized = sanitizeText(name, 50).trim();
  if (!sanitized) return { valid: false, error: 'Name is required', sanitized: '' };
  if (sanitized.length < 2) return { valid: false, error: 'Name must be at least 2 characters', sanitized };
  if (!/^[a-zA-Z\s\u0900-\u097F]+$/.test(sanitized)) {
    return { valid: false, error: 'Name can only contain letters and spaces', sanitized };
  }
  return { valid: true, sanitized };
};

export const validatePhone = (phone: string): { valid: boolean; error?: string; sanitized: string } => {
  const sanitized = phone.replace(/\D/g, '').slice(0, 15);
  if (!sanitized) return { valid: false, error: 'Phone number is required', sanitized: '' };
  if (sanitized.length < 10) return { valid: false, error: 'Enter a valid 10-digit phone number', sanitized };
  return { valid: true, sanitized };
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters' };
  if (password.length > 100) return { valid: false, error: 'Password too long' };
  return { valid: true };
};

export const validateAmount = (amount: string | number, min: number, max: number): { valid: boolean; error?: string; value: number } => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return { valid: false, error: 'Invalid amount', value: 0 };
  if (num < min) return { valid: false, error: `Minimum amount is ₹${min}`, value: 0 };
  if (num > max) return { valid: false, error: `Maximum amount is ₹${max.toLocaleString()}`, value: 0 };
  if (!Number.isFinite(num)) return { valid: false, error: 'Invalid amount', value: 0 };
  return { valid: true, value: num };
};

export const validateIfsc = (ifsc: string): { valid: boolean; error?: string; sanitized: string } => {
  const sanitized = ifsc.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
  if (!sanitized) return { valid: false, error: 'IFSC code is required', sanitized: '' };
  if (sanitized.length !== 11) return { valid: false, error: 'IFSC must be 11 characters', sanitized };
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(sanitized)) {
    return { valid: false, error: 'Invalid IFSC format (e.g., SBIN0001234)', sanitized };
  }
  return { valid: true, sanitized };
};

export const validateAccountNumber = (accountNumber: string): { valid: boolean; error?: string; sanitized: string } => {
  const sanitized = accountNumber.replace(/\D/g, '').slice(0, 20);
  if (!sanitized) return { valid: false, error: 'Account number is required', sanitized: '' };
  if (sanitized.length < 9) return { valid: false, error: 'Account number too short', sanitized };
  if (sanitized.length > 18) return { valid: false, error: 'Account number too long', sanitized };
  return { valid: true, sanitized };
};

export const validateUpiId = (upiId: string): { valid: boolean; error?: string; sanitized: string } => {
  const sanitized = sanitizeText(upiId, 50).toLowerCase().trim();
  if (!sanitized) return { valid: false, error: 'UPI ID is required', sanitized: '' };
  if (!/^[\w.\-]{2,}@[a-zA-Z0-9.\-]{2,}$/.test(sanitized)) {
    return { valid: false, error: 'Invalid UPI ID format (e.g., name@upi)', sanitized };
  }
  return { valid: true, sanitized };
};

export const validateBidNumber = (number: string, isJodi: boolean): { valid: boolean; error?: string; sanitized: string } => {
  const sanitized = number.replace(/\D/g, '').slice(0, isJodi ? 2 : 3);
  if (!sanitized) return { valid: false, error: 'Please select a number', sanitized: '' };
  if (isJodi) {
    // Real jodi is any 00-99 — never restrict to doubles (11, 22).
    if (sanitized.length !== 2) return { valid: false, error: 'Jodi must be 2 digits', sanitized };
  } else {
    if (sanitized.length < 1 || sanitized.length > 3) return { valid: false, error: 'Invalid number format', sanitized };
  }
  return { valid: true, sanitized };
};

export const validateBankName = (bankName: string): { valid: boolean; error?: string; sanitized: string } => {
  const sanitized = sanitizeText(bankName, 100).trim();
  if (!sanitized) return { valid: false, error: 'Bank name is required', sanitized: '' };
  if (sanitized.length < 2) return { valid: false, error: 'Bank name too short', sanitized };
  return { valid: true, sanitized };
};