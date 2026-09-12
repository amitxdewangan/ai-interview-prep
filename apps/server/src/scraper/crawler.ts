import * as cheerio from 'cheerio';
import { safeFetch, SSRFError } from '../security/ssrf.js';
import { cleanHtml } from './htmlCleaner.js';

export interface CrawlOptions {
  /** Maximum number of auxiliary candidate links to crawl besides the root page. Default: 3 */
  maxAuxiliaryPages?: number;
  /** Request timeout in milliseconds. Default: 5000 ms */
  timeoutMs?: number;
  /** Concurrency for crawling links. Default: 2 */
  concurrency?: number;
  /** Allow local URLs for batch evaluation. Default: from process.env */
  allowLocal?: boolean;
}

export interface CrawlResult {
  /** URLs successfully fetched and utilized */
  pagesUsed: string[];
  /** Synthesized company and product overview text from landing and about pages */
  companySummaryText: string;
  /** Extracted hiring process, interview format, or career signal text, or null if none found */
  hiringProcessText: string | null;
}

export interface RobotsPolicy {
  isAllowed(urlPath: string): boolean;
}

/**
 * Parses robots.txt content and constructs an `isAllowed` policy for User-agent: *.
 */
export function parseRobotsTxt(robotsContent: string, targetAgent = '*'): RobotsPolicy {
  const disallows: string[] = [];
  const allows: string[] = [];

  const lines = robotsContent.split('\n');
  let currentAgents: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;

    const [directive, ...rest] = line.split(':');
    const key = directive.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (key === 'user-agent') {
      const agent = value.toLowerCase();
      // If preceding lines were directives, reset currentAgents
      if (currentAgents.length > 0 && disallows.length > 0) {
        currentAgents = [];
      }
      currentAgents.push(agent);
    } else if (
      currentAgents.includes('*') ||
      currentAgents.includes(targetAgent.toLowerCase())
    ) {
      if (key === 'disallow' && value) {
        disallows.push(value);
      } else if (key === 'allow' && value) {
        allows.push(value);
      }
    }
  }

  return {
    isAllowed(urlPath: string): boolean {
      const cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

      // Check specific allow directives first
      for (const allow of allows) {
        if (cleanPath.startsWith(allow)) {
          return true;
        }
      }

      // Check disallow directives
      for (const disallow of disallows) {
        if (cleanPath.startsWith(disallow)) {
          return false;
        }
      }

      return true;
    },
  };
}

/**
 * Heuristic scoring for candidate links.
 * Priority 1 (Score 10): careers, jobs, hiring, join-us, work-with-us
 * Priority 2 (Score 7): handbook, culture, about, team, values
 * Priority 3 (Score 5): engineering blog, tech-blog
 */
export function scoreCandidateUrl(urlPath: string, anchorText = ''): number {
  const normalizedPath = urlPath.toLowerCase();
  const normalizedText = anchorText.toLowerCase().trim();

  // Priority 1 patterns: Hiring & Careers (Score 10)
  const p1PathRegex = /\b(careers?|jobs?|hiring|join-us|work-with-us|open-roles|positions)\b/i;
  const p1TextRegex = /\b(careers?|jobs?|hiring|join us|work with us|open roles|positions)\b/i;
  if (
    p1PathRegex.test(normalizedPath) ||
    p1TextRegex.test(normalizedText) ||
    normalizedPath.includes('/engineering/hiring')
  ) {
    return 10;
  }

  // Priority 2 patterns: Culture, Handbook, About, Team (Score 7)
  const p2PathRegex = /\b(handbook|culture|about|about-us|team|values|life-at)\b/i;
  const p2TextRegex = /\b(handbook|culture|about us|about|our team|values|life at)\b/i;
  if (p2PathRegex.test(normalizedPath) || p2TextRegex.test(normalizedText)) {
    return 7;
  }

  // Priority 3 patterns: Engineering & Tech Blog (Score 5)
  const p3PathRegex = /\b(blog\/engineering|tech-blog|engineering|technology)\b/i;
  const p3TextRegex = /\b(engineering blog|tech blog|engineering team)\b/i;
  if (p3PathRegex.test(normalizedPath) || p3TextRegex.test(normalizedText)) {
    return 5;
  }

  // Low interest / generic internal links
  return 1;
}

interface DiscoveredLink {
  url: string;
  score: number;
  isHiringRelated: boolean;
}

/**
 * Extracts and scores valid internal candidate links from an HTML document.
 */
