import { parseArgs, runBatchEvaluation } from '../apps/server/src/pipeline/batchEvaluator.js';

// Direct CLI invocation
const cliArgs = parseArgs(process.argv.slice(2));

const inputPath = cliArgs.inputPath ?? 'cases.example.json';
const outputPath = cliArgs.outputPath ?? 'kits.json';
const concurrency = cliArgs.concurrency ?? 1;

runBatchEvaluation({
  inputPath,
  outputPath,
  concurrency,
}).catch((err) => {
  console.error('\nFatal Batch Runner Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
