/**
 * Data Validation Service
 * Comprehensive validation for all user inputs
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ValidationService {
  /**
   * Validate email format
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Invalid email format");
    } else if (email.length > 255) {
      errors.push("Email is too long (max 255 characters)");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push("Password is required");
    } else if (password.length < 8) {
      errors.push("Password must be at least 8 characters");
    } else if (password.length > 128) {
      errors.push("Password is too long (max 128 characters)");
    } else if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    } else if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    } else if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate license number format by state
   */
  static validateLicenseNumber(licenseNumber: string, state: string): ValidationResult {
    const errors: string[] = [];

    if (!licenseNumber) {
      errors.push("License number is required");
    } else if (!state) {
      errors.push("State is required");
    } else if (licenseNumber.length < 3) {
      errors.push("License number is too short");
    } else if (licenseNumber.length > 20) {
      errors.push("License number is too long");
    }

    // State-specific validation
    const stateRules: Record<string, RegExp> = {
      CA: /^[0-9]{7}$/,
      TX: /^[0-9]{7}$/,
      FL: /^[0-9]{7}$/,
      NY: /^[0-9]{6,8}$/,
      IL: /^[0-9]{7}$/,
      PA: /^[0-9]{7}$/,
      OH: /^[0-9]{7}$/,
      MI: /^[0-9]{6,8}$/,
      NC: /^[0-9]{7}$/,
      GA: /^[0-9]{7}$/,
    };

    const rule = stateRules[state];
    if (rule && !rule.test(licenseNumber)) {
      errors.push(`Invalid license format for ${state}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate review text
   */
  static validateReviewText(text: string): ValidationResult {
    const errors: string[] = [];

    if (!text) {
      errors.push("Review text is required");
    } else if (text.length < 10) {
      errors.push("Review must be at least 10 characters");
    } else if (text.length > 5000) {
      errors.push("Review is too long (max 5000 characters)");
    }

    // Check for spam patterns
    if (this.containsSpam(text)) {
      errors.push("Review contains spam or inappropriate content");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate rating
   */
  static validateRating(rating: number): ValidationResult {
    const errors: string[] = [];

    if (rating === undefined || rating === null) {
      errors.push("Rating is required");
    } else if (!Number.isInteger(rating)) {
      errors.push("Rating must be a whole number");
    } else if (rating < 1 || rating > 5) {
      errors.push("Rating must be between 1 and 5");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate payment amount
   */
  static validatePaymentAmount(amount: number): ValidationResult {
    const errors: string[] = [];

    if (amount === undefined || amount === null) {
      errors.push("Amount is required");
    } else if (!Number.isInteger(amount)) {
      errors.push("Amount must be a whole number (in cents)");
    } else if (amount < 50) {
      // Minimum $0.50
      errors.push("Amount must be at least $0.50");
    } else if (amount > 999999) {
      // Maximum $9,999.99
      errors.push("Amount is too large (max $9,999.99)");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate phone number
   */
  static validatePhoneNumber(phone: string): ValidationResult {
    const errors: string[] = [];

    if (!phone) {
      errors.push("Phone number is required");
    } else if (!/^\d{10}$/.test(phone.replace(/\D/g, ""))) {
      errors.push("Phone number must be 10 digits");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate business name
   */
  static validateBusinessName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name) {
      errors.push("Business name is required");
    } else if (name.length < 2) {
      errors.push("Business name is too short");
    } else if (name.length > 100) {
      errors.push("Business name is too long (max 100 characters)");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate person name
   */
  static validatePersonName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name) {
      errors.push("Name is required");
    } else if (name.length < 2) {
      errors.push("Name is too short");
    } else if (name.length > 100) {
      errors.push("Name is too long (max 100 characters)");
    } else if (!/^[a-zA-Z\s'-]+$/.test(name)) {
      errors.push("Name contains invalid characters");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate URL
   */
  static validateURL(url: string): ValidationResult {
    const errors: string[] = [];

    if (!url) {
      errors.push("URL is required");
    } else {
      try {
        new URL(url);
      } catch {
        errors.push("Invalid URL format");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check if text contains spam
   */
  private static containsSpam(text: string): boolean {
    const spamPatterns = [
      /viagra/i,
      /casino/i,
      /lottery/i,
      /click here/i,
      /buy now/i,
      /free money/i,
      /http:\/\/|https:\/\//i, // URLs in reviews
      /\$\d+/i, // Dollar amounts
    ];

    return spamPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Sanitize text input
   */
  static sanitizeText(text: string): string {
    if (!text) return "";

    return text
      .trim()
      .replace(/[<>]/g, "") // Remove HTML tags
      .replace(/\s+/g, " "); // Normalize whitespace
  }

  /**
   * Validate dispute reason
   */
  static validateDisputeReason(reason: string): ValidationResult {
    const errors: string[] = [];

    if (!reason) {
      errors.push("Dispute reason is required");
    } else if (reason.length < 10) {
      errors.push("Dispute reason must be at least 10 characters");
    } else if (reason.length > 2000) {
      errors.push("Dispute reason is too long (max 2000 characters)");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate category
   */
  static validateCategory(category: string, validCategories: string[]): ValidationResult {
    const errors: string[] = [];

    if (!category) {
      errors.push("Category is required");
    } else if (!validCategories.includes(category)) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(", ")}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: { size: number; type: string; name: string },
    maxSizeMB: number = 10,
    allowedTypes: string[] = ["image/jpeg", "image/png", "application/pdf"]
  ): ValidationResult {
    const errors: string[] = [];

    if (!file) {
      errors.push("File is required");
    } else {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        errors.push(`File is too large (max ${maxSizeMB}MB)`);
      }

      if (!allowedTypes.includes(file.type)) {
        errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(", ")}`);
      }

      if (!file.name || file.name.length === 0) {
        errors.push("File name is required");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate date
   */
  static validateDate(date: string): ValidationResult {
    const errors: string[] = [];

    if (!date) {
      errors.push("Date is required");
    } else {
      const parsedDate = new Date(date);

      if (isNaN(parsedDate.getTime())) {
        errors.push("Invalid date format");
      } else if (parsedDate > new Date()) {
        errors.push("Date cannot be in the future");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate state code
   */
  static validateStateCode(state: string): ValidationResult {
    const errors: string[] = [];
    const validStates = [
      "AL",
      "AK",
      "AZ",
      "AR",
      "CA",
      "CO",
      "CT",
      "DE",
      "FL",
      "GA",
      "HI",
      "ID",
      "IL",
      "IN",
      "IA",
      "KS",
      "KY",
      "LA",
      "ME",
      "MD",
      "MA",
      "MI",
      "MN",
      "MS",
      "MO",
      "MT",
      "NE",
      "NV",
      "NH",
      "NJ",
      "NM",
      "NY",
      "NC",
      "ND",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VT",
      "VA",
      "WA",
      "WV",
      "WI",
      "WY",
    ];

    if (!state) {
      errors.push("State is required");
    } else if (!validStates.includes(state.toUpperCase())) {
      errors.push("Invalid state code");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate all form data
   */
  static validateFormData(data: Record<string, any>, schema: Record<string, (val: any) => ValidationResult>): ValidationResult {
    const allErrors: string[] = [];

    for (const [field, validator] of Object.entries(schema)) {
      const result = validator(data[field]);

      if (!result.valid) {
        allErrors.push(...result.errors.map((err) => `${field}: ${err}`));
      }
    }

    return { valid: allErrors.length === 0, errors: allErrors };
  }
}
