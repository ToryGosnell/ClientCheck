import { describe, expect, it } from 'vitest';
import { computeScore, normalizeAddress, normalizeEmail, normalizeName, normalizePhone } from '../server/services/identity-resolution-service';

describe('identity normalization', () => {
  it('normalizes phone numbers to digits', () => {
    expect(normalizePhone('(509) 555-1212')).toBe('5095551212');
  });

  it('normalizes email and address casing', () => {
    expect(normalizeEmail(' Test@Example.COM ')).toBe('test@example.com');
    expect(normalizeAddress(' 123  Main   St ')).toBe('123 main st');
  });

  it('normalizes names consistently', () => {
    expect(normalizeName('John', 'Doe')).toBe('john doe');
  });

  it('scores strong duplicate matches highly', () => {
    const result = computeScore(
      { firstName: 'John', lastName: 'Doe', phone: '(509) 555-1212', address: '123 Main St', zip: '99201', email: 'john@example.com' },
      { firstName: 'john', lastName: 'doe', phone: '5095551212', address: '123 MAIN ST', zip: '99201', email: 'JOHN@example.com' },
    );
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons).toContain('phone_match');
  });
});
