import { describe, it, expect } from 'vitest';
import type { BatchCase } from '../components/batch/BatchUploadAccordion';

function parseAndValidateBatchJson(rawJson: string): BatchCase[] {
  const parsed = JSON.parse(rawJson);
  if (!Array.isArray(parsed)) {
    throw new Error('Batch JSON must be an array of cases: [{ id, jd, company_url, days }]');
  }

  const validCases: BatchCase[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item.jd || !item.company_url || typeof item.days !== 'number') {
      throw new Error(
        `Case #${i + 1} (${item.id || 'unnamed'}) is missing required fields: jd, company_url, days`
      );
    }
    validCases.push({
      id: item.id || `case-${i + 1}`,
      jd: String(item.jd),
      company_url: String(item.company_url),
      days: Math.min(60, Math.max(1, Math.round(Number(item.days)))),
    });
  }

  if (validCases.length === 0) {
    throw new Error('Uploaded JSON array contains 0 cases.');
  }

  return validCases;
}

describe('Phase 8: Batch Upload JSON Parser', () => {
  it('successfully parses valid array of cases adhering to Appendix B input format', () => {
    const validJson = JSON.stringify([
      {
        id: 'case-01',
        jd: 'Senior Full Stack Engineer with React and Node.js expertise.',
        company_url: 'https://example.com',
        days: 7,
      },
      {
        id: 'case-02',
        jd: 'Site Reliability Engineer with Kubernetes and Terraform.',
        company_url: 'https://infra.io',
        days: 14,
      },
    ]);

    const result = parseAndValidateBatchJson(validJson);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('case-01');
    expect(result[0].days).toBe(7);
    expect(result[1].id).toBe('case-02');
    expect(result[1].days).toBe(14);
  });

  it('clamps days bounded strictly between 1 and 60 days', () => {
    const json = JSON.stringify([
      {
        id: 'underflow',
        jd: 'Testing days underflow',
        company_url: 'https://example.com',
        days: -5,
      },
      {
        id: 'overflow',
        jd: 'Testing days overflow',
        company_url: 'https://example.com',
        days: 120,
      },
    ]);

    const result = parseAndValidateBatchJson(json);
    expect(result[0].days).toBe(1);
    expect(result[1].days).toBe(60);
  });

  it('throws descriptive error if a case is missing required fields', () => {
    const invalidJson = JSON.stringify([
      {
        id: 'missing-url',
        jd: 'Some JD here',
        days: 5,
      },
    ]);

    expect(() => parseAndValidateBatchJson(invalidJson)).toThrow(
      /missing required fields: jd, company_url, days/
    );
  });

  it('throws error if file is not an array', () => {
    const objJson = JSON.stringify({ error: 'not an array' });
    expect(() => parseAndValidateBatchJson(objJson)).toThrow(/must be an array of cases/);
  });
});
