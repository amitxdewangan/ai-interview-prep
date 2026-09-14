import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleView } from '../components/builder/ScheduleView';
import type { AppendixAKit, Question, RoleRequirement } from '@repo/shared';

const mockSchedule: AppendixAKit['schedule'] = {
  days_available: 3,
  days: [
    {
      day: 1,
      focus: 'High-Priority Technical Systems',
      minutes: 75,
      question_ids: ['q1'],
    },
    {
      day: 2,
      focus: 'Distributed Architecture & Scaling',
      minutes: 60,
      question_ids: ['q2'],
    },
    {
      day: 3,
      focus: 'Behavioural Leadership & STAR Review',
      minutes: 45,
      question_ids: ['q3'],
    },
  ],
};

const mockQuestions: Question[] = [
  {
    id: 'q1',
    requirement_ids: ['r1'],
    category: 'technical',
    prompt: 'Node.js event loop internals',
    answer_outline: 'Explain libuv and tick queues.',
    difficulty: 3,
  },
  {
    id: 'q2',
    requirement_ids: ['r2'],
    category: 'system-design',
    prompt: 'Design message bus',
    answer_outline: 'Partitioning and consumer groups.',
    difficulty: 2,
  },
  {
    id: 'q3',
    requirement_ids: ['r3'],
    category: 'behavioural',
    prompt: 'Conflict resolution example',
    answer_outline: 'Situation, task, action, result.',
    difficulty: 1,
  },
];

const mockRequirements: RoleRequirement[] = [
  { id: 'r1', text: 'Node.js Expertise', kind: 'technical', priority: 'must' },
  { id: 'r2', text: 'Distributed Systems', kind: 'technical', priority: 'nice' },
  { id: 'r3', text: 'Team Leadership', kind: 'behavioural', priority: 'nice' },
];

describe('Phase 9: ScheduleView Component', () => {
  it('renders days available, total minutes, and day headers', () => {
    render(
      <ScheduleView
        schedule={mockSchedule}
        questions={mockQuestions}
        requirements={mockRequirements}
        onRegenerateSchedule={vi.fn()}
      />
    );

    expect(screen.getByText('3-Day Preparation Timeline')).toBeInTheDocument();
    expect(screen.getByText(/180 Total Minutes/i)).toBeInTheDocument();
    expect(screen.getByText('High-Priority Technical Systems')).toBeInTheDocument();
    expect(screen.getByText('Distributed Architecture & Scaling')).toBeInTheDocument();
    expect(screen.getByText('Behavioural Leadership & STAR Review')).toBeInTheDocument();
  });

  it('highlights must-have focus badge on days covering must-have requirements', () => {
    render(
      <ScheduleView
        schedule={mockSchedule}
        questions={mockQuestions}
        requirements={mockRequirements}
        onRegenerateSchedule={vi.fn()}
      />
    );

    // Day 1 has q1 which tests r1 (must-have)
    expect(screen.getByText('Must-Have Focus')).toBeInTheDocument();
  });

  it('calls onRegenerateSchedule when regenerate button is clicked', () => {
    const onRegenerateSchedule = vi.fn();
    render(
      <ScheduleView
        schedule={mockSchedule}
        questions={mockQuestions}
        requirements={mockRequirements}
        onRegenerateSchedule={onRegenerateSchedule}
      />
    );

    const regenBtn = screen.getByRole('button', { name: /regenerate schedule/i });
    fireEvent.click(regenBtn);

    expect(onRegenerateSchedule).toHaveBeenCalledTimes(1);
  });
});
