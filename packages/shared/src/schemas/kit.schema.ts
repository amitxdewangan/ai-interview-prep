import { z } from 'zod';

export const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: z.string(), // ISO 8601 string
  pages_used: z.array(z.string()),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export const RoleRequirementKindSchema = z.enum(['technical', 'behavioural', 'domain']);

export const RoleRequirementPrioritySchema = z.enum(['must', 'nice']);

export const RoleRequirementSchema = z.object({
  id: z.string(), // Stable ID: "r1", "r2", etc.
  text: z.string(),
  kind: RoleRequirementKindSchema,
  priority: RoleRequirementPrioritySchema,
});

export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RoleRequirementSchema),
});

export const QuestionCategorySchema = z.enum(['technical', 'behavioural', 'system-design', 'company-fit']);

export const QuestionDifficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const QuestionSchema = z.object({
  id: z.string(), // Stable ID: "q1", "q2", etc.
  requirement_ids: z.array(z.string()),
  category: QuestionCategorySchema,
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: QuestionDifficultySchema,
});

export const FlashcardSchema = z.object({
  id: z.string(), // Stable ID: "f1", "f2", etc.
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(), // 1-indexed
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().nonnegative(), // Integer minutes
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().positive(),
  days: z.array(ScheduleDaySchema),
});

export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().nonnegative(),
});

export const AppendixAKitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
});

export const ItemOriginSchema = z.enum(['generated', 'user_edited', 'user_added']);

export const ItemMetaSchema = z.object({
  origin: ItemOriginSchema.default('generated'),
  isPinned: z.boolean().default(false),
});

export const KitItemMetaMapSchema = z.record(z.string(), ItemMetaSchema);

