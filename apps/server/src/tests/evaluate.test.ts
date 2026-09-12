import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { BatchOutputSchema } from '@repo/shared';
import { parseArgs, runBatchEvaluation } from '../pipeline/batchEvaluator.js';
import { LlmClient } from '../llm/client.js';

describe('Phase 6: Batch Evaluation CLI & Failure Isolation', () => {
  describe('parseArgs', () => {
    it('parses separated flags correctly', () => {
      const args = ['--input', 'custom-cases.json', '--output', 'out.json', '--concurrency', '2'];
      const parsed = parseArgs(args);
      expect(parsed.inputPath).toBe('custom-cases.json');
      expect(parsed.outputPath).toBe('out.json');
      expect(parsed.concurrency).toBe(2);
    });

    it('parses equal-sign flags correctly', () => {
      const args = ['--input=custom-cases.json', '--output=out.json', '--concurrency=3'];
      const parsed = parseArgs(args);
      expect(parsed.inputPath).toBe('custom-cases.json');
      expect(parsed.outputPath).toBe('out.json');
      expect(parsed.concurrency).toBe(3);
    });
  });

  describe('runBatchEvaluation execution and failure isolation', () => {
    let tmpDir: string;
    let inputPath: string;
    let outputPath: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batch-test-'));
      inputPath = path.join(tmpDir, 'cases.json');
      outputPath = path.join(tmpDir, 'kits.json');
    });

    afterEach(async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // cleanup
      }
    });

    it('isolates failures: invalid cases return status "failed" without aborting successful cases', async () => {
      // 2 test cases: case-valid succeeds, case-invalid has days = 99 (violates 1-60 constraint)
      const testCases = [
        {
          id: 'case-valid',
          jd: 'Senior TypeScript Engineer with React and Node.js experience.',
          company_url: 'https://example.com',
          days: 5,
        },
        {
          id: 'case-invalid',
          jd: 'Python Developer',
          company_url: 'https://example.com',
          days: 99, // Out of bounds, will throw PipelineError!
        },
      ];

      await fs.writeFile(inputPath, JSON.stringify(testCases, null, 2), 'utf-8');

      // Mock LLM client responses
      const mockRole = JSON.stringify({
        title: 'Senior TypeScript Engineer',
        seniority: 'Senior',
        responsibilities: ['Build apps'],
        requirements: [{ id: 'r1', text: 'TypeScript', kind: 'technical', priority: 'must' }],
      });

      const mockBrief = JSON.stringify({
        summary: 'Example Inc.',
        what_they_do: 'Technology solutions.',
        sources: ['https://example.com'],
      });

      const mockQuestions = JSON.stringify([
        {
          requirement_ids: ['r1'],
          category: 'technical',
          prompt: 'Explain TypeScript generics.',
          answer_outline: 'Explain type parameters and constraints.',
          difficulty: 2,
        },
      ]);

      const mockFlashcards = JSON.stringify([
        {
          front: 'What are mapped types in TypeScript?',
          back: 'Create new types by iterating over keys of existing types.',
          requirement_ids: ['r1'],
        },
      ]);

      let callIdx = 0;
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.startsWith('https://example.com')) {
          return new Response('', { status: 404 });
        }

        callIdx++;
        let payload = mockRole;
        if (callIdx === 1) payload = mockRole;
        else if (callIdx === 2) payload = mockBrief;
        else if (callIdx >= 3 && callIdx <= 5) payload = mockQuestions;
        else payload = mockFlashcards;

        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: payload }] } }],
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

      const logs: string[] = [];
      const batchResult = await runBatchEvaluation({
        inputPath,
        outputPath,
        concurrency: 1,
        client: mockClient,
        logger: (msg) => logs.push(msg),
      });

      // 1. Output must validate 100% against Appendix B schema
      expect(BatchOutputSchema.safeParse(batchResult).success).toBe(true);
      expect(batchResult.version).toBe('1.0');
      expect(batchResult.kits.length).toBe(2);

      // 2. First case must be "ok" with populated kit
      expect(batchResult.kits[0].id).toBe('case-valid');
      expect(batchResult.kits[0].status).toBe('ok');
      expect(batchResult.kits[0].kit).not.toBeNull();
      expect(batchResult.kits[0].error).toBeNull();

      // 3. Second case must be "failed" with error code and message
      expect(batchResult.kits[1].id).toBe('case-invalid');
      expect(batchResult.kits[1].status).toBe('failed');
      expect(batchResult.kits[1].kit).toBeNull();
      expect(batchResult.kits[1].error).not.toBeNull();
      expect(batchResult.kits[1].error?.message).toContain('99 days');

      // 4. Output file exists and matches
      const savedOutput = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
      expect(savedOutput.version).toBe('1.0');
      expect(savedOutput.kits.length).toBe(2);
    });
  });
});
