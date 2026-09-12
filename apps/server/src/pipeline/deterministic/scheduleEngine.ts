import type { RoleRequirement, Question, Schedule, ScheduleDay } from '@repo/shared';

/**
 * Deterministically sorts questions so that:
 * 1. Questions covering `must-have` requirements come first.
 * 2. Higher difficulty (3 > 2 > 1) comes earlier.
 * 3. Architecture/System design and technical questions come before behavioural/company-fit.
 * 4. Deterministic tie-breaking on question ID.
 */
function sortQuestionsForSchedule(
  questions: Question[],
  mustReqIds: Set<string>
): Question[] {
  const categoryWeight: Record<string, number> = {
    'system-design': 4,
    technical: 3,
    behavioural: 2,
    'company-fit': 1,
  };

  return [...questions].sort((a, b) => {
    // 1. Must-have requirement coverage first
    const aMust = a.requirement_ids.some((id) => mustReqIds.has(id));
    const bMust = b.requirement_ids.some((id) => mustReqIds.has(id));
    if (aMust !== bMust) return aMust ? -1 : 1;

    // 2. Difficulty descending (3 > 2 > 1)
    if (a.difficulty !== b.difficulty) return b.difficulty - a.difficulty;

    // 3. Category weight descending
    const aWeight = categoryWeight[a.category] ?? 0;
    const bWeight = categoryWeight[b.category] ?? 0;
    if (aWeight !== bWeight) return bWeight - aWeight;

    // 4. Stable tie breaker
    return a.id.localeCompare(b.id);
  });
}

/**
 * Derives a clean, readable focus topic for a given day based on questions and timeline position.
 */
function determineFocus(
  dayQuestions: Question[],
  dayNumber: number,
  totalDays: number
): string {
  if (totalDays === 1) {
    return 'High-Intensity Core Prep: Must-Have Requirements & Architecture';
  }

  // Last day for schedules >= 3 days: Mock interview & polish
  if (totalDays >= 3 && dayNumber === totalDays) {
    return 'Final Mock Interview, Behavioural Polish & Interview Strategy';
  }

  // Penultimate day for schedules >= 4 days: Behavioural & scenario drill
  if (totalDays >= 4 && dayNumber === totalDays - 1) {
    return 'Behavioural Mastery: STAR Method, Leadership & Scenario Drills';
  }

  if (dayQuestions.length === 0) {
    // Spaced repetition / consolidation days
    const reviewThemes = [
      'Spaced Repetition & High-Difficulty Problem Recall',
      'System Architecture Deep Dive & Edge Case Analysis',
      'Timed Problem Solving & Articulation Practice',
      'Weakness Elimination & Mock Interview Dry Run',
      'Comprehensive Review & Company Values Alignment',
    ];
    const themeIndex = (dayNumber - 1) % reviewThemes.length;
    return reviewThemes[themeIndex];
  }

  const hasSystemDesign = dayQuestions.some((q) => q.category === 'system-design');
  const hasTechnical = dayQuestions.some((q) => q.category === 'technical');
  const hasBehavioural = dayQuestions.some((q) => q.category === 'behavioural');
  const hasCompanyFit = dayQuestions.some((q) => q.category === 'company-fit');
  const maxDifficulty = Math.max(...dayQuestions.map((q) => q.difficulty));

  if (hasSystemDesign) {
    return 'System Design: Distributed Architecture, Scalability & Trade-offs';
  }
  if (hasTechnical && maxDifficulty === 3) {
    return 'Advanced Technical Deep-Dive: Core Requirements & High-Complexity Concepts';
  }
  if (hasTechnical && maxDifficulty === 2) {
    return 'Technical Implementation: Core Patterns, Problem Solving & APIs';
  }
  if (hasTechnical && maxDifficulty === 1) {
    return 'Technical Fundamentals & Quick-Fire Domain Knowledge';
  }
  if (hasBehavioural) {
    return 'Behavioural & Situational Scenarios: Leadership & Team Collaboration';
  }
  if (hasCompanyFit) {
    return 'Company Culture, Values Alignment & Role Fit';
  }

  return 'Targeted Requirement Study & Practice';
}

