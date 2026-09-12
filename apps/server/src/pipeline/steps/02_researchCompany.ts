import { crawlCompanySite, type CrawlResult, type CrawlOptions } from '../../scraper/crawler.js';
import { searchPublicDiscussions } from '../../scraper/discussions.js';

export interface CompanyResearch {
  companyName: string;
  pagesUsed: string[];
  companySummaryText: string;
  hiringProcessText: string | null;
  discussionsText: string | null;
}

export interface ResearchCompanyOptions extends CrawlOptions {
  companyNameOverride?: string;
}

/**
 * Extracts a sensible company name from a URL hostname or pathname.
 * e.g., "https://www.stripe.com" -> "Stripe"
 * e.g., "http://localhost:8080/acme-corp" -> "Acme Corp"
 */
export function extractCompanyNameFromUrl(companyUrl: string): string {
  try {
    const url = new URL(companyUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    // Handle localhost / test URLs where company is in pathname: /acme
    if (host === 'localhost' || host === '127.0.0.1') {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return formatCompanyName(segments[0]);
      }
      return 'Target Company';
    }

    // Handle domain names (e.g. "stripe.com" -> "stripe")
    const parts = host.split('.');
    const mainPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return formatCompanyName(mainPart);
  } catch {
    return 'Target Company';
  }
}

function formatCompanyName(raw: string): string {
  return raw
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

/**
 * Step 2: Researches target company by crawling homepage/auxiliary links and querying public discussions.
 * Gracefully handles 404s, missing pages, or network errors without crashing the run.
 */
export async function researchCompany(
  companyUrl: string,
  options: ResearchCompanyOptions = {}
): Promise<CompanyResearch> {
  const companyName =
    options.companyNameOverride ?? extractCompanyNameFromUrl(companyUrl);

  // 1. Crawl company website (robots.txt, landing, careers, about)
  let crawlResult: CrawlResult;
  try {
    crawlResult = await crawlCompanySite(companyUrl, options);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    crawlResult = {
      pagesUsed: [],
      companySummaryText: `Unable to retrieve company website: ${msg}`,
      hiringProcessText: null,
    };
  }

  // 2. Search public discussion forums (Hacker News Algolia API)
  let discussionsText: string | null = null;
  try {
    discussionsText = await searchPublicDiscussions(companyName, {
      allowLocal: options.allowLocal,
      timeoutMs: options.timeoutMs,
    });
  } catch {
    discussionsText = null;
  }

  return {
    companyName,
    pagesUsed: crawlResult.pagesUsed,
    companySummaryText: crawlResult.companySummaryText,
    hiringProcessText: crawlResult.hiringProcessText,
    discussionsText,
  };
}
