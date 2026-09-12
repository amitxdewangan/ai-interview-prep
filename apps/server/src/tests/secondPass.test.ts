import { describe, it, expect, vi } from 'vitest';
import type { RoleRequirement, Question } from '@repo/shared';
import { ensureCoverage } from '../pipeline/secondPass.js';
import { LlmClient } from '../llm/client.js';

describe('Phase 5: Second-Pass Coverage Loop', () => {
  const requirements: RoleRequirement[] = [
    { id: 'r1', text: 'React and TypeScript', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Node.js distributed systems', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Mentoring junior engineers', kind: 'behavioural', priority: 'must' },
    { id: 'r4', text: 'Docker & Kubernetes', kind: 'technical', priority: 'nice' },
  ];

  it('completes in pass 1 without calling LLM if all must-haves are already covered', async () => {
    const fullyCoveredQuestions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain React hooks lifecycle.',
        answer_outline: 'Outline hooks rules.',
        difficulty: 2,
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'technical',
        prompt: 'How do you architect distributed Node services?',
        answer_outline: 'Explain clustering and event loop.',
        difficulty: 3,
      },
      {
        id: 'q3',
        requirement_ids: ['r3'],
        category: 'behavioural',
        prompt: 'Describe how you mentored a junior engineer.',
        answer_outline: 'STAR framework.',
        difficulty: 1,
      },
    ];

    const mockFetch = vi.fn();
    const client = new LlmClient({
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    const result = await ensureCoverage(requirements, fullyCoveredQuestions, {}, client, 2);

    expect(result.coverage.passes).toBe(1);
    expect(result.questions.length).toBe(3);
    // r4 is nice-to-have, so must-haves are 100% covered
    expect(result.coverage.uncovered_requirement_ids).toEqual(['r4']);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('triggers pass 2 when must-have gaps exist and appends gap-filling questions', async () => {
    // Only covers r1; r2 and r3 (must-haves) are missing!
    const initialQuestions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain React hooks lifecycle.',
        answer_outline: 'Outline hooks rules.',
        difficulty: 2,
      },
    ];

    const mockGapFillResponse = JSON.stringify([
      {
        requirement_ids: ['r2'],
        category: 'technical',
        prompt: 'How do you design high-throughput Node.js microservices?',
        answer_outline: 'Explain event loop, streams, and IPC.',
        difficulty: 3,
      },
      {
        requirement_ids: ['r3'],
        category: 'behavioural',
        prompt: 'Tell me about a time you mentored an engineer through a complex technical issue.',
        answer_outline: 'STAR response.',
        difficulty: 2,
      },
    ]);

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: mockGapFillResponse }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const client = new LlmClient({
      apiKey: 'test-key',
      baseDelayMs: 10,
      maxDelayMs: 20,
      fetchFn: mockFetch,
    });

    const result = await ensureCoverage(
      requirements,
      initialQuestions,
      { roleTitle: 'Senior Fullstack Engineer', companyName: 'Acme Corp' },
      client,
      2
    );

    expect(result.coverage.passes).toBe(2);
    expect(result.questions.length).toBe(3);
    expect(result.questions[1].id).toBe('q2');
    expect(result.questions[1].requirement_ids).toContain('r2');
    expect(result.questions[2].id).toBe('q3');
    expect(result.questions[2].requirement_ids).toContain('r3');
    // Must-haves r1, r2, r3 are all covered; only nice-to-have r4 remains
    expect(result.coverage.uncovered_requirement_ids).toEqual(['r4']);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('terminates loop when passes reaches maxPasses even if gaps remain', async () => {
    // Zero coverage
    const initialQuestions: Question[] = [];

    // Mock returns an empty question array
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '[]' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const client = new LlmClient({
      apiKey: 'test-key',
      baseDelayMs: 10,
      maxDelayMs: 20,
      fetchFn: mockFetch,
    });

    const result = await ensureCoverage(requirements, initialQuestions, {}, client, 2);

    expect(result.coverage.passes).toBe(2);
    expect(result.coverage.uncovered_requirement_ids.length).toBe(4);
  });
});
