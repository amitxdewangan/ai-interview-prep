import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlashcardDeck } from '../components/practice/FlashcardDeck';
import type { Flashcard } from '@repo/shared';

const mockCard: Flashcard = {
  id: 'f1',
  front: 'Explain how Node.js event loop prioritizes process.nextTick vs setImmediate',
  back: 'process.nextTick executes before microtask and macrotask queues in the next tick.',
  requirement_ids: ['r1', 'r2'],
};

describe('Phase 10: FlashcardDeck Component', () => {
  it('renders card prompt, position, stable id, and requirement badges', () => {
    render(
      <FlashcardDeck
        card={mockCard}
        currentIndex={0}
        totalCards={4}
        isFlipped={false}
        onFlip={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        hasPrevious={false}
        hasNext={true}
        onSelectRating={vi.fn()}
        requirementMap={{ r1: 'Node.js Internals', r2: 'Concurrency' }}
      />
    );

    expect(screen.getByText('Card 1 of 4')).toBeInTheDocument();
    expect(screen.getAllByText('f1')[0]).toBeInTheDocument();
    expect(screen.getByText('r1')).toBeInTheDocument();
    expect(screen.getByText('r2')).toBeInTheDocument();
    expect(screen.getByText(/Explain how Node.js event loop prioritizes/i)).toBeInTheDocument();
  });

  it('triggers onFlip when clicking the card face or Flip button', () => {
    const onFlip = vi.fn();

    render(
      <FlashcardDeck
        card={mockCard}
        currentIndex={0}
        totalCards={4}
        isFlipped={false}
        onFlip={onFlip}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        hasPrevious={false}
        hasNext={true}
        onSelectRating={vi.fn()}
      />
    );

    const flipBtn = screen.getByRole('button', { name: /flip to answer/i });
    fireEvent.click(flipBtn);
    expect(onFlip).toHaveBeenCalledTimes(1);

    const cardContainer = screen.getByRole('button', { name: /question face/i });
    fireEvent.click(cardContainer);
    expect(onFlip).toHaveBeenCalledTimes(2);
  });

  it('renders answer and 4 confidence rating buttons when flipped', () => {
    const onSelectRating = vi.fn();

    render(
      <FlashcardDeck
        card={mockCard}
        currentIndex={1}
        totalCards={4}
        isFlipped={true}
        onFlip={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        hasPrevious={true}
        hasNext={true}
        onSelectRating={onSelectRating}
      />
    );

    expect(screen.getByText(/process\.nextTick executes before/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rate as don't know/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rate as shaky/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rate as confident/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rate as mastered/i })).toBeInTheDocument();

    // Clicking rating 4 (Mastered)
    const masteredBtn = screen.getByRole('button', { name: /rate as mastered/i });
    fireEvent.click(masteredBtn);
    expect(onSelectRating).toHaveBeenCalledWith(4);
  });

  it('navigates next and previous via stepper buttons', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    render(
      <FlashcardDeck
        card={mockCard}
        currentIndex={1}
        totalCards={4}
        isFlipped={false}
        onFlip={vi.fn()}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={true}
        hasNext={true}
        onSelectRating={vi.fn()}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /previous/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    fireEvent.click(prevBtn);
    expect(onPrevious).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
