import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  scoreCandidateUrl,
  parseRobotsTxt,
  crawlCompanySite,
} from '../scraper/crawler.js';

describe('Phase 2: BFS Company Site Crawler & Link Ranking', () => {
  describe('scoreCandidateUrl', () => {
    it('scores Priority 1 hiring links with 10 points', () => {
      expect(scoreCandidateUrl('/careers')).toBe(10);
      expect(scoreCandidateUrl('/jobs')).toBe(10);
      expect(scoreCandidateUrl('/hiring')).toBe(10);
      expect(scoreCandidateUrl('/join-us')).toBe(10);
      expect(scoreCandidateUrl('/work-with-us')).toBe(10);
      expect(scoreCandidateUrl('/engineering/hiring')).toBe(10);
      expect(scoreCandidateUrl('/company', 'View Open Jobs')).toBe(10);
      expect(scoreCandidateUrl('/team', 'Careers at Acme')).toBe(10);
    });

    it('scores Priority 2 culture and company links with 7 points', () => {
      expect(scoreCandidateUrl('/about')).toBe(7);
      expect(scoreCandidateUrl('/about-us')).toBe(7);
      expect(scoreCandidateUrl('/culture')).toBe(7);
      expect(scoreCandidateUrl('/handbook')).toBe(7);
      expect(scoreCandidateUrl('/team')).toBe(7);
      expect(scoreCandidateUrl('/values')).toBe(7);
      expect(scoreCandidateUrl('/info', 'Our Culture and Values')).toBe(7);
    });

    it('scores Priority 3 tech blog links with 5 points', () => {
      expect(scoreCandidateUrl('/blog/engineering')).toBe(5);
      expect(scoreCandidateUrl('/tech-blog')).toBe(5);
      expect(scoreCandidateUrl('/articles', 'Engineering Blog')).toBe(5);
    });

    it('scores generic/unrelated links with 1 point', () => {
      expect(scoreCandidateUrl('/privacy')).toBe(1);
      expect(scoreCandidateUrl('/terms-of-service')).toBe(1);
      expect(scoreCandidateUrl('/pricing')).toBe(1);
    });
  });

  describe('parseRobotsTxt', () => {
    it('correctly blocks disallowed paths', () => {
      const robots = `
        User-agent: *
        Disallow: /admin/
        Disallow: /private
      `;

      const policy = parseRobotsTxt(robots);
      expect(policy.isAllowed('/admin/dashboard')).toBe(false);
      expect(policy.isAllowed('/private/docs')).toBe(false);
      expect(policy.isAllowed('/careers')).toBe(true);
      expect(policy.isAllowed('/about')).toBe(true);
    });

    it('honors allow overrides over disallow directives', () => {
      const robots = `
        User-agent: *
        Disallow: /careers/
        Allow: /careers/engineering
      `;

      const policy = parseRobotsTxt(robots);
      expect(policy.isAllowed('/careers/engineering')).toBe(true);
      expect(policy.isAllowed('/careers/sales')).toBe(false);
    });

    it('ignores comments and empty lines', () => {
      const robots = `
        # Robots configuration
        User-agent: *
        # Block internal API
        Disallow: /api/ # Inline comment
      `;

      const policy = parseRobotsTxt(robots);
      expect(policy.isAllowed('/api/internal')).toBe(false);
      expect(policy.isAllowed('/about')).toBe(true);
    });
  });

  describe('crawlCompanySite resilience & execution', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      process.env.ALLOW_LOCAL_URLS = 'true';
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      delete process.env.ALLOW_LOCAL_URLS;
      vi.restoreAllMocks();
    });

    it('crawls root page and discovers candidate links accurately', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Acme Cloud Solutions</h1>
            <p>We provide next-gen cloud orchestration for enterprise customers.</p>
            <a href="/careers">Join our engineering team</a>
            <a href="/about-us">About Acme</a>
            <a href="https://external-ad.com">External Link</a>
          </body>
        </html>
      `;

      const mockCareersHtml = `
        <h1>Engineering at Acme</h1>
        <p>Our interview process consists of a technical screen, system design, and culture fit.</p>
      `;

      const mockAboutHtml = `
        <h1>About Acme</h1>
        <p>Founded in 2020 to build reliable developer tools.</p>
      `;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/robots.txt')) {
          return new Response('User-agent: *\nDisallow: /secret', { status: 200 });
        }
        if (url === 'http://localhost:3000/' || url === 'http://localhost:3000') {
          return new Response(mockHtml, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        }
        if (url.includes('/careers')) {
          return new Response(mockCareersHtml, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        }
        if (url.includes('/about-us')) {
          return new Response(mockAboutHtml, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        }
        return new Response('Not Found', { status: 404 });
      });

      const result = await crawlCompanySite('http://localhost:3000', {
        allowLocal: true,
      });

      expect(result.pagesUsed).toContain('http://localhost:3000/');
      expect(result.pagesUsed).toContain('http://localhost:3000/careers');
      expect(result.pagesUsed).toContain('http://localhost:3000/about-us');
      expect(result.companySummaryText).toContain('Acme Cloud Solutions');
      expect(result.companySummaryText).toContain('Founded in 2020');
      expect(result.hiringProcessText).toContain('interview process');
    });

    it('gracefully handles 404 on root without throwing', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('Page Not Found', { status: 404 })
      );

      const result = await crawlCompanySite('http://localhost:3000/nonexistent', {
        allowLocal: true,
      });

      expect(result.pagesUsed).toEqual([]);
      expect(result.companySummaryText).toContain('HTTP 404');
      expect(result.hiringProcessText).toBeNull();
    });

    it('gracefully handles 404 or network timeout on auxiliary links without failing run', async () => {
      const mockRootHtml = `
        <h1>Acme Systems</h1>
        <p>Reliable platform.</p>
        <a href="/careers">Broken Careers Link</a>
        <a href="/about">Working About Link</a>
      `;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/robots.txt')) {
          return new Response('', { status: 404 });
        }
        if (url === 'http://localhost:3000/') {
          return new Response(mockRootRootHtml(mockRootHtml), { status: 200 });
        }
        if (url.includes('/careers')) {
          // Auxiliary 404
          return new Response('Careers 404', { status: 404 });
        }
        if (url.includes('/about')) {
          return new Response('<h1>About Acme</h1><p>Mission details.</p>', { status: 200 });
        }
        return new Response('Error', { status: 500 });
      });

      function mockRootRootHtml(content: string) {
        return content;
      }

      const result = await crawlCompanySite('http://localhost:3000/', {
        allowLocal: true,
      });

      // The working links were crawled, broken link did not crash
      expect(result.pagesUsed).toContain('http://localhost:3000/');
      expect(result.pagesUsed).toContain('http://localhost:3000/about');
      expect(result.pagesUsed).not.toContain('http://localhost:3000/careers');
      expect(result.companySummaryText).toContain('Acme Systems');
    });

    it('handles invalid URL input gracefully', async () => {
      const result = await crawlCompanySite('invalid://broken url');
      expect(result.pagesUsed).toEqual([]);
      expect(result.hiringProcessText).toBeNull();
    });
  });
});
