import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  extractJsonString,
  repairJsonString,
  parseAndValidateJson,
  safeParseJson,
  JsonParseError,
  JsonValidationError,
} from '../llm/jsonParser.js';

describe('Phase 3: Defensive JSON Parser & Repair Engine', () => {
  describe('extractJsonString', () => {
    it('extracts JSON from standard markdown code fence', () => {
      const input = '```json\n{"name": "test", "value": 123}\n```';
      const extracted = extractJsonString(input);
      expect(extracted).toBe('{"name": "test", "value": 123}');
    });

    it('extracts JSON when code fence lacks language specifier', () => {
      const input = '```\n[{"id": "r1"}, {"id": "r2"}]\n```';
      const extracted = extractJsonString(input);
      expect(extracted).toBe('[{"id": "r1"}, {"id": "r2"}]');
    });

    it('extracts JSON with conversational preamble and postamble', () => {
      const input = `
        Sure! Here is the structured output according to your requirements:
        {
          "company": "Acme",
          "rating": 5
        }
        Hope this helps! Let me know if you need changes.
      `;

      const extracted = extractJsonString(input);
      expect(extracted).toBe('{\n          "company": "Acme",\n          "rating": 5\n        }');
    });

    it('handles nested braces correctly', () => {
      const input = `Prefix {"outer": {"inner": "val"}, "arr": [1, 2, 3]} Suffix`;
      const extracted = extractJsonString(input);
      expect(extracted).toBe('{"outer": {"inner": "val"}, "arr": [1, 2, 3]}');
    });
  });

  describe('repairJsonString', () => {
    it('repairs trailing commas in objects and arrays', () => {
      const malformed = '{"a": 1, "b": [10, 20,],}';
      const repaired = repairJsonString(malformed);
      expect(JSON.parse(repaired)).toEqual({ a: 1, b: [10, 20] });
    });

    it('strips inline and block comments', () => {
      const malformed = `
        {
          // Comment here
          "status": "ok", /* Inline block comment */
          "code": 200
        }
      `;
      const repaired = repairJsonString(malformed);
      expect(JSON.parse(repaired)).toEqual({ status: 'ok', code: 200 });
    });

    it('repairs unquoted keys', () => {
      const malformed = '{ name: "Alice", age: 30 }';
      const repaired = repairJsonString(malformed);
      expect(JSON.parse(repaired)).toEqual({ name: 'Alice', age: 30 });
    });
  });

  describe('parseAndValidateJson', () => {
    const TestSchema = z.object({
      id: z.string(),
      count: z.number().int(),
      tags: z.array(z.string()),
    });

    it('successfully parses and validates against Zod schema', () => {
      const raw = '```json\n{\n  "id": "q1",\n  "count": 42,\n  "tags": ["react", "node"],\n}\n```';

      const result = parseAndValidateJson(raw, TestSchema);
      expect(result).toEqual({
        id: 'q1',
        count: 42,
        tags: ['react', 'node'],
      });
    });

    it('throws JsonValidationError with detailed paths on schema mismatch', () => {
      const raw = '{"id": "q1", "count": "not a number", "tags": []}';
      expect(() => parseAndValidateJson(raw, TestSchema)).toThrow(JsonValidationError);
      expect(() => parseAndValidateJson(raw, TestSchema)).toThrow('[count]');
    });

    it('throws JsonParseError on completely unrecoverable text', () => {
      const raw = 'This is plain English with no JSON anywhere.';
      expect(() => parseAndValidateJson(raw)).toThrow(JsonParseError);
    });

    it('safeParseJson returns discriminated union results cleanly', () => {
      const valid = safeParseJson('{"id": "q1", "count": 1, "tags": ["a"]}', TestSchema);
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.id).toBe('q1');
      }

      const invalid = safeParseJson('{"id": 123}', TestSchema);
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error).toContain('failed schema validation');
      }
    });
  });
});