function extractCandidateLinks(
  html: string,
  currentUrl: URL,
  robotsPolicy: RobotsPolicy
): DiscoveredLink[] {
  const $ = cheerio.load(html);
  const links: DiscoveredLink[] = [];
  const seen = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text();
    if (!href) return;

    try {
      // Resolve relative URL
      const resolved = new URL(href, currentUrl);

      // Must share origin or hostname (same company domain)
      if (resolved.hostname !== currentUrl.hostname) {
        return;
      }

      // Discard non-HTML / asset extensions
      if (/\.(pdf|png|jpe?g|gif|svg|zip|tar|gz|mp4|webm|css|js|json|xml|ico)$/i.test(resolved.pathname)) {
        return;
      }

      // Discard anchors and query bloat
      resolved.hash = '';
      const cleanHref = resolved.href;

      // Check robots.txt disallow rules
      if (!robotsPolicy.isAllowed(resolved.pathname)) {
        return;
      }

      if (cleanHref === currentUrl.href || seen.has(cleanHref)) {
        return;
      }

      seen.add(cleanHref);

      const score = scoreCandidateUrl(resolved.pathname, text);
      const isHiring = score === 10 || /\b(careers?|jobs?|hiring|interview)\b/i.test(resolved.pathname);

      links.push({
        url: cleanHref,
        score,
        isHiringRelated: isHiring,
      });
    } catch {
      // Invalid URL syntax, ignore
    }
  });

  return links.sort((a, b) => b.score - a.score);
}

/**
 * Smart BFS Company Site Crawler.
 * Safely fetches the company landing page, parses robots.txt, extracts and ranks
 * candidate hiring and company overview links, and crawls the top candidates.
 */
export async function crawlCompanySite(
  companyUrl: string,
  options: CrawlOptions = {}
): Promise<CrawlResult> {
  const {
    maxAuxiliaryPages = 3,
    timeoutMs = 5000,
    concurrency = 2,
    allowLocal = process.env.ALLOW_LOCAL_URLS === 'true',
  } = options;

  const pagesUsed: string[] = [];
  let companySummaryText = '';
  let hiringProcessText: string | null = null;

  let rootUrl: URL;
  try {
    rootUrl = new URL(companyUrl);
  } catch {
    return {
      pagesUsed: [],
      companySummaryText: '',
      hiringProcessText: null,
    };
  }

  // 1. Fetch robots.txt (if available)
  let robotsPolicy: RobotsPolicy = { isAllowed: () => true };
  try {
    const robotsUrl = new URL('/robots.txt', rootUrl).toString();
    const robotsResp = await safeFetch(robotsUrl, {
      allowLocal,
      timeoutMs,
    });
    if (robotsResp.ok) {
      const robotsBody = await robotsResp.text();
      robotsPolicy = parseRobotsTxt(robotsBody);
    }
  } catch {
    // robots.txt missing, 404, or timed out - proceed with default permissive policy
  }

  // 2. Fetch root landing page
  let rootHtml = '';
  try {
    const rootResp = await safeFetch(rootUrl.toString(), {
      allowLocal,
      timeoutMs,
    });

    if (rootResp.ok) {
      rootHtml = await rootResp.text();
      pagesUsed.push(rootUrl.toString());
      companySummaryText = cleanHtml(rootHtml);
    } else {
      // Root returned 404 or other HTTP error
      return {
        pagesUsed: [],
        companySummaryText: `Company website at ${companyUrl} returned HTTP ${rootResp.status}.`,
        hiringProcessText: null,
      };
    }
  } catch (err: unknown) {
    // SSRFError or network failure on root
    const message = err instanceof Error ? err.message : String(err);
    return {
      pagesUsed: [],
      companySummaryText: `Could not retrieve company website at ${companyUrl}: ${message}`,
      hiringProcessText: null,
    };
  }

  // 3. Extract and rank candidate links from root page
  const discoveredLinks = extractCandidateLinks(rootHtml, rootUrl, robotsPolicy);

  // Take top N candidate links with score >= 5 (careers, about, culture, tech blog)
  const topCandidates = discoveredLinks
    .filter((link) => link.score >= 5)
    .slice(0, maxAuxiliaryPages);

  // 4. Crawl top candidate links with concurrency limit
  const hiringTexts: string[] = [];
  const aboutTexts: string[] = [];

  // Helper for controlled concurrency
  for (let i = 0; i < topCandidates.length; i += concurrency) {
    const chunk = topCandidates.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (candidate) => {
        try {
          const resp = await safeFetch(candidate.url, {
            allowLocal,
            timeoutMs,
          });

          if (!resp.ok) {
            // 404 or error on auxiliary page — ignore and continue
            return;
          }

          const pageHtml = await resp.text();
          pagesUsed.push(candidate.url);
          const cleanPageText = cleanHtml(pageHtml);

          if (candidate.isHiringRelated) {
            hiringTexts.push(`--- Hiring / Careers (${candidate.url}) ---\n${cleanPageText}`);
          } else {
            aboutTexts.push(`--- About / Culture (${candidate.url}) ---\n${cleanPageText}`);
          }
        } catch {
          // Timeout or fetch failure on auxiliary link — continue without throwing
        }
      })
    );
  }

  if (aboutTexts.length > 0) {
    companySummaryText += `\n\n${aboutTexts.join('\n\n')}`;
  }

  if (hiringTexts.length > 0) {
    hiringProcessText = hiringTexts.join('\n\n');
  }

  return {
    pagesUsed,
    companySummaryText,
    hiringProcessText,
  };
}
