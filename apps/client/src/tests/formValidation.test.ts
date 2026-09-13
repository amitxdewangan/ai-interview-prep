import { describe, it, expect } from 'vitest';

interface FormValues {
  jd: string;
  companyUrl: string;
  days: number;
}

function validateKitForm(values: FormValues): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!values.jd || !values.jd.trim()) {
    errors.jd = 'Job Description is required.';
  } else if (values.jd.trim().length < 20) {
    errors.jd = 'Please provide a realistic job description (at least 20 characters).';
  }

  if (!values.companyUrl || !values.companyUrl.trim()) {
    errors.companyUrl = 'Company website URL is required.';
  } else {
    try {
      const urlToTest =
        values.companyUrl.startsWith('http://') || values.companyUrl.startsWith('https://')
          ? values.companyUrl
          : `https://${values.companyUrl}`;
      new URL(urlToTest);
    } catch {
      errors.companyUrl = 'Please enter a valid URL (e.g., https://stripe.com).';
    }
  }

  if (!Number.isInteger(values.days) || values.days < 1 || values.days > 60) {
    errors.days = 'Days must be an integer between 1 and 60.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

describe('Phase 8: Form Validation Rules', () => {
  it('validates a clean, realistic generation form submission', () => {
    const result = validateKitForm({
      jd: 'Senior Software Engineer with 5+ years of experience in distributed systems and Node.js.',
      companyUrl: 'https://airbnb.com',
      days: 7,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('rejects empty or very short JDs with clear error hint', () => {
    const emptyResult = validateKitForm({
      jd: '',
      companyUrl: 'https://airbnb.com',
      days: 5,
    });
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.errors.jd).toMatch(/required/i);

    const shortResult = validateKitForm({
      jd: 'Too short',
      companyUrl: 'https://airbnb.com',
      days: 5,
    });
    expect(shortResult.isValid).toBe(false);
    expect(shortResult.errors.jd).toMatch(/at least 20 characters/i);
  });

  it('validates URLs and supports missing protocols', () => {
    const withNoProto = validateKitForm({
      jd: 'Senior Software Engineer with 5+ years of experience in distributed systems and Node.js.',
      companyUrl: 'google.com',
      days: 10,
    });
    expect(withNoProto.isValid).toBe(true);

    const invalid = validateKitForm({
      jd: 'Senior Software Engineer with 5+ years of experience in distributed systems and Node.js.',
      companyUrl: 'http://',
      days: 10,
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.companyUrl).toMatch(/valid URL/i);
  });

  it('enforces bounds on preparation days between 1 and 60', () => {
    const zeroDays = validateKitForm({
      jd: 'Senior Software Engineer with 5+ years of experience in distributed systems and Node.js.',
      companyUrl: 'https://stripe.com',
      days: 0,
    });
    expect(zeroDays.isValid).toBe(false);
    expect(zeroDays.errors.days).toMatch(/between 1 and 60/i);

    const overDays = validateKitForm({
      jd: 'Senior Software Engineer with 5+ years of experience in distributed systems and Node.js.',
      companyUrl: 'https://stripe.com',
      days: 61,
    });
    expect(overDays.isValid).toBe(false);
    expect(overDays.errors.days).toMatch(/between 1 and 60/i);

    const floatDays = validateKitForm({
      jd: 'Senior Software Engineer with 5+ years of experience in distributed systems and Node.js.',
      companyUrl: 'https://stripe.com',
      days: 4.5,
    });
    expect(floatDays.isValid).toBe(false);
    expect(floatDays.errors.days).toMatch(/integer between 1 and 60/i);
  });
});
