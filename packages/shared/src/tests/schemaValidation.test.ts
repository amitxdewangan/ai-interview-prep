import { describe, it, expect } from 'vitest';
import {
  AppendixAKitSchema,
  RoleRequirementSchema,
  QuestionSchema,
  FlashcardSchema,
  ScheduleSchema,
  CoverageSchema,
} from '../schemas/kit.schema.js';
import {
  BatchInputCaseSchema,
  BatchInputSchema,
  BatchCaseResultSchema,
  BatchOutputSchema,
} from '../schemas/batch.schema.js';
import type { AppendixAKit } from '../types/kit.types.js';

describe('Phase 12: Appendix A & B Schema Validation Suites', () => {
  // Canonical valid Appendix A Kit fixture
  const validKit: AppendixAKit = {
    source: {
      company: 'Acme Corp',
      company_url: 'https://acme.example.com',
      role: 'Staff Systems Architect',
      location: 'San Francisco, CA / Remote',
      jd_chars: 1450,
      researched_at: '2026-09-14T20:00:00.000Z',
      pages_used: [
        'https://acme.example.com',
        'https://acme.example.com/careers',
        'https://acme.example.com/about',
      ],
    },
    company_brief: {
      summary: 'Acme Corp builds globally distributed event streaming and data platform solutions.',
      what_they_do: 'Next-generation cloud data pipelines processing trillions of events per day.',
      sources: ['https://acme.example.com/about', 'https://acme.example.com/careers'],
    },
    role: {
      title: 'Staff Systems Architect',
      seniority: 'Staff',
      responsibilities: [
        'Design fault-tolerant distributed stream processing engines',
        'Mentor principal and senior engineers across infrastructure pods',
        'Drive multi-region disaster recovery and consensus architecture',
      ],
      requirements: [
        {
          id: 'r1',
          text: 'Deep expertise in distributed consensus protocols (Raft, Paxos)',
          kind: 'technical',
          priority: 'must',
        },
        {
          id: 'r2',
          text: 'Hands-on mastery of Rust or Go for low-latency systems',
          kind: 'technical',
          priority: 'must',
        },
        {
          id: 'r3',
          text: 'Cross-functional technical leadership and executive architectural reviews',
          kind: 'behavioural',
          priority: 'must',
        },
        {
          id: 'r4',
          text: 'Kubernetes cluster operators and eBPF observability',
          kind: 'technical',
          priority: 'nice',
        },
        {
          id: 'r5',
          text: 'Fintech compliance and SOC2 auditing standards',
          kind: 'domain',
          priority: 'nice',
        },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1', 'r2'],
        category: 'system-design',
        prompt: 'Design a distributed write-ahead log with Raft consensus that guarantees linearizable reads.',
        answer_outline: 'Leader lease mechanisms, log compaction, snapshot transfer, disk fsync latency mitigation.',
        difficulty: 3,
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'technical',
        prompt: 'How do you prevent memory leaks and manage zero-copy networking buffers in high-throughput Go or Rust services?',
        answer_outline: 'Ring buffers, sync.Pool in Go, non-allocating parsers, pinned memory segments in Rust.',
        difficulty: 3,
      },
      {
        id: 'q3',
        requirement_ids: ['r3'],
        category: 'behavioural',
        prompt: 'Describe a situation where you had to persuade skeptical executives to decommission a legacy messaging bus.',
        answer_outline: 'STAR framework: situation assessment, risk quantification, progressive migration milestones, business payoff.',
        difficulty: 2,
      },
      {
        id: 'q4',
        requirement_ids: ['r4'],
        category: 'technical',
        prompt: 'Explain how eBPF probes can trace packet drops inside the Linux network stack without kernel modification.',
        answer_outline: 'eBPF bytecode verifier, kprobes/tracepoints, perf event rings, user-space aggregation.',
        difficulty: 2,
      },
      {
        id: 'q5',
        requirement_ids: [],
        category: 'company-fit',
        prompt: 'What architectural principles resonate most with your approach to resilient distributed platforms?',
        answer_outline: 'Graceful degradation, fail-fast defaults, continuous chaos testing, ergonomic observability.',
        difficulty: 1,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is the difference between linearizability and serializability in distributed storage?',
        back: 'Linearizability is a real-time recency guarantee on single operations; serializability guarantees multi-operation transaction ordering without real-time bounds.',
        requirement_ids: ['r1'],
      },
      {
        id: 'f2',
        front: 'How does Raft handle split-vote scenarios during leader elections?',
        back: 'Raft uses randomized election timeouts (e.g. 150ms-300ms) to ensure split votes are quickly resolved in subsequent rounds.',
        requirement_ids: ['r1'],
      },
      {
        id: 'f3',
        front: 'What are the performance trade-offs of kernel-bypass networking (DPDK) vs standard sockets?',
        back: 'DPDK achieves ultra-low latency and zero-copy packet ingress by polling CPU cores, trading higher CPU utilization for sub-microsecond latency.',
        requirement_ids: ['r2'],
      },
    ],
    schedule: {
      days_available: 5,
      days: [
        {
          day: 1,
          focus: 'Distributed Consensus & Core Architecture (R1)',
          question_ids: ['q1'],
          minutes: 45,
        },
        {
          day: 2,
          focus: 'Low-Latency Systems & Memory Buffers (R2)',
          question_ids: ['q2'],
          minutes: 40,
        },
        {
          day: 3,
          focus: 'Staff Technical Leadership & Migration Alignment (R3)',
          question_ids: ['q3'],
          minutes: 35,
        },
        {
          day: 4,
          focus: 'Observability, eBPF & Platform Operators (R4)',
          question_ids: ['q4'],
          minutes: 30,
        },
        {
          day: 5,
          focus: 'Company Alignment & Architectural Ethics',
          question_ids: ['q5'],
          minutes: 30,
        },
      ],
    },
    coverage: {
      uncovered_requirement_ids: ['r5'],
      passes: 2,
    },
  };

  // =========================================================================
  // 1. Appendix A Valid Fixture Validation
  // =========================================================================
  describe('AppendixAKitSchema — Valid Fixtures', () => {
    it('successfully parses a canonical valid Appendix A kit', () => {
      const parsed = AppendixAKitSchema.parse(validKit);
      expect(parsed.source.company).toBe('Acme Corp');
      expect(parsed.questions).toHaveLength(5);
      expect(parsed.flashcards).toHaveLength(3);
      expect(parsed.schedule.days).toHaveLength(5);
      expect(parsed.coverage.passes).toBe(2);
    });

    it('validates safeParse returns success true with fully typed data', () => {
      const result = AppendixAKitSchema.safeParse(validKit);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role.requirements[0].id).toBe('r1');
      }
    });

    it('accepts empty uncovered_requirement_ids when 100% coverage is achieved', () => {
      const fullCoverageKit = {
        ...validKit,
        coverage: {
          uncovered_requirement_ids: [],
          passes: 1,
        },
      };
      expect(AppendixAKitSchema.safeParse(fullCoverageKit).success).toBe(true);
    });
  });

  // =========================================================================
  // 2. Appendix A Corrupt Fixtures Rejection
  // =========================================================================
  describe('AppendixAKitSchema — Corrupt Fixtures Rejection', () => {
    it('rejects kit missing top-level sections', () => {
      const missingRole = { ...validKit } as any;
      delete missingRole.role;
      expect(AppendixAKitSchema.safeParse(missingRole).success).toBe(false);

      const missingSchedule = { ...validKit } as any;
      delete missingSchedule.schedule;
      expect(AppendixAKitSchema.safeParse(missingSchedule).success).toBe(false);

      const missingCoverage = { ...validKit } as any;
      delete missingCoverage.coverage;
      expect(AppendixAKitSchema.safeParse(missingCoverage).success).toBe(false);
    });

    it('rejects invalid requirement kind and priority', () => {
      const invalidKind = {
        ...validKit,
        role: {
          ...validKit.role,
          requirements: [
            { id: 'r1', text: 'Some req', kind: 'soft-skills' as any, priority: 'must' as const },
          ],
        },
      };
      expect(AppendixAKitSchema.safeParse(invalidKind).success).toBe(false);

      const invalidPriority = {
        ...validKit,
        role: {
          ...validKit.role,
          requirements: [
            { id: 'r1', text: 'Some req', kind: 'technical' as const, priority: 'urgent' as any },
          ],
        },
      };
      expect(AppendixAKitSchema.safeParse(invalidPriority).success).toBe(false);
    });

    it('rejects question with invalid difficulty (0, 4, or float)', () => {
      const diff0 = {
        ...validKit,
        questions: [{ ...validKit.questions[0], difficulty: 0 as any }],
      };
      expect(AppendixAKitSchema.safeParse(diff0).success).toBe(false);

      const diff4 = {
        ...validKit,
        questions: [{ ...validKit.questions[0], difficulty: 4 as any }],
      };
      expect(AppendixAKitSchema.safeParse(diff4).success).toBe(false);

      const diffFloat = {
        ...validKit,
        questions: [{ ...validKit.questions[0], difficulty: 2.5 as any }],
      };
      expect(AppendixAKitSchema.safeParse(diffFloat).success).toBe(false);
    });

    it('rejects question with invalid category', () => {
      const badCategory = {
        ...validKit,
        questions: [{ ...validKit.questions[0], category: 'coding-challenge' as any }],
      };
      expect(AppendixAKitSchema.safeParse(badCategory).success).toBe(false);
    });

    it('rejects schedule with non-integer minutes', () => {
      const floatMinutes = {
        ...validKit,
        schedule: {
          ...validKit.schedule,
          days: [
            {
              day: 1,
              focus: 'Test',
              question_ids: ['q1'],
              minutes: 45.7, // Non-integer!
            },
          ],
        },
      };
      expect(AppendixAKitSchema.safeParse(floatMinutes).success).toBe(false);
    });

    it('rejects schedule with negative minutes or non-positive day index', () => {
      const negMinutes = {
        ...validKit,
        schedule: {
          ...validKit.schedule,
          days: [
            {
              day: 1,
              focus: 'Test',
              question_ids: ['q1'],
              minutes: -20,
            },
          ],
        },
      };
      expect(AppendixAKitSchema.safeParse(negMinutes).success).toBe(false);

      const dayZero = {
        ...validKit,
        schedule: {
          ...validKit.schedule,
          days: [
            {
              day: 0, // Must be positive (1-indexed)
              focus: 'Test',
              question_ids: ['q1'],
              minutes: 30,
            },
          ],
        },
      };
      expect(AppendixAKitSchema.safeParse(dayZero).success).toBe(false);
    });

    it('rejects flashcards missing front or back', () => {
      const missingBack = {
        ...validKit,
        flashcards: [{ id: 'f1', front: 'Question?', requirement_ids: ['r1'] } as any],
      };
      expect(AppendixAKitSchema.safeParse(missingBack).success).toBe(false);
    });

    it('rejects source with invalid data types', () => {
      const badSource = {
        ...validKit,
        source: {
          ...validKit.source,
          jd_chars: -5, // Must be non-negative!
        },
      };
      expect(AppendixAKitSchema.safeParse(badSource).success).toBe(false);

      const floatJdChars = {
        ...validKit,
        source: {
          ...validKit.source,
          jd_chars: 120.5, // Must be integer!
        },
      };
      expect(AppendixAKitSchema.safeParse(floatJdChars).success).toBe(false);

      const missingCompany = {
        ...validKit,
        source: {
          ...validKit.source,
          company: undefined as any,
        },
      };
      expect(AppendixAKitSchema.safeParse(missingCompany).success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Appendix B Batch Input & Output Contracts
  // =========================================================================
  describe('Appendix B Batch Schemas (BatchInputSchema & BatchOutputSchema)', () => {
    it('validates a correct batch input array', () => {
      const validBatchInput = [
        {
          id: 'case-01',
          jd: 'Senior Go Developer with distributed systems experience.',
          company_url: 'https://posthog.com',
          days: 5,
        },
        {
          id: 'case-02',
          jd: 'Junior Frontend Developer',
          company_url: 'https://example.com',
          days: 1,
        },
      ];

      const parsed = BatchInputSchema.parse(validBatchInput);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].days).toBe(5);
    });

    it('rejects batch input cases with non-positive days (days <= 0)', () => {
      const zeroDays = [
        {
          id: 'case-bad',
          jd: 'Some JD',
          company_url: 'https://example.com',
          days: 0,
        },
      ];
      expect(BatchInputSchema.safeParse(zeroDays).success).toBe(false);

      const negDays = [
        {
          id: 'case-bad',
          jd: 'Some JD',
          company_url: 'https://example.com',
          days: -3,
        },
      ];
      expect(BatchInputSchema.safeParse(negDays).success).toBe(false);
    });

    it('rejects batch input with non-integer days', () => {
      const floatDays = [
        {
          id: 'case-bad',
          jd: 'Some JD',
          company_url: 'https://example.com',
          days: 4.5,
        },
      ];
      expect(BatchInputSchema.safeParse(floatDays).success).toBe(false);
    });

    it('validates a compliant BatchOutputFile with mixed ok and failed cases', () => {
      const validBatchOutput = {
        version: '1.0' as const,
        generated_at: '2026-09-14T20:30:00.000Z',
        kits: [
          {
            id: 'case-01',
            status: 'ok' as const,
            kit: validKit,
            error: null,
          },
          {
            id: 'case-02',
            status: 'failed' as const,
            kit: null,
            error: {
              code: 'SCRAPER_TIMEOUT',
              message: 'Company website timed out after 3 retries.',
            },
          },
        ],
      };

      const parsed = BatchOutputSchema.parse(validBatchOutput);
      expect(parsed.version).toBe('1.0');
      expect(parsed.kits).toHaveLength(2);
      expect(parsed.kits[0].status).toBe('ok');
      expect(parsed.kits[1].status).toBe('failed');
      expect(parsed.kits[1].error?.code).toBe('SCRAPER_TIMEOUT');
    });

    it('rejects batch output with unsupported version string', () => {
      const badVersion = {
        version: '2.0' as any,
        generated_at: '2026-09-14T20:30:00.000Z',
        kits: [],
      };
      expect(BatchOutputSchema.safeParse(badVersion).success).toBe(false);
    });

    it('rejects batch output case with malformed kit or malformed error', () => {
      const badKitCase = {
        version: '1.0' as const,
        generated_at: '2026-09-14T20:30:00.000Z',
        kits: [
          {
            id: 'case-bad-kit',
            status: 'ok' as const,
            kit: { invalid_key: true } as any, // Not matching AppendixAKitSchema!
            error: null,
          },
        ],
      };
      expect(BatchOutputSchema.safeParse(badKitCase).success).toBe(false);

      const badErrorCase = {
        version: '1.0' as const,
        generated_at: '2026-09-14T20:30:00.000Z',
        kits: [
          {
            id: 'case-bad-error',
            status: 'failed' as const,
            kit: null,
            error: 'Not an object' as any, // Must be { code, message } object!
          },
        ],
      };
      expect(BatchOutputSchema.safeParse(badErrorCase).success).toBe(false);
    });

    it('rejects batch output case with invalid status enum', () => {
      const badStatusCase = {
        version: '1.0' as const,
        generated_at: '2026-09-14T20:30:00.000Z',
        kits: [
          {
            id: 'case-bad-status',
            status: 'in_progress' as any,
            kit: null,
            error: null,
          },
        ],
      };
      expect(BatchOutputSchema.safeParse(badStatusCase).success).toBe(false);
    });

    it('rejects batch output missing required version or generated_at fields', () => {
      const missingVersion = {
        generated_at: '2026-09-14T20:30:00.000Z',
        kits: [],
      };
      expect(BatchOutputSchema.safeParse(missingVersion).success).toBe(false);

      const missingGeneratedAt = {
        version: '1.0' as const,
        kits: [],
      };
      expect(BatchOutputSchema.safeParse(missingGeneratedAt).success).toBe(false);
    });
  });
});
