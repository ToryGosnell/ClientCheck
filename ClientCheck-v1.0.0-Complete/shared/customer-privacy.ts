/**
 * Customer privacy helpers — masking, display rules, and public field access.
 */

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  const last4 = digits.slice(-4);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ***-${last4}`;
  }
  if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1, 4)}) ***-${last4}`;
  }
  return `***-${last4}`;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const idx = email.indexOf("@");
  if (idx <= 0) return "***@***";
  const local = email.slice(0, idx);
  const domain = email.slice(idx);
  if (local.length <= 2) return `${local[0]}***${domain}`;
  return `${local[0]}***${domain}`;
}

export interface PublicLocation {
  city: string | null;
  state: string | null;
  zip: string | null;
  display: string;
}

export function getPublicCustomerLocation(customer: {
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): PublicLocation {
  const parts = [customer.city, customer.state].filter(Boolean);
  if (customer.zip) parts.push(customer.zip);
  return {
    city: customer.city ?? null,
    state: customer.state ?? null,
    zip: customer.zip ?? null,
    display: parts.join(", ") || "",
  };
}

/**
 * Privacy display rules.
 * PRIVATE: phone, email, full street address — only visible to review owner and admin.
 * PUBLIC: display name, city, state, zip, aggregate score, review count, flags.
 */
export const PRIVACY_RULES = {
  phone: { public: false, label: "Private — only visible to you." },
  email: { public: false, label: "Private — only visible to you." },
  address: { public: false, label: "Private — only visible to you." },
  city: { public: true },
  state: { public: true },
  zip: { public: true },
  displayName: { public: true },
  overallScore: { public: true },
  reviewCount: { public: true },
  flags: { public: true },
} as const;
