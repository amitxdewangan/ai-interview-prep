import * as cheerio from 'cheerio';

export interface CleanHtmlOptions {
  /** Maximum bytes for cleaned text output. Defaults to 50KB (51,200 bytes). */
  maxBytes?: number;
  /** Whether to neutralize prompt injection phrases. Defaults to true. */
  neutralizePromptInjection?: boolean;
}

const DEFAULT_MAX_BYTES = 50 * 1024; // 50 KB

/**
 * Common prompt injection phrases found in web content or adversarial pages.
 * Replaces them with a neutralized placeholder to prevent jailbreaking the downstream LLM.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /\b(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules|commands|directives)\b/gi,
  /\b(?:you\s+are\s+now(?:\s+in)?|act\s+as)\s+(?:dan(?:\s+mode)?|developer\s+mode|unrestricted|jailbreak|an\s+unfiltered\s+ai)\b/gi,
  /\b(?:system\s+prompt|new\s+system\s+instructions?|system\s+override)\s*:/gi,
  /\b(?:do\s+not\s+follow|bypass)\s+(?:any\s+)?(?:previous|prior|system)\s+instructions\b/gi,
  /\boutput\s+(?:the\s+following|exactly|only):\s*(?:I\s+hate|malicious|pwned)\b/gi,
];

/**
 * Neutralizes potential prompt injection vectors in untrusted raw web content.
 */
export function sanitizePromptInjection(text: string): string {
  let sanitized = text;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED_UNTRUSTED_INSTRUCTION]');
  }
  return sanitized;
}

/**
 * Strips scripts, styles, navigation, footers, svg, iframe, and ad blocks using Cheerio,
 * transforms remaining HTML into clean, human-readable text / lightweight markdown,
 * neutralizes prompt injection, and enforces a strict byte cap.
 */
export function cleanHtml(rawHtml: string, options?: CleanHtmlOptions): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const shouldNeutralize = options?.neutralizePromptInjection ?? true;

  const $ = cheerio.load(rawHtml);

  // Strip non-content and layout noise
  $(
    [
      'script',
      'style',
      'nav',
      'footer',
      'svg',
      'iframe',
      'noscript',
      'head',
      'meta',
      'link',
      'form',
      'button',
      'input',
      'textarea',
      'select',
      'aside',
      'dialog',
      '[role="alert"]',
      '[role="banner"]',
      '[role="navigation"]',
      '.cookie-banner',
      '.cookie-consent',
      '#cookie-banner',
      '.ad',
      '.ads',
      '.advertisement',
      '.popup',
      '.modal',
    ].join(', ')
  ).remove();

  // Format headings
  $('h1').each((_, el) => {
    $(el).text(`\n# ${$(el).text().trim()}\n`);
  });
  $('h2').each((_, el) => {
    $(el).text(`\n## ${$(el).text().trim()}\n`);
  });
  $('h3').each((_, el) => {
    $(el).text(`\n### ${$(el).text().trim()}\n`);
  });
  $('h4, h5, h6').each((_, el) => {
    $(el).text(`\n#### ${$(el).text().trim()}\n`);
  });

  // Format list items
  $('li').each((_, el) => {
    $(el).text(`\n- ${$(el).text().trim()}`);
  });

  // Format paragraphs and blockquotes
  $('p, blockquote, article, section').each((_, el) => {
    $(el).prepend('\n').append('\n');
  });

  // Format line breaks
  $('br').replaceWith('\n');

  // Extract text
  let text = $('body').length > 0 ? $('body').text() : $.text();

  // Normalize whitespace:
  // 1. Replace tabs and non-breaking spaces with standard space
  text = text.replace(/[\t\u00A0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ');
  // 2. Collapse consecutive spaces on each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line, i, arr) => {
      // Avoid excessive blank lines (keep at most one empty line between content)
      if (line === '') {
        return i > 0 && arr[i - 1] !== '';
      }
      return true;
    })
    .join('\n')
    .trim();

  // Neutralize prompt injections
  if (shouldNeutralize) {
    text = sanitizePromptInjection(text);
  }

  // Enforce byte limit
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  if (encoded.byteLength > maxBytes) {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    // Truncate safely at maxBytes
    const truncated = decoder.decode(encoded.slice(0, maxBytes));
    // Find last newline or space for clean cut
    const lastSpace = Math.max(truncated.lastIndexOf('\n'), truncated.lastIndexOf(' '));
    const cleanCut = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    text = `${cleanCut}\n\n... [Content truncated to limit]`;
  }

  return text;
}
