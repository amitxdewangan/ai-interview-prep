import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QuestionBank } from '../components/builder/QuestionBank';
import type { Question, RoleRequirement } from '@repo/shared';

const mockQuestions: Question[] = [
  {
    id: 'q1',
    requirement_ids: ['r1'],
    category: 'technical',
    prompt: 'Explain event loop phases in Node.js.',
    answer_outline: 'Timers, pending callbacks, poll, check, close callbacks.',
    difficulty: 2,
  },
  {
    id: 'q2',
    requirement_ids: ['r2'],
    category: 'behavioural',
    prompt: 'Tell me about a time you resolved a major production incident.',
    answer_outline: 'STAR response highlighting calm triage and blameless post-mortem.',
    difficulty: 1,
  },
  {
    id: 'q3',
    requirement_ids: ['r1'],
    category: 'system-design',
    prompt: 'Design a distributed rate limiter for API gateway.',
    answer_outline: 'Token bucket, Redis cluster, sliding window counter.',
    difficulty: 3,
  },
];

const mockRequirements: RoleRequirement[] = [
  { id: 'r1', text: 'Deep Node.js runtime knowledge', kind: 'technical', priority: 'must' },
  { id: 'r2', text: 'Production incident management', kind: 'behavioural', priority: 'must' },
];

describe('Phase 9: QuestionBank Component', () => {
  it('renders all questions initially and shows category counts', () => {
    render(
      <QuestionBank
        questions={mockQuestions}
        requirements={mockRequirements}
        onUpdateQuestion={vi.fn()}
        onTogglePin={vi.fn()}
        onMoveCategory={vi.fn()}
        onReorder={vi.fn()}
        onDeleteQuestion={vi.fn()}
        onAddQuestion={vi.fn()}
        onRegenerateCategory={vi.fn()}
      />
    );

    expect(screen.getByText('All (3)')).toBeInTheDocument();
    expect(screen.getByText('Technical (1)')).toBeInTheDocument();
    expect(screen.getByText('Behavioural (1)')).toBeInTheDocument();
    expect(screen.getByText('System Design (1)')).toBeInTheDocument();

    expect(screen.getByText('Explain event loop phases in Node.js.')).toBeInTheDocument();
    expect(screen.getByText('Tell me about a time you resolved a major production incident.')).toBeInTheDocument();
    expect(screen.getByText('Design a distributed rate limiter for API gateway.')).toBeInTheDocument();
  });

  it('filters questions when clicking category tabs', () => {
    render(
      <QuestionBank
        questions={mockQuestions}
        requirements={mockRequirements}
        onUpdateQuestion={vi.fn()}
        onTogglePin={vi.fn()}
        onMoveCategory={vi.fn()}
        onReorder={vi.fn()}
        onDeleteQuestion={vi.fn()}
        onAddQuestion={vi.fn()}
        onRegenerateCategory={vi.fn()}
      />
    );

    // Switch to Behavioural tab
    const behaviouralTab = screen.getByRole('button', { name: /behavioural \(1\)/i });
    fireEvent.click(behaviouralTab);

    // Only behavioural question should be visible
    expect(screen.getByText('Tell me about a time you resolved a major production incident.')).toBeInTheDocument();
    expect(screen.queryByText('Explain event loop phases in Node.js.')).not.toBeInTheDocument();
    expect(screen.queryByText('Design a distributed rate limiter for API gateway.')).not.toBeInTheDocument();
  });

  it('searches questions by keyword', () => {
    render(
      <QuestionBank
        questions={mockQuestions}
        requirements={mockRequirements}
        onUpdateQuestion={vi.fn()}
        onTogglePin={vi.fn()}
        onMoveCategory={vi.fn()}
        onReorder={vi.fn()}
        onDeleteQuestion={vi.fn()}
        onAddQuestion={vi.fn()}
        onRegenerateCategory={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search questions/i);
    fireEvent.change(searchInput, { target: { value: 'rate limiter' } });

    expect(screen.getByText('Design a distributed rate limiter for API gateway.')).toBeInTheDocument();
    expect(screen.queryByText('Explain event loop phases in Node.js.')).not.toBeInTheDocument();
  });

  it('triggers scoped category regeneration when category button is clicked', () => {
    const onRegenerateCategory = vi.fn();
    render(
      <QuestionBank
        questions={mockQuestions}
        requirements={mockRequirements}
        onUpdateQuestion={vi.fn()}
        onTogglePin={vi.fn()}
        onMoveCategory={vi.fn()}
        onReorder={vi.fn()}
        onDeleteQuestion={vi.fn()}
        onAddQuestion={vi.fn()}
        onRegenerateCategory={onRegenerateCategory}
      />
    );

    // Switch to Technical tab
    const techTab = screen.getByRole('button', { name: /technical \(1\)/i });
    fireEvent.click(techTab);

    // Click regenerate category
    const regenBtn = screen.getByRole('button', { name: /regenerate category/i });
    fireEvent.click(regenBtn);

    expect(onRegenerateCategory).toHaveBeenCalledWith('technical');
  });

  it('opens Add Question modal and submits new question', () => {
    const onAddQuestion = vi.fn();
    render(
      <QuestionBank
        questions={mockQuestions}
        requirements={mockRequirements}
        onUpdateQuestion={vi.fn()}
        onTogglePin={vi.fn()}
        onMoveCategory={vi.fn()}
        onReorder={vi.fn()}
        onDeleteQuestion={vi.fn()}
        onAddQuestion={onAddQuestion}
        onRegenerateCategory={vi.fn()}
      />
    );

    // Click Add Question
    const addBtn = screen.getByRole('button', { name: /add question/i });
    fireEvent.click(addBtn);

    // Modal should be visible
    expect(screen.getByText('Add Custom Question')).toBeInTheDocument();

    const promptInput = screen.getByPlaceholderText(/design a reliable retry mechanism/i);
    const outlineInput = screen.getByPlaceholderText(/mention jitter to avoid thundering herd/i);

    fireEvent.change(promptInput, { target: { value: 'How does garbage collection work in V8?' } });
    fireEvent.change(outlineInput, { target: { value: 'Generational hypothesis, Scavenger, Mark-Sweep-Compact.' } });

    const dialog = screen.getByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: /add question/i });
    fireEvent.click(submitBtn);

    expect(onAddQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'How does garbage collection work in V8?',
        answer_outline: 'Generational hypothesis, Scavenger, Mark-Sweep-Compact.',
      })
    );
  });
});
