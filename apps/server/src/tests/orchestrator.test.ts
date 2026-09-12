import { describe, it, expect, vi } from 'vitest';
import { AppendixAKitSchema } from '@repo/shared';
import { generatePrepKit, PipelineError } from '../pipeline/orchestrator.js';
import { LlmClient } from '../llm/client.js';

describe('Phase 5: Master Pipeline Orchestrator (generatePrepKit)', () => {
  it('validates input arguments and rejects invalid days or empty text', async () => {
    await expect(
      generatePrepKit({ jd: 'valid jd', companyUrl: 'https://acme.com', days: 0 })
    ).rejects.toThrow(PipelineError);

    await expect(
      generatePrepKit({ jd: 'valid jd', companyUrl: 'https://acme.com', days: 61 })
    ).rejects.toThrow(PipelineError);

    await expect(
      generatePrepKit({ jd: '', companyUrl: 'https://acme.com', days: 5 })
    ).rejects.toThrow(PipelineError);

    await expect(
      generatePrepKit({ jd: 'valid jd', companyUrl: '', days: 5 })
    ).rejects.toThrow(PipelineError);
  });

  it('executes full pipeline sequence and outputs 100% Appendix A compliant kit', async () => {
    // Mock sequential LLM responses for the pipeline steps:
    // 1. extractRequirements (Role)
    // 2. generateBrief (CompanyBrief)
    // 3. generateQuestions (Call A technical, Call B behavioural, Call C system-design)
    // 4. generateFlashcards (Flashcards)
    const roleResponse = JSON.stringify({
      title: 'Senior Backend Engineer',
      seniority: 'Senior',
      responsibilities: ['Build distributed services in Go and TypeScript'],
      requirements: [
        { id: 'r1', text: 'Go and microservices architecture', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'PostgreSQL database indexing', kind: 'technical', priority: 'must' },
        { id: 'r3', text: 'Leading cross-functional projects', kind: 'behavioural', priority: 'must' },
        { id: 'r4', text: 'Kubernetes cluster deployment', kind: 'technical', priority: 'nice' },
      ],
    });

    const briefResponse = JSON.stringify({
      summary: 'Acme builds global payment infrastructure.',
      what_they_do: 'Payment processing APIs, fraud detection, and multi-currency billing.',
      sources: ['https://acme.com'],
    });

    const questionsResponse = JSON.stringify([
      {
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain goroutine synchronization and channels in Go.',
        answer_outline: 'Discuss buffered vs unbuffered channels, select, mutexes.',
        difficulty: 2,
      },
      {
        requirement_ids: ['r2'],
        category: 'technical',
        prompt: 'How do you optimize slow query execution plans in PostgreSQL?',
        answer_outline: 'Explain EXPLAIN ANALYZE, B-Trees, VACUUM.',
        difficulty: 3,
      },
      {
        requirement_ids: ['r3'],
        category: 'behavioural',
        prompt: 'Tell me about a time you resolved a major cross-team technical disagreement.',
        answer_outline: 'STAR framework: situation, conflict, resolution, outcome.',
        difficulty: 2,
      },
    ]);

    const flashcardsResponse = JSON.stringify([
      {
        front: 'What is the purpose of channels in Go?',
        back: 'Channels facilitate communication and synchronization between concurrent goroutines without explicit locking.',
        requirement_ids: ['r1'],
      },
      {
        front: 'What causes index fragmentation in Postgres?',
        back: 'Frequent UPDATE and DELETE operations leave dead tuples in index pages until VACUUM runs.',
        requirement_ids: ['r2'],
      },
    ]);

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      // Return 404 for web crawler fetches to simulate clean offline crawling
      if (url.startsWith('https://acme.com')) {
        return new Response('Offline crawler response', { status: 404 });
      }

      callCount++;
      let responsePayload = roleResponse;

      if (callCount === 1) {
        responsePayload = roleResponse;
      } else if (callCount === 2) {
        responsePayload = briefResponse;
      } else if (callCount >= 3 && callCount <= 5) {
        responsePayload = questionsResponse;
      } else if (callCount >= 6) {
        responsePayload = flashcardsResponse;
      }

      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: responsePayload }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const mockClient = new LlmClient({
      apiKey: 'test-key',
      baseDelayMs: 5,
      maxDelayMs: 10,
      fetchFn: mockFetch,
    });

    const progressLog: string[] = [];
    const sampleJd = `
      Senior Backend Engineer at Acme.
      Location: San Francisco, CA / Remote
      Requirements:
      - Go and microservices architecture (Required)
      - PostgreSQL database indexing (Required)
      - Leading cross-functional projects (Required)
      - Kubernetes cluster deployment (Bonus)
    `;

    const kit = await generatePrepKit({
      jd: sampleJd,
      companyUrl: 'https://acme.com',
      days: 5,
      allowLocal: true,
      onProgress: (status) => progressLog.push(status),
      client: mockClient,
    });

    // 1. Verify 100% Appendix A Schema Validation
    expect(AppendixAKitSchema.safeParse(kit).success).toBe(true);

    // 2. Verify source metadata
    expect(kit.source.company_url).toBe('https://acme.com');
    expect(kit.source.jd_chars).toBe(sampleJd.length);
    expect(kit.source.role).toBe('Senior Backend Engineer');
    expect(Date.parse(kit.source.researched_at)).not.toBeNaN();

    // 3. Verify schedule conforms strictly to requested days
    expect(kit.schedule.days_available).toBe(5);
    expect(kit.schedule.days.length).toBe(5);
    for (const day of kit.schedule.days) {
      expect(Number.isInteger(day.day)).toBe(true);
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.minutes).toBeGreaterThan(0);
      expect(Array.isArray(day.question_ids)).toBe(true);
    }

    // 4. Verify questions and flashcards
    expect(kit.questions.length).toBeGreaterThanOrEqual(3);
    expect(kit.flashcards.length).toBeGreaterThanOrEqual(2);

    // 5. Verify coverage tracking
    expect(kit.coverage.passes).toBeGreaterThanOrEqual(1);

    // 6. Verify progress notifications fired throughout sequence
    expect(progressLog.length).toBeGreaterThanOrEqual(6);
    expect(progressLog[0]).toContain('Crawling');
  });
});
