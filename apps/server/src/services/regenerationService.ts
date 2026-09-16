import mongoose from 'mongoose';
import type {
  AppendixAKit,
  Question,
  QuestionCategory,
  KitItemMetaMap,
  RoleRequirement,
} from '@repo/shared';
import { findCoverageGaps } from '../pipeline/deterministic/coverageEngine.js';
import { allocateSchedule } from '../pipeline/deterministic/scheduleEngine.js';
import { generateCategoryQuestionsDrafts } from '../pipeline/steps/04_generateQuestions.js';
import { generateBrief } from '../pipeline/steps/03_generateBrief.js';
import { researchCompany } from '../pipeline/steps/02_researchCompany.js';
import { KitModel, type IKitState } from '../models/Kit.js';
import { LlmClient } from '../llm/client.js';

export type RegenerableSection =
  | 'company_brief'
  | 'schedule'
  | 'technical'
  | 'behavioural'
  | 'system-design'
  | 'company-fit';

export const VALID_REGENERATION_SECTIONS: readonly RegenerableSection[] = [
  'company_brief',
  'schedule',
  'technical',
  'behavioural',
  'system-design',
  'company-fit',
] as const;

export interface RegenerationResult {
  message: string;
  regeneratedSection: RegenerableSection;
  preservedCount: number;
  regeneratedCount: number;
  kit: AppendixAKit;
  itemMeta: KitItemMetaMap;
  deletedItemIds: string[];
}