/**
 * Calculates strictly integer study minutes for a day.
 */
function calculateMinutes(
  dayQuestions: Question[],
  dayNumber: number,
  totalDays: number
): number {
  if (totalDays === 1) {
    // 1-day crash course: realistic high-intensity integer minutes (180 - 240 mins)
    const raw = 120 + dayQuestions.reduce((acc, q) => {
      if (q.difficulty === 3) return acc + 25;
      if (q.difficulty === 2) return acc + 18;
      return acc + 12;
    }, 0);
    return Math.min(240, Math.max(180, Math.round(raw)));
  }

  // Final day mock / review
  if (totalDays >= 3 && dayNumber === totalDays) {
    return 60;
  }

  // Review / spaced repetition day with no new questions
  if (dayQuestions.length === 0) {
    return 45;
  }

  // Regular study day: 30 mins base + time per question by difficulty
  const raw = 30 + dayQuestions.reduce((acc, q) => {
    if (q.difficulty === 3) return acc + 25;
    if (q.difficulty === 2) return acc + 20;
    return acc + 15;
  }, 0);

  return Math.min(150, Math.max(45, Math.round(raw)));
}

/**
 * Allocates an arithmetic study schedule across exactly `daysAvailable` days.
 *
 * Enforces:
 * 1. Schedule contains EXACTLY `daysAvailable` days (from 1 up to 60).
 * 2. Every day index is 1-indexed (1, 2, ..., daysAvailable).
 * 3. Every day's minutes is strictly an integer (`Number.isInteger(min)`).
 * 4. Harder (difficulty 3) and must-have material lands earlier in the timeline.
 * 5. Every single must-have requirement covered by questions appears in the schedule.
 * 6. The last 1-2 days (for >= 3 days) prioritize review, mock practice, and company-fit.
 * 7. Every question_id assigned exists in the provided questions list (zero dangling IDs).
 */
