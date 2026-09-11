import { z } from 'zod';
import {
  SourceSchema,
  CompanyBriefSchema,
  RoleRequirementKindSchema,
  RoleRequirementPrioritySchema,
  RoleRequirementSchema,
  RoleSchema,
  QuestionCategorySchema,
  QuestionDifficultySchema,
  QuestionSchema,
  FlashcardSchema,
  ScheduleDaySchema,
  ScheduleSchema,
  CoverageSchema,
  AppendixAKitSchema,
} from '../schemas/kit.schema.js';
import {
  BatchInputCaseSchema,
  BatchInputSchema,
  BatchCaseErrorSchema,
  BatchCaseResultSchema,
  BatchOutputSchema,
} from '../schemas/batch.schema.js';

// Appendix A Inferred Types
export type Source = z.infer<typeof SourceSchema>;
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;
export type RoleRequirementKind = z.infer<typeof RoleRequirementKindSchema>;
export type RoleRequirementPriority = z.infer<typeof RoleRequirementPrioritySchema>;
export type RoleRequirement = z.infer<typeof RoleRequirementSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type QuestionCategory = z.infer<typeof QuestionCategorySchema>;
export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type AppendixAKit = z.infer<typeof AppendixAKitSchema>;

// Appendix B Inferred Types
export type BatchInputCase = z.infer<typeof BatchInputCaseSchema>;
export type BatchInput = z.infer<typeof BatchInputSchema>;
export type BatchCaseError = z.infer<typeof BatchCaseErrorSchema>;
export type BatchCaseResult = z.infer<typeof BatchCaseResultSchema>;
export type BatchOutputFile = z.infer<typeof BatchOutputSchema>;
