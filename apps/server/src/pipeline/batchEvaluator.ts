import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BatchInputSchema,
  BatchOutputSchema,
  type BatchOutput,
  type BatchInputCase,
  type BatchCaseResult,
} from '@repo/shared';
import { generatePrepKit } from './orchestrator.js';
import type { LlmClient } from '../llm/client.js';

export interface EvaluateOptions {
  inputPath: string;
  outputPath: string;
  concurrency?: number;
  allowLocal?: boolean;
  client?: LlmClient;
  logger?: (msg: string) => void;
}

/**
 * Parses CLI arguments for --input, --output, and --concurrency flags.
 */
export function parseArgs(args: string[]): {
  inputPath?: string;
  outputPath?: string;
  concurrency?: number;
} {
  const result: { inputPath?: string; outputPath?: string; concurrency?: number } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--input' && i + 1 < args.length) {
      result.inputPath = args[++i];
    } else if (arg.startsWith('--input=')) {
      result.inputPath = arg.slice('--input='.length);
    } else if (arg === '--output' && i + 1 < args.length) {
      result.outputPath = args[++i];
    } else if (arg.startsWith('--output=')) {
      result.outputPath = arg.slice('--output='.length);
    } else if (arg === '--concurrency' && i + 1 < args.length) {
      result.concurrency = parseInt(args[++i], 10);
    } else if (arg.startsWith('--concurrency=')) {
      result.concurrency = parseInt(arg.slice('--concurrency='.length), 10);
    }
  }

  return result;
}

/**
 * Executes batch evaluation across a JSON array of test cases conforming to Appendix B.
 * Guarantees per-case failure isolation so individual errors do not abort the entire suite.
 */
export async function runBatchEvaluation(
  options: EvaluateOptions
): Promise<BatchOutput> {
  const {
    inputPath,
    outputPath,
    concurrency = 1,
    allowLocal = true,
    client,
    logger = console.log,
  } = options;

  // Enforce ALLOW_LOCAL_URLS for batch evaluation test suites
  if (allowLocal) {
    process.env.ALLOW_LOCAL_URLS = 'true';
  }

  logger(`\n=== Starting AI Interview Prep Kit Batch Evaluation ===`);
  logger(`Input cases file : ${inputPath}`);
  logger(`Output kits file : ${outputPath}`);
  logger(`Concurrency limit: ${concurrency}`);

  // 1. Read and parse input file
  let rawContent: string;
  try {
    rawContent = await fs.readFile(inputPath, 'utf-8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read input file at "${inputPath}": ${msg}`);
  }

  let parsedCases: unknown;
  try {
    parsedCases = JSON.parse(rawContent);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Input file "${inputPath}" is not valid JSON: ${msg}`);
  }

  const casesValidation = BatchInputSchema.safeParse(parsedCases);
  if (!casesValidation.success) {
    const issues = casesValidation.error.issues
      .map((i) => `[${i.path.join('.') || 'root'}]: ${i.message}`)
      .join(', ');
    throw new Error(`Input file does not conform to Appendix B BatchInput schema: ${issues}`);
  }

  const cases: BatchInputCase[] = casesValidation.data;
  logger(`Loaded ${cases.length} evaluation case(s) successfully.\n`);

  const results: BatchCaseResult[] = [];

  // 2. Process cases with controlled concurrency
  for (let i = 0; i < cases.length; i += concurrency) {
    const chunk = cases.slice(i, i + concurrency);

    await Promise.all(
      chunk.map(async (caseItem, chunkIndex) => {
        const index = i + chunkIndex + 1;
        logger(`[${index}/${cases.length}] Evaluating Case "${caseItem.id}" (Company: ${caseItem.company_url}, Timeline: ${caseItem.days} days)...`);

        const startTime = Date.now();
        try {
          // Run the exact production orchestrator
          const kit = await generatePrepKit({
            jd: caseItem.jd,
            companyUrl: caseItem.company_url,
            days: caseItem.days,
            allowLocal: true,
            onProgress: (status) => {
              logger(`  ↳ [${caseItem.id}] ${status}`);
            },
            client,
          });

          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          logger(`  ✓ [${caseItem.id}] Completed successfully in ${elapsedSec}s.\n`);

          results.push({
            id: caseItem.id,
            status: 'ok',
            kit,
            error: null,
          });
        } catch (err: unknown) {
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          const message = err instanceof Error ? err.message : String(err);
          const code =
            (err as any)?.code ?? (err as any)?.name ?? 'GENERATION_FAILED';

          logger(`  ✗ [${caseItem.id}] FAILED after ${elapsedSec}s: ${message}\n`);

          results.push({
            id: caseItem.id,
            status: 'failed',
            kit: null,
            error: {
              code,
              message,
            },
          });
        }
      })
    );
  }

  // Preserve original ordering from input
  const orderedResults = cases.map((c) => {
    return results.find((r) => r.id === c.id)!;
  });

  // 3. Assemble and validate Appendix B Batch Output
  const batchOutput: BatchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: orderedResults,
  };

  const validatedOutput = BatchOutputSchema.parse(batchOutput);

  // 4. Write output to destination file
  const resolvedOutDir = path.dirname(path.resolve(outputPath));
  await fs.mkdir(resolvedOutDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(validatedOutput, null, 2), 'utf-8');

  const okCount = orderedResults.filter((r) => r.status === 'ok').length;
  const failCount = orderedResults.filter((r) => r.status === 'failed').length;

  logger(`=== Batch Evaluation Completed ===`);
  logger(`Total: ${cases.length} | Succeeded: ${okCount} | Failed: ${failCount}`);
  logger(`Kits output saved to: ${outputPath}\n`);

  return validatedOutput;
}