export class RegenerationService {
  static async regenerate(
    kitId: string,
    userId: string,
    section: string,
    client?: LlmClient
  ): Promise<RegenerationResult> {
    if (!VALID_REGENERATION_SECTIONS.includes(section as RegenerableSection)) {
      throw new Error(
        `Invalid section '${section}'. Must be one of: ${VALID_REGENERATION_SECTIONS.join(', ')}`
      );
    }

    if (!mongoose.Types.ObjectId.isValid(kitId)) {
      throw new Error(`Kit not found or access denied`);
    }

    const targetSection = section as RegenerableSection;
    const kitDoc = await KitModel.findOne({ _id: kitId, userId });

    if (!kitDoc) {
      throw new Error(`Kit not found or access denied`);
    }

    const currentKit: AppendixAKit = JSON.parse(JSON.stringify(kitDoc.kit));
    const rawMeta = kitDoc.itemMeta;
    const currentMeta: KitItemMetaMap =
      rawMeta instanceof Map
        ? Object.fromEntries(rawMeta.entries())
        : rawMeta
          ? JSON.parse(JSON.stringify(rawMeta))
          : {};
    const deletedItemIds = [...(kitDoc.deletedItemIds || [])];

    // =========================================================================
    // 1. REGENERATE COMPANY BRIEF
    // =========================================================================
    if (targetSection === 'company_brief') {
      const research = await researchCompany(
        currentKit.source.company_url,
        { companyNameOverride: currentKit.source.company }
      );
      const newBrief = await generateBrief(
        currentKit.source.company_url,
        research,
        client
      );

      currentKit.company_brief = newBrief;

      kitDoc.kit = currentKit;
      kitDoc.itemMeta = currentMeta as any;
      kitDoc.deletedItemIds = deletedItemIds;
      kitDoc.markModified('kit');
      kitDoc.markModified('itemMeta');
      await kitDoc.save();

      return {
        message: 'Company brief regenerated successfully.',
        regeneratedSection: targetSection,
        preservedCount: 0,
        regeneratedCount: 1,
        kit: currentKit,
        itemMeta: currentMeta,
        deletedItemIds,
      };
    }

    // =========================================================================
    // 2. REGENERATE SCHEDULE
    // =========================================================================
    if (targetSection === 'schedule') {
      const newSchedule = allocateSchedule(
        currentKit.schedule.days_available,
        currentKit.role.requirements,
        currentKit.questions
      );

      currentKit.schedule = newSchedule;

      kitDoc.kit = currentKit;
      kitDoc.itemMeta = currentMeta as any;
      kitDoc.deletedItemIds = deletedItemIds;
      kitDoc.markModified('kit');
      kitDoc.markModified('itemMeta');
      await kitDoc.save();

      return {
        message: 'Schedule reallocated successfully.',
        regeneratedSection: targetSection,
        preservedCount: 0,
        regeneratedCount: newSchedule.days.length,
        kit: currentKit,
        itemMeta: currentMeta,
        deletedItemIds,
      };
    }

    // =========================================================================
    // 3. REGENERATE QUESTION CATEGORY (WITH STRICT STATE PRESERVATION)
    // =========================================================================
    const category = targetSection as QuestionCategory;
    const existingQuestions = currentKit.questions;

    const otherCategoryQuestions = existingQuestions.filter((q: Question) => q.category !== category);
    const targetCategoryQuestions = existingQuestions.filter((q: Question) => q.category === category);

    // Identify preserved questions (user edited, user added, or pinned)
    const preservedQuestions: Question[] = [];
    const discardedQuestions: Question[] = [];

    for (const q of targetCategoryQuestions) {
      const meta = currentMeta[q.id];
      const isUserEdited = meta?.origin === 'user_edited';
      const isUserAdded = meta?.origin === 'user_added';
      const isPinned = meta?.isPinned === true;

      if (isUserEdited || isUserAdded || isPinned) {
        preservedQuestions.push(q);
      } else {
        discardedQuestions.push(q);
      }
    }

    // Remove metadata for discarded questions
    for (const q of discardedQuestions) {
      delete currentMeta[q.id];
    }

    // Re-generate question drafts for target category
    const freshDrafts = await generateCategoryQuestionsDrafts(
      category,
      currentKit.role,
      currentKit.company_brief,
      null,
      client
    );

    // Generate non-colliding IDs for fresh questions
    const allRetainedQuestions = [...otherCategoryQuestions, ...preservedQuestions];
    const existingNumbers = allRetainedQuestions
      .map((q) => {
        const num = parseInt(q.id.replace(/\D/g, ''), 10);
        return isNaN(num) ? 0 : num;
      });

    let nextNumericId = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const validReqIds = new Set(currentKit.role.requirements.map((r: RoleRequirement) => r.id));

    const newlyGeneratedQuestions: Question[] = freshDrafts.map((draft) => {
      let cleanReqIds = draft.requirement_ids.filter((id) => validReqIds.has(id));
      if (cleanReqIds.length === 0 && currentKit.role.requirements.length > 0) {
        cleanReqIds = [currentKit.role.requirements[0].id];
      }

      const qId = `q${nextNumericId++}`;

      // Initialize state for new questions
      currentMeta[qId] = {
        origin: 'generated',
        isPinned: false,
      };

      return {
        id: qId,
        requirement_ids: cleanReqIds,
        category,
        prompt: draft.prompt.trim(),
        answer_outline: draft.answer_outline.trim(),
        difficulty: draft.difficulty,
      };
    });

    // Merge preserved questions and newly generated questions
    const finalCategoryQuestions = [...preservedQuestions, ...newlyGeneratedQuestions];
    const finalAllQuestions = [...otherCategoryQuestions, ...finalCategoryQuestions];

    currentKit.questions = finalAllQuestions;

    // Deterministically re-run coverage gap check
    const gaps = findCoverageGaps(currentKit.role.requirements, finalAllQuestions);
    currentKit.coverage = {
      uncovered_requirement_ids: gaps.uncoveredIds,
      passes: currentKit.coverage.passes,
    };

    // Deterministically re-run schedule allocator so schedule question_ids stay strictly synchronized
    currentKit.schedule = allocateSchedule(
      currentKit.schedule.days_available,
      currentKit.role.requirements,
      finalAllQuestions
    );

    // Persist updated kit state
    kitDoc.kit = currentKit;
    kitDoc.itemMeta = currentMeta as any;
    kitDoc.deletedItemIds = deletedItemIds;
    kitDoc.markModified('kit');
    kitDoc.markModified('itemMeta');
    await kitDoc.save();

    return {
      message: `Regenerated category '${category}'. Preserved ${preservedQuestions.length} custom/pinned question(s), added ${newlyGeneratedQuestions.length} new question(s).`,
      regeneratedSection: targetSection,
      preservedCount: preservedQuestions.length,
      regeneratedCount: newlyGeneratedQuestions.length,
      kit: currentKit,
      itemMeta: currentMeta,
      deletedItemIds,
    };
  }
}
