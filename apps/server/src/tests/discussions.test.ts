import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchPublicDiscussions } from '../scraper/discussions.js';

describe('Phase 2: Public Discussion Searcher', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns null for empty or too short company names', async () => {
    expect(await searchPublicDiscussions('')).toBeNull();
    expect(await searchPublicDiscussions(' ')).toBeNull();
    expect(await searchPublicDiscussions('A')).toBeNull();
  });

  it('formats returned discussion hits into clear readable signals', async () => {
    const mockHnResponse = {
      hits: [
        {
          title: 'Ask HN: What is the interview process at Stripe like?',
          story_text: 'They focus heavily on clean code, live debugging, and system design.',
          url: 'https://news.ycombinator.com/item?id=12345',
        },
        {
          story_title: 'Stripe engineering hiring practices',
          comment_text: 'Had an interview with Stripe recently. Three rounds of practical coding.',
          url: 'https://news.ycombinator.com/item?id=67890',
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockHnResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await searchPublicDiscussions('Stripe', { allowLocal: true });

    expect(result).not.toBeNull();
    expect(result).toContain('Public interview discussion signals for Stripe:');
    expect(result).toContain('What is the interview process at Stripe like?');
    expect(result).toContain('Three rounds of practical coding');
    expect(result).toContain('https://news.ycombinator.com/item?id=12345');
  });

  it('returns null when no hits are found', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ hits: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await searchPublicDiscussions('UnknownStartupXYZ', { allowLocal: true });
    expect(result).toBeNull();
  });

  it('returns null gracefully on HTTP error or network failure without throwing', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const result = await searchPublicDiscussions('Acme', { allowLocal: true });
    expect(result).toBeNull();
  });
});
