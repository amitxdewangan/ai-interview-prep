import { describe, it, expect } from 'vitest';
import type { RoleRequirement, Question } from '@repo/shared';
import { ScheduleSchema } from '@repo/shared';
import { findCoverageGaps } from '../pipeline/deterministic/coverageEngine.js';
import { allocateSchedule } from '../pipeline/deterministic/scheduleEngine.js';

describe('Phase 1: Deterministic Domain Engines', () => {
  // Test Fixtures
  const sampleRequirements: RoleRequirement[] = [
    { id: 'r1', text: '5+ years React and TypeScript', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Node.js and distributed systems backend architecture', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Mentoring engineers and driving technical design', kind: 'behavioural', priority: 'must' },
    { id: 'r4', text: 'Docker, Kubernetes and CI/CD pipelines', kind: 'technical', priority: 'nice' },
    { id: 'r5', text: 'Fintech domain knowledge', kind: 'domain', priority: 'nice' },
  ];

  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r2'],
      category: 'system-design',
      prompt: 'Design a distributed rate-limiter for high throughput microservices.',
      answer_outline: 'Token bucket algorithm, Redis cluster with Lua scripts, sliding window.',
      difficulty: 3,
    },
    {
      id: 'q2',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain React Fiber reconciliation and concurrent rendering primitives.',
      answer_outline: 'Fiber tree, workInProgress, commit phase, useTransition.',
      difficulty: 3,
    },
    {
      id: 'q3',
      requirement_ids: ['r1', 'r4'],
      category: 'technical',
      prompt: 'How do you optimize Docker images for a TypeScript Node.js backend?',
      answer_outline: 'Multi-stage builds, non-root user, caching node_modules.',
      difficulty: 2,
    },
    {
      id: 'q4',
      requirement_ids: ['r3'],
      category: 'behavioural',
      prompt: 'Tell me about a time you led a challenging technical migration and mentored peers.',
      answer_outline: 'STAR framework: situation, technical trade-offs, coaching, measurable outcome.',
      difficulty: 2,
    },
    {
      id: 'q5',
      requirement_ids: ['r4'],
      category: 'technical',
      prompt: 'What are the core differences between Docker container and VM?',
      answer_outline: 'Shared OS kernel vs hypervisor and guest OS.',
      difficulty: 1,
    },
    {
      id: 'q6',
      requirement_ids: [],
      category: 'company-fit',
      prompt: 'Why do you want to join our company and what drives your engineering ethics?',
      answer_outline: 'Mission alignment, product enthusiasm, personal values.',
      difficulty: 1,
    },
  ];

  // ==========================================
  // 1. Coverage Gap Engine Tests
  // ==========================================
  describe('Coverage Engine (findCoverageGaps)', () => {
    it('should report 100% coverage when all requirements are covered', () => {
      const fullCoverageQuestions: Question[] = [
        ...sampleQuestions,
        {
          id: 'q7',
          requirement_ids: ['r5'],
          category: 'technical',
          prompt: 'Explain double-entry bookkeeping in fintech ledger architecture.',
          answer_outline: 'Debits equal credits, transaction isolation, immutability.',
          difficulty: 2,
        },
      ];

      const result = findCoverageGaps(sampleRequirements, fullCoverageQuestions);
      expect(result.uncoveredIds).toEqual([]);
      expect(result.mustHaveGaps).toEqual([]);
      expect(result.niceToHaveGaps).toEqual([]);
      expect(result.coveragePercentage).toBe(100);
    });

    it('should correctly identify partial coverage and segregate must vs nice gaps', () => {
      // sampleQuestions covers r1, r2, r3 (must) and r4 (nice), but r5 (nice) is uncovered
      const result = findCoverageGaps(sampleRequirements, sampleQuestions);
      expect(result.uncoveredIds).toContain('r5');
      expect(result.mustHaveGaps).toEqual([]);
      expect(result.niceToHaveGaps).toEqual(['r5']);
      expect(result.coveragePercentage).toBe(80); // 4 out of 5 covered
    });

    it('should report 0% coverage and all must-haves when no questions match', () => {
      const result = findCoverageGaps(sampleRequirements, []);
      expect(result.uncoveredIds).toHaveLength(5);
      expect(result.mustHaveGaps).toEqual(['r1', 'r2', 'r3']);
      expect(result.niceToHaveGaps).toEqual(['r4', 'r5']);
      expect(result.coveragePercentage).toBe(0);
    });

    it('should correctly handle must-have requirement gaps', () => {
      // Only provide questions covering nice-to-haves (r4)
      const niceOnlyQuestions: Question[] = [sampleQuestions[4]]; // covers r4
      const result = findCoverageGaps(sampleRequirements, niceOnlyQuestions);
      expect(result.mustHaveGaps).toEqual(['r1', 'r2', 'r3']);
      expect(result.niceToHaveGaps).toEqual(['r5']);
      expect(result.uncoveredIds).toEqual(['r1', 'r2', 'r3', 'r5']);
      expect(result.coveragePercentage).toBe(20);
    });

    it('should handle empty requirements gracefully with 100% coverage', () => {
      const result = findCoverageGaps([], sampleQuestions);
      expect(result.uncoveredIds).toEqual([]);
      expect(result.mustHaveGaps).toEqual([]);
      expect(result.niceToHaveGaps).toEqual([]);
      expect(result.coveragePercentage).toBe(100);
    });
  });

  // ==========================================
  // 2. Arithmetic Schedule Allocator Tests
  // ==========================================
  describe('Schedule Allocator Engine (allocateSchedule)', () => {
    const testDayCounts = [1, 3, 5, 14, 30, 60];

    testDayCounts.forEach((daysAvailable) => {
      it(`should produce exactly ${daysAvailable} days for daysAvailable=${daysAvailable}`, () => {
        const schedule = allocateSchedule(daysAvailable, sampleRequirements, sampleQuestions);
        expect(schedule.days_available).toBe(daysAvailable);
        expect(schedule.days).toHaveLength(daysAvailable);

        // Verify day numbers are strictly 1-indexed sequential integers
        schedule.days.forEach((day, index) => {
          expect(day.day).toBe(index + 1);
        });

        // Verify entire schedule passes Appendix A Zod schema validation
        const validation = ScheduleSchema.safeParse(schedule);
        expect(validation.success).toBe(true);
      });

      it(`should enforce strictly integer minutes for all days in a ${daysAvailable}-day schedule`, () => {
        const schedule = allocateSchedule(daysAvailable, sampleRequirements, sampleQuestions);
        schedule.days.forEach((day) => {
          expect(Number.isInteger(day.minutes)).toBe(true);
          expect(day.minutes).toBeGreaterThan(0);
        });
      });

      it(`should contain valid question IDs with zero dangling references in a ${daysAvailable}-day schedule`, () => {
        const validIds = new Set(sampleQuestions.map((q) => q.id));
        const schedule = allocateSchedule(daysAvailable, sampleRequirements, sampleQuestions);
        schedule.days.forEach((day) => {
          day.question_ids.forEach((qId) => {
            expect(validIds.has(qId)).toBe(true);
          });
        });
      });

      it(`should guarantee all must-have requirements with matching questions appear in the schedule for ${daysAvailable} days`, () => {
        const schedule = allocateSchedule(daysAvailable, sampleRequirements, sampleQuestions);
        const scheduledQIds = new Set(schedule.days.flatMap((d) => d.question_ids));

        const mustReqs = sampleRequirements.filter((r) => r.priority === 'must');
        mustReqs.forEach((req) => {
          const matchingQuestions = sampleQuestions.filter((q) => q.requirement_ids.includes(req.id));
          if (matchingQuestions.length > 0) {
            const hasIncluded = matchingQuestions.some((q) => scheduledQIds.has(q.id));
            expect(hasIncluded).toBe(true);
          }
        });
      });
    });

    it('should consolidate high-intensity prep for a 1-day schedule with 180-240 minutes', () => {
      const schedule = allocateSchedule(1, sampleRequirements, sampleQuestions);
      expect(schedule.days).toHaveLength(1);
      const day1 = schedule.days[0];
      expect(day1.minutes).toBeGreaterThanOrEqual(180);
      expect(day1.minutes).toBeLessThanOrEqual(240);
      expect(Number.isInteger(day1.minutes)).toBe(true);

      // Must cover all must-have questions on day 1
      expect(day1.question_ids).toContain('q1');
      expect(day1.question_ids).toContain('q2');
      expect(day1.question_ids).toContain('q4');
    });

    it('should schedule difficulty 3 questions earlier than difficulty 1 questions', () => {
      const schedule = allocateSchedule(5, sampleRequirements, sampleQuestions);

      // Find which days difficulty 3 questions land on vs difficulty 1 questions
      const qDiff3 = sampleQuestions.filter((q) => q.difficulty === 3).map((q) => q.id);
      const qDiff1 = sampleQuestions.filter((q) => q.difficulty === 1).map((q) => q.id);

      const dayIndicesForDiff3: number[] = [];
      const dayIndicesForDiff1: number[] = [];

      schedule.days.forEach((day) => {
        if (day.question_ids.some((id) => qDiff3.includes(id))) {
          dayIndicesForDiff3.push(day.day);
        }
        if (day.question_ids.some((id) => qDiff1.includes(id))) {
          dayIndicesForDiff1.push(day.day);
        }
      });

      const earliestDiff3 = Math.min(...dayIndicesForDiff3);
      const earliestDiff1 = Math.min(...dayIndicesForDiff1);

      // Difficulty 3 must appear on or before the day difficulty 1 appears
      expect(earliestDiff3).toBeLessThanOrEqual(earliestDiff1);
      // Specifically on a 5-day schedule, diff 3 is on Day 1
      expect(earliestDiff3).toBe(1);
    });

    it('should prioritize review and mock practice on the final day for schedules >= 3 days', () => {
      const schedule = allocateSchedule(5, sampleRequirements, sampleQuestions);
      const lastDay = schedule.days[schedule.days.length - 1];
      expect(lastDay.day).toBe(5);
      expect(lastDay.focus.toLowerCase()).toContain('mock');
    });
  });
});
