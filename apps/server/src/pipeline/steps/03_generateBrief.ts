import { CompanyBriefSchema, type CompanyBrief } from '@repo/shared';
import { LlmClient } from '../../llm/client.js';
import type { CompanyResearch } from './02_researchCompany.js';

const BRIEF_SYSTEM_INSTRUCTION = `You are a corporate intelligence analyst specializing in engineering team research.
Your job is to generate an honest, concise company brief based solely on scraped website text and public discussion signals.

CRITICAL RULES:
1. "summary": A 2-3 sentence overview of the company, its primary business model, and mission.
2. "what_they_do": A factual summary of the core products, tech stack, or customer base mentioned in the source text.
3. ANTI-FABRICATION RULE: If the scraped information is thin, summarize only what is verified. Never invent client names, revenue numbers, or tech stacks not present in the research.
4. "sources": Must contain an array of the source URLs provided in the context.

Output format:
Return ONLY a valid JSON object matching the CompanyBrief schema:
{
  "summary": "2-3 sentence summary",
  "what_they_do": "Core products, engineering stack, or customer base",
  "sources": ["url1", "url2"]
}`;

/**
 * Step 2: Generates a concise, honest Company Brief.
 * If the website could not be retrieved, returns an honest disclosure without hallucinating.
 */
export async function generateBrief(
  companyUrl: string,
  research: CompanyResearch,
  client?: LlmClient
): Promise<CompanyBrief> {
  const llm = client ?? new LlmClient();

  // If no pages were crawled or site was unreachable, report honestly
  const isUnreachable =
    research.pagesUsed.length === 0 ||
    research.companySummaryText.includes('Could not retrieve') ||
    research.companySummaryText.includes('returned HTTP 404');

  if (isUnreachable) {
    return {
      summary: `No public information could be retrieved for this company at ${companyUrl}.`,
      what_they_do: `No details available because the target website could not be reached or provided no content.`,
      sources: research.pagesUsed,
    };
  }

  const contextSegments: string[] = [
    `Company Name: ${research.companyName}`,
    `Target URL: ${companyUrl}`,
    `Sources Used: ${JSON.stringify(research.pagesUsed)}`,
    `Website Content:\n${research.companySummaryText.slice(0, 10000)}`,
  ];

  if (research.hiringProcessText) {
    contextSegments.push(`Hiring & Careers Text:\n${research.hiringProcessText.slice(0, 6000)}`);
  }

  if (research.discussionsText) {
    contextSegments.push(`Public Discussion Signals:\n${research.discussionsText.slice(0, 3000)}`);
  }

  const prompt = `Synthesize a concise, factual Company Brief based on the following verified research:\n\n${contextSegments.join('\n\n')}`;

  const parsed = await llm.generateStructured<CompanyBrief>(
    prompt,
    CompanyBriefSchema,
    {
      systemInstruction: BRIEF_SYSTEM_INSTRUCTION,
      temperature: 0.2,
    }
  );

  // Guarantee sources strictly reflect the pages used
  const brief: CompanyBrief = {
    summary: parsed.summary.trim(),
    what_they_do: parsed.what_they_do.trim(),
    sources: research.pagesUsed.length > 0 ? research.pagesUsed : parsed.sources,
  };

  return CompanyBriefSchema.parse(brief);
}
