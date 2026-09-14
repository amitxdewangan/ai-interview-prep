import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PracticeStats } from '../components/practice/PracticeStats';
import { QueueFilterTabs } from '../components/practice/QueueFilterTabs';
import type { PracticeStats as StatsType, PracticeFilter } from '../lib/spacedRepetition';

const mockStats: StatsType = {
  totalCards: 10,
  coveredCount: 7,
  coveredPercentage: 70,
  averageConfidence: 3.3,
  masteryPercentage: 40,
  ratingCounts: {
    1: 1,
    2: 1,
    3: 1,
    4: 4,
  },
  unseenCount: 3,
};

describe('Phase 10: PracticeStats & QueueFilterTabs Components', () => {
  it('displays accurate coverage percentage, average score, and rating counts', () => {
    render(<PracticeStats stats={mockStats} onReset={vi.fn()} />);

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText(/7 \/ 10 cards/i)).toBeInTheDocument();
    expect(screen.getByText('3.3')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // unseen
    expect(screen.getByText(/Mastered: 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Confident: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Shaky: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't Know: 1/i)).toBeInTheDocument();
  });

  it('calls onReset when clicking Reset Stats button', () => {
    const onReset = vi.fn();
    render(<PracticeStats stats={mockStats} onReset={onReset} />);

    const resetBtn = screen.getByRole('button', { name: /reset stats/i });
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('renders filter tabs and switches active filter on click', () => {
    const onSelectFilter = vi.fn();
    const counts = { all: 10, needs_review: 2, unseen: 3, mastered: 4 };

    render(
      <QueueFilterTabs
        activeFilter="all"
        onSelectFilter={onSelectFilter}
        counts={counts}
      />
    );

    expect(screen.getByText('Review Queue')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
    expect(screen.getByText('Unseen')).toBeInTheDocument();
    expect(screen.getByText('Mastered')).toBeInTheDocument();

    const needsReviewTab = screen.getByRole('button', { name: /needs review/i });
    fireEvent.click(needsReviewTab);
    expect(onSelectFilter).toHaveBeenCalledWith('needs_review');
  });
});