export function allocateSchedule(
  daysAvailable: number,
  requirements: RoleRequirement[],
  questions: Question[]
): Schedule {
  const totalDays = Math.max(1, Math.floor(daysAvailable));
  const mustReqIds = new Set(
    requirements.filter((r) => r.priority === 'must').map((r) => r.id)
  );

  const sortedQuestions = sortQuestionsForSchedule(questions, mustReqIds);
  const days: ScheduleDay[] = [];

  if (totalDays === 1) {
    // Day 1: Consolidate all questions (prioritizing must-haves & difficulty 3 first)
    const qIds = sortedQuestions.map((q) => q.id);
    const dayMinutes = calculateMinutes(sortedQuestions, 1, 1);
    days.push({
      day: 1,
      focus: determineFocus(sortedQuestions, 1, 1),
      question_ids: qIds,
      minutes: dayMinutes,
    });
  } else if (totalDays === 2) {
    // Day 1: High difficulty / technical / must-haves
    // Day 2: Behavioural / company-fit / review
    const day1Questions: Question[] = [];
    const day2Questions: Question[] = [];

    for (const q of sortedQuestions) {
      if (q.difficulty === 3 || q.category === 'system-design' || q.requirement_ids.some((id) => mustReqIds.has(id))) {
        if (day1Questions.length <= day2Questions.length + 1) {
          day1Questions.push(q);
        } else {
          day2Questions.push(q);
        }
      } else {
        day2Questions.push(q);
      }
    }

    // Ensure day 1 has content if questions exist
    if (day1Questions.length === 0 && day2Questions.length > 0) {
      day1Questions.push(day2Questions.shift()!);
    }

    days.push({
      day: 1,
      focus: determineFocus(day1Questions, 1, 2),
      question_ids: day1Questions.map((q) => q.id),
      minutes: calculateMinutes(day1Questions, 1, 2),
    });

    days.push({
      day: 2,
      focus: determineFocus(day2Questions, 2, 2),
      question_ids: day2Questions.map((q) => q.id),
      minutes: calculateMinutes(day2Questions, 2, 2),
    });
  } else {
    // totalDays >= 3
    // Reserve the final day (and penultimate day for >= 4 days) for review/mock
    const reservedDays = totalDays >= 4 ? 2 : 1;
    const studyDaysCount = Math.max(1, totalDays - reservedDays);

    // Group questions by category type
    const technicalQuestions = sortedQuestions.filter(
      (q) => q.category === 'technical' || q.category === 'system-design'
    );
    const nonTechnicalQuestions = sortedQuestions.filter(
      (q) => q.category === 'behavioural' || q.category === 'company-fit'
    );

    // Allocate technical questions across the primary study days (hardest first)
    const dayQuestionBuckets: Question[][] = Array.from(
      { length: totalDays },
      () => []
    );

    if (technicalQuestions.length > 0) {
      technicalQuestions.forEach((q, index) => {
        const bucketIndex = Math.min(
          studyDaysCount - 1,
          Math.floor((index / technicalQuestions.length) * studyDaysCount)
        );
        dayQuestionBuckets[bucketIndex].push(q);
      });
    }

    // Non-technical (behavioural/company-fit) land towards the later study days / penultimate day
    if (nonTechnicalQuestions.length > 0) {
      const targetDayIndex = totalDays >= 4 ? totalDays - 2 : studyDaysCount - 1;
      nonTechnicalQuestions.forEach((q) => {
        dayQuestionBuckets[targetDayIndex].push(q);
      });
    }

    // If there are more study days than questions, spaced repetition revisits the hardest questions
    const hardQuestionIds = sortedQuestions
      .filter((q) => q.difficulty === 3 || q.requirement_ids.some((id) => mustReqIds.has(id)))
      .map((q) => q.id);

    for (let i = 0; i < totalDays; i++) {
      const dayNum = i + 1;
      let dayQuestions = dayQuestionBuckets[i];

      // For empty intermediate review days, assign a spaced repetition subset of hardest questions
      let questionIds: string[];
      if (dayQuestions.length > 0) {
        questionIds = dayQuestions.map((q) => q.id);
      } else if (dayNum < totalDays && hardQuestionIds.length > 0) {
        // Spaced repetition drill revisiting up to 2 hard questions
        const drillIndex = (i % hardQuestionIds.length);
        questionIds = [hardQuestionIds[drillIndex]];
        dayQuestions = questions.filter((q) => questionIds.includes(q.id));
      } else {
        questionIds = [];
      }

      days.push({
        day: dayNum,
        focus: determineFocus(dayQuestions, dayNum, totalDays),
        question_ids: questionIds,
        minutes: calculateMinutes(dayQuestions, dayNum, totalDays),
      });
    }
  }

  // --- Mandatory Invariant Checks ---

  // 1. Ensure every must-have requirement that has questions appears somewhere in the schedule
  const scheduledQuestionIds = new Set(days.flatMap((d) => d.question_ids));
  for (const reqId of mustReqIds) {
    const matchingQuestions = questions.filter((q) =>
      q.requirement_ids.includes(reqId)
    );
    if (matchingQuestions.length > 0) {
      const isRepresented = matchingQuestions.some((q) =>
        scheduledQuestionIds.has(q.id)
      );
      if (!isRepresented) {
        // Guarantee: inject matching question into Day 1
        const toInject = matchingQuestions[0];
        days[0].question_ids.unshift(toInject.id);
        scheduledQuestionIds.add(toInject.id);
      }
    }
  }

  // 2. Guarantee exact day count
  while (days.length < totalDays) {
    const dayNum = days.length + 1;
    days.push({
      day: dayNum,
      focus: 'Targeted Review & Interview Readiness',
      question_ids: [],
      minutes: 45,
    });
  }

  // 3. Guarantee all minutes are strictly integers
  for (const d of days) {
    d.minutes = Math.round(d.minutes);
  }

  return {
    days_available: totalDays,
    days,
  };
}
