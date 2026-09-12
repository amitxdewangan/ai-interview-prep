import { z } from 'zod';

export class JsonParseError extends Error {
  public rawText: string;

  constructor(message: string, rawText: string) {
    super(message);
    this.name = 'JsonParseError';
    this.rawText = rawText;
  }
}

export class JsonValidationError extends Error {
  public issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = 'JsonValidationError';
    this.issues = issues;
  }
}

/**
 * Extracts a candidate JSON substring from raw model output:
 * 1. Inspects markdown code blocks (` ```json ... ``` ` or ` ``` ... ``` `).
 * 2. If not found or malformed, locates the outermost balanced JSON object or array braces.
 */
export function extractJsonString(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  const trimmed = rawText.trim();

  // 1. Try markdown code block extraction
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = trimmed.match(codeBlockRegex);
  if (match && match[1]) {
    const candidate = match[1].trim();
    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      return candidate;
    }
  }

  // 2. Locate outermost balanced braces { ... } or [ ... ]
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');

  let startIndex = -1;
  let openChar = '{';
  let closeChar = '}';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    openChar = '{';
    closeChar = '}';
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    openChar = '[';
    closeChar = ']';
  }

  if (startIndex === -1) {
    return trimmed;
  }

  // Balance search taking quotes into account
  let depth = 0;
  let inString = false;
  let escape = false;
  let endIndex = -1;

  for (let i = startIndex; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex !== -1) {
    return trimmed.slice(startIndex, endIndex + 1);
  }

  // Fallback: take from start brace to last matching closing char
  const lastCloseIndex = trimmed.lastIndexOf(closeChar);
  if (lastCloseIndex > startIndex) {
    return trimmed.slice(startIndex, lastCloseIndex + 1);
  }

  return trimmed.slice(startIndex);
}

/**
 * Repairs common LLM JSON syntax errors:
 * - Trailing commas before closing braces/brackets
 * - Single-quoted keys and string values
 * - Comments (// or /* ... *\/)
 * - Trailing truncation ellipsis (...)
 */
export function repairJsonString(jsonStr: string): string {
  let repaired = jsonStr.trim();

  // Strip single-line comments
  repaired = repaired.replace(/(?<!["'])\/\/.*$/gm, '');

  // Strip block comments
  repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');

  // Strip ellipsis in arrays/objects (e.g. [1, 2, ...])
  repaired = repaired.replace(/,\s*\.\.\.\s*([}\]])/g, '$1');

  // Strip trailing commas before closing braces/brackets
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  // Convert single-quoted keys or values to double quotes:
  // 'key': 'value' -> "key": "value"
  repaired = repaired.replace(
    /(['"])?([a-zA-Z0-9_$-]+)\1\s*:/g,
    (m, q, key) => `"${key}":`
  );

  return repaired;
}

/**
 * Extracts, repairs, parses, and validates JSON against an optional Zod schema.
 */
export function parseAndValidateJson<T>(rawText: string, schema?: z.ZodType<T>): T {
  const extracted = extractJsonString(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch (initialErr) {
    // Attempt repair
    const repaired = repairJsonString(extracted);
    try {
      parsed = JSON.parse(repaired);
    } catch (repairErr: unknown) {
      const message =
        repairErr instanceof Error ? repairErr.message : String(repairErr);
      const snippet = extracted.slice(0, 200);
      throw new JsonParseError(
        `Failed to parse JSON output: ${message}. Snippet: "${snippet}..."`,
        rawText
      );
    }
  }

  if (!schema) {
    return parsed as T;
  }

  const validationResult = schema.safeParse(parsed);
  if (!validationResult.success) {
    const issueSummary = validationResult.error.issues
      .map((issue) => `[${issue.path.join('.') || 'root'}]: ${issue.message}`)
      .join('; ');
    throw new JsonValidationError(
      `JSON failed schema validation: ${issueSummary}`,
      validationResult.error.issues
    );
  }

  return validationResult.data;
}

/**
 * Safe version returning a discriminated union result instead of throwing.
 */
export function safeParseJson<T>(
  rawText: string,
  schema?: z.ZodType<T>
): { success: true; data: T } | { success: false; error: string; raw: string } {
  try {
    const data = parseAndValidateJson<T>(rawText, schema);
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message, raw: rawText };
  }
}
