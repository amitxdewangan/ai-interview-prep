import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionCard } from '../components/builder/QuestionCard';
import type { Question } from '@repo/shared';

const mockQuestion: Question = {
  id: 'q1',
  requirement_ids: ['r1', 'r2'],
  category: 'technical',
  prompt: 'Explain the difference between optimistic concurrency and pessimistic locking.',
  answer_outline: 'Optimistic checks version on write; pessimistic locks beforehand.',
  difficulty: 2,
};

describe('Phase 9: QuestionCard Component', () => {
  it('renders prompt, answer outline, difficulty, and requirement tags', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        origin="generated"
        isPinned={false}
        onUpdateQuestion={vi.fn()}
        onTogglePin={vi.fn()}
        onMoveCategory={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(mockQuestion.prompt)).toBeInTheDocument();
    expect(screen.getByText(mockQuestion.answer_outline)).toBeInTheDocument();
    expect(screen.getByText('q1')).toBeInTheDocument();
    expect(screen.getByText('r1')).toBeInTheDocument();
    expect(screen.getByText('r2')).toBeInTheDocument();
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
  });

  it('toggles pin status when pin button is clicked', () => {
    const onTogglePin = vi.fn();
    const { rerender } = render(
      <QuestionCard
        question={mockQuestion}
        isPinned={false}
        onUpdateQuestion={vi.fn()}
        onTogglePin={onTogglePin}
        onMoveCategory={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const pinBtn = screen.getByRole('button', { name: /pin/i });
    fireEvent.click(pinBtn);
    expect(onTogglePin).toHaveBeenCalledWith('q1');

    // Rerender with isPinned true
    rerender(
      <QuestionCard
        question={mockQuestion}
        isPinned={true}
        onUpdateQuestion={vi.fn()}
        onTogglePin={onTogglePin}
        onMoveCategory={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('allows inline editing of prompt and answer outline', () => {
    const onUpdateQuestion = vi.fn();
    render(
      <QuestionCard
        question={mockQuestion}
        onUpdateQuestion={onUpdateQuestion}
        onTogglePin={vi.fn()}
        onMoveCategory={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Click edit button
    const editBtn = screen.getByTitle('Edit question text and outline');
    fireEvent.click(editBtn);

    // Textareas should appear
    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBe(2);

    // Modify prompt
    fireEvent.change(textareas[0], { target: { value: 'Updated custom prompt' } });

    // Save
    const saveBtn = screen.getByTitle('Save changes');
    fireEvent.click(saveBtn);

    expect(onUpdateQuestion).toHaveBeenCalledWith(
      'q1',
      expect.objectContaining({
        prompt: 'Updated custom prompt',
      })
    );
  });

  it('triggers category move on selection', () => {
    const onMoveCategory = vi.fn();
    render(
      <QuestionCard
        question={mockQuestion}
        onUpdateQuestion={vi.fn()}
        onTogglePin={vi.fn()}
        onMoveCategory={onMoveCategory}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const select = screen.getByTitle('Move to another category');
    fireEvent.change(select, { target: { value: 'system-design' } });

    expect(onMoveCategory).toHaveBeenCalledWith('q1', 'system-design');
  });

  it('triggers reorder up and down', () => {
    const onReorder = vi.fn();
    render(
      <QuestionCard
        question={mockQuestion}
        canMoveUp={true}
        canMoveDown={true}
        onUpdateQuestion={vi.fn()}
        onTogglePin={vi.fn()}
        onMoveCategory={vi.fn()}
        onReorder={onReorder}
        onDelete={vi.fn()}
      />
    );

    const upBtn = screen.getByTitle(/move question up/i);
    fireEvent.click(upBtn);
    expect(onReorder).toHaveBeenCalledWith('q1', 'up');

    const downBtn = screen.getByTitle(/move question down/i);
    fireEvent.click(downBtn);
    expect(onReorder).toHaveBeenCalledWith('q1', 'down');
  });
});
