import { safeFetch } from '../security/ssrf.js';

export interface DiscussionSearchOptions {
  timeoutMs?: number;
  maxResults?: number;
  allowLocal?: boolean;
}

interface HnHit {
  title?: string;
  story_title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  points?: number;
  created_at?: string;
}

interface HnSearchResponse {
  hits?: HnHit[];
}

/**
 * Searches for public mentions and engineering discussions about a company's interview process.
 * Queries public developer forums (Hacker News Algolia API) for interview experiences.
 * If no discussions are found or the search fails, returns null honestly without inventing reviews.
 */
export async function searchPublicDiscussions(
  companyName: string,
  options: DiscussionSearchOptions = {}
): Promise<string | null> {
  const cleanName = companyName.trim();
  if (!cleanName || cleanName.length < 2) {
    return null;
  }

  const {
    timeoutMs = 5000,
    maxResults = 3,
    allowLocal = process.env.ALLOW_LOCAL_URLS === 'true',
  } = options;

  const query = encodeURIComponent(`${cleanName} interview hiring`);
  const searchUrl = `https://hn.algolia.com/api/v1/search?query=${query}&tags=(story,comment)&hitsPerPage=${maxResults}`;

  try {
    const response = await safeFetch(searchUrl, {
      allowLocal,
      timeoutMs,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as HnSearchResponse;
    if (!data || !Array.isArray(data.hits) || data.hits.length === 0) {
      return null;
    }

    const snippets: string[] = [];

    for (const hit of data.hits.slice(0, maxResults)) {
      const title = hit.title || hit.story_title;
      const text = hit.comment_text || hit.story_text;

      if (!title && !text) continue;

      // Clean HTML tags from Algolia snippets
      const cleanSnippet = text
        ? text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
        : '';

      const line = [
        title ? `Title: "${title}"` : null,
        cleanSnippet ? `Snippet: "${cleanSnippet}..."` : null,
        hit.url ? `URL: ${hit.url}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      if (line) {
        snippets.push(`- ${line}`);
      }
    }

    if (snippets.length === 0) {
      return null;
    }

    return `Public interview discussion signals for ${cleanName}:\n${snippets.join('\n')}`;
  } catch {
    // If network fails or search is unavailable, report null honestly
    return null;
  }
}
