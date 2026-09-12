import { describe, it, expect, vi } from 'vitest';
import {
  RoleSchema,
  CompanyBriefSchema,
  QuestionSchema,
  FlashcardSchema,
  type Role,
  type CompanyBrief,
} from '@repo/shared';
import { z } from 'zod';
import { extractRequirements } from '../pipeline/steps/01_extractRequirements.js';
import {
  researchCompany,
  extractCompanyNameFromUrl,
  type CompanyResearch,
} from '../pipeline/steps/02_researchCompany.js';
import { generateBrief } from '../pipeline/steps/03_generateBrief.js';
import { generateQuestions } from '../pipeline/steps/04_generateQuestions.js';
import { generateFlashcards } from '../pipeline/steps/05_generateFlashcards.js';
import { LlmClient } from '../llm/client.js';

describe('Phase 4: Multi-Step Deliberate Research & Generation Pipeline', () => {
  // Helper to create a mock LLM client with fast rate limiter
  const createMockLlm = (mockResponseText: string) => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: mockResponseText }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    return new LlmClient({
      apiKey: 'test-key',
      baseDelayMs: 10,
      maxDelayMs: 20,
      fetchFn: mockFetch,
    });
  };

  // =========================================================================
  // Step 1: Requirement Extraction
  // =========================================================================
  describe('Step 1: extractRequirements', () => {
    it('extracts role metadata, responsibilities, and requirements conforming to RoleSchema', async () => {
      const mockRoleJson = JSON.stringify({
        title: 'Senior Frontend Engineer',
        seniority: 'Senior',
        responsibilities: [
          'Lead architecture of high-performance web applications',
          'Mentor junior and mid-level engineers',
        ],
        requirements: [
          {
            id: 'r1',
            text: '5+ years experience with React, TypeScript, and state management',
            kind: 'technical',
            priority: 'must',
          },
          {
            id: 'r2',
            text: 'Proven experience leading technical design and mentoring teammates',
            kind: 'behavioural',
            priority: 'must',
          },
          {
            id: 'r3',
            text: 'Experience with Next.js and server-side rendering is a plus',
            kind: 'technical',
            priority: 'nice',
          },
        ],
      });

      const client = createMockLlm(mockRoleJson);
      const jd = `
        Senior Frontend Engineer at TechCorp.
        Required: 5+ years with React, TypeScript, state management. Proven experience mentoring teammates and leading technical design.
        Nice to have: Next.js and SSR.
      `;

      const role = await extractRequirements(jd, client);

      expect(RoleSchema.safeParse(role).success).toBe(true);
      expect(role.title).toBe('Senior Frontend Engineer');
      expect(role.seniority).toBe('Senior');
      expect(role.requirements.length).toBe(3);
      expect(role.requirements[0].id).toBe('r1');
      expect(role.requirements[0].priority).toBe('must');
      expect(role.requirements[2].priority).toBe('nice');
    });

    it('anti-hallucination: extracts only stated facts on thin 2-line JDs without fabricating skills', async () => {
      const mockThinJson = JSON.stringify({
        title: 'React Developer',
        seniority: 'Mid-Level',
        responsibilities: ['Build UI components in React'],
        requirements: [
          {
            id: 'r1',
            text: 'Experience with React and TypeScript',
            kind: 'technical',
            priority: 'must',
          },
        ],
      });

      const client = createMockLlm(mockThinJson);
      const thinJd = 'Looking for a React and TypeScript developer to build UI components.';

      const role = await extractRequirements(thinJd, client);

      expect(role.requirements.length).toBe(1);
      expect(role.requirements[0].text).toContain('React');
      // Verify no phantom requirements (e.g. AWS, Kubernetes, GraphQL) were hallucinated
      const allText = JSON.stringify(role);
      expect(allText).not.toContain('Kubernetes');
      expect(allText).not.toContain('AWS');
    });

    it('handles empty JD gracefully', async () => {
      const role = await extractRequirements('');
      expect(role.title).toBe('Unspecified Role');
      expect(role.requirements).toEqual([]);
    });
  });

  // =========================================================================
  // Step 2: Company Research
  // =========================================================================
  describe('Step 2: researchCompany helper & extraction', () => {
    it('extracts clean company name from domain or path', () => {
      expect(extractCompanyNameFromUrl('https://www.stripe.com/jobs')).toBe('Stripe');
      expect(extractCompanyNameFromUrl('https://datadoghq.com')).toBe('Datadoghq');
      expect(extractCompanyNameFromUrl('http://localhost:8080/acme-corp/careers')).toBe('Acme Corp');
    });

    it('coordinates company research and handles failures safely', async () => {
      const research = await researchCompany('https://example.com/careers', {
        timeoutMs: 100,
      });

      expect(research.companyName).toBeDefined();
      expect(Array.isArray(research.pagesUsed)).toBe(true);
    });
  });

  // =========================================================================
  // Step 3: Company Brief Generation
  // =========================================================================
  describe('Step 3: generateBrief', () => {
    it('synthesizes verified research into CompanyBrief conforming to CompanyBriefSchema', async () => {
      const mockBriefJson = JSON.stringify({
        summary: 'Stripe builds financial infrastructure and payment processing for internet businesses.',
        what_they_do: 'Global payment APIs, developer tooling, billing platforms, and treasury networks.',
        sources: ['https://stripe.com/about'],
      });

      const client = createMockLlm(mockBriefJson);
      const research: CompanyResearch = {
        companyName: 'Stripe',
        pagesUsed: ['https://stripe.com/about'],
        companySummaryText: 'Stripe is an Irish-American financial services and software as a service company.',
        hiringProcessText: 'Rigorous live coding and system design interviews.',
        discussionsText: null,
      };

      const brief = await generateBrief('https://stripe.com', research, client);

      expect(CompanyBriefSchema.safeParse(brief).success).toBe(true);
      expect(brief.summary).toContain('financial infrastructure');
      expect(brief.sources).toContain('https://stripe.com/about');
    });

    it('honestly reports when website is unreachable or returned 404 without hallucinating', async () => {
      const research: CompanyResearch = {
        companyName: 'GhostCo',
        pagesUsed: [],
        companySummaryText: 'Company website at https://ghostco.xyz returned HTTP 404.',
        hiringProcessText: null,
        discussionsText: null,
      };

      const brief = await generateBrief('https://ghostco.xyz', research);

      expect(brief.summary).toContain('No public information could be retrieved');
      expect(brief.what_they_do).toContain('could not be reached');
      expect(brief.sources).toEqual([]);
    });
  });

  // =========================================================================
  // Step 4: Categorized Question Generation (Deliberate Multi-Call)
  // =========================================================================
  describe('Step 4: generateQuestions', () => {
    const sampleRole: Role = {
      title: 'Senior Distributed Systems Engineer',
      seniority: 'Senior',
      responsibilities: ['Build distributed messaging platform'],
      requirements: [
        { id: 'r1', text: 'Distributed consensus algorithms (Raft, Paxos)', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Golang concurrency and memory profiling', kind: 'technical', priority: 'must' },
        { id: 'r3', text: 'Leading post-mortems and fostering blameless culture', kind: 'behavioural', priority: 'must' },
        { id: 'r4', text: 'High-throughput Kafka streaming', kind: 'domain', priority: 'nice' },
      ],
    };

    const sampleBrief: CompanyBrief = {
      summary: 'DataStream provides real-time event broker infrastructure.',
      what_they_do: 'Low-latency distributed event streaming engines.',
      sources: ['https://datastream.io'],
    };

    it('generates categorized questions with stable IDs, valid difficulty, and requirement links', async () => {
      const mockQuestionsBatch = JSON.stringify([
        {
          requirement_ids: ['r1'],
          category: 'technical',
          prompt: 'Explain leader election in Raft and how split-brain scenarios are resolved.',
          answer_outline: 'Discuss terms, heartbeat timeouts, quorum majority, and log matching.',
          difficulty: 3,
        },
        {
          requirement_ids: ['r3'],
          category: 'behavioural',
          prompt: 'Tell me about a high-severity production outage you managed and how you led the post-mortem.',
          answer_outline: 'STAR framework: situation, immediate mitigations, blameless RCA, and preventive actions.',
          difficulty: 2,
        },
      ]);

      const client = createMockLlm(mockQuestionsBatch);

      const questions = await generateQuestions(
        sampleRole,
        sampleBrief,
        'Candidates undergo a technical screen, distributed architecture round, and values interview.',
        client
      );

      expect(z.array(QuestionSchema).safeParse(questions).success).toBe(true);
      expect(questions.length).toBeGreaterThanOrEqual(2);

      // Verify sequential IDs
      expect(questions[0].id).toBe('q1');
      expect(questions[1].id).toBe('q2');

      // Verify valid difficulty bounds
      for (const q of questions) {
        expect([1, 2, 3]).toContain(q.difficulty);
        // Verify all requirement_ids exist in sampleRole
        for (const reqId of q.requirement_ids) {
          expect(['r1', 'r2', 'r3', 'r4']).toContain(reqId);
        }
      }
    });
  });

  // =========================================================================
  // Step 5: Flashcard Generation
  // =========================================================================
  describe('Step 5: generateFlashcards', () => {
    const sampleRole: Role = {
      title: 'Backend Engineer',
      seniority: 'Mid-Level',
      responsibilities: ['Develop microservices'],
      requirements: [
        { id: 'r1', text: 'PostgreSQL indexing and query optimization', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Redis caching strategies', kind: 'technical', priority: 'nice' },
      ],
    };

    it('generates high-yield study flashcards matching FlashcardSchema', async () => {
      const mockCardsJson = JSON.stringify([
        {
          front: 'What is the difference between B-Tree and GIN indexes in PostgreSQL?',
          back: 'B-Tree is optimal for equality and range queries on scalar data. GIN is designed for composite/array/jsonb containment queries.',
          requirement_ids: ['r1'],
        },
        {
          front: 'How do Cache-Aside and Write-Through caching patterns differ?',
          back: 'Cache-Aside: App reads from cache; on miss, queries DB and updates cache. Write-Through: App writes to cache, which synchronously writes to DB.',
          requirement_ids: ['r2'],
        },
      ]);

      const client = createMockLlm(mockCardsJson);

      const questions = [
        {
          id: 'q1',
          requirement_ids: ['r1'],
          category: 'technical' as const,
          prompt: 'How do you optimize slow queries in Postgres?',
          answer_outline: 'Explain EXPLAIN ANALYZE, index selection, VACUUM.',
          difficulty: 2 as const,
        },
      ];

      const flashcards = await generateFlashcards(questions, sampleRole, client);

      expect(z.array(FlashcardSchema).safeParse(flashcards).success).toBe(true);
      expect(flashcards.length).toBe(2);
      expect(flashcards[0].id).toBe('f1');
      expect(flashcards[1].id).toBe('f2');
      expect(flashcards[0].front).toContain('PostgreSQL');
      expect(flashcards[0].requirement_ids).toEqual(['r1']);
    });
  });
});
