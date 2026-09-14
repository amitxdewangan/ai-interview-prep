import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PracticeModePage from '../app/kit/[id]/practice/page';
import { api } from '../lib/api';
import type { AppendixAKit } from '@repo/shared';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'kit-test-123' }),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock API
vi.mock('../lib/api', () => ({
  api: {
    getKitById: vi.fn(),
  },
}));

const mockKit: AppendixAKit = {
  source: {
    company: 'Stripe',
    company_url: 'https://stripe.com',
    role: 'Senior Backend Engineer',
    location: 'Remote',
    jd_chars: 500,
    researched_at: '2026-09-14T00:00:00.000Z',
    pages_used: ['https://stripe.com'],
  },
  company_brief: {
    summary: 'Payments infrastructure for the internet',
    what_they_do: 'Global financial infrastructure',
    sources: ['https://stripe.com'],
  },
  role: {
    title: 'Senior Backend Engineer',
    seniority: 'Senior',
    responsibilities: ['Architect payment pipelines'],
    requirements: [
      { id: 'r1', text: 'Distributed Transactions', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'Idempotency Keys', kind: 'technical', priority: 'must' },
    ],
  },
  questions: [],
  flashcards: [
    {
      id: 'f1',
      front: 'How does Stripe achieve payment idempotency?',
      back: 'Idempotency-Key header stored in Redis with 24-hour TTL and transactional lock.',
      requirement_ids: ['r2'],
    },
    {
      id: 'f2',
      front: 'Explain two-phase commit vs saga pattern',
      back: 'Saga uses compensating transactions for eventual consistency without blocking locks.',
      requirement_ids: ['r1'],
    },
  ],
  schedule: {
    days_available: 5,
    days: [],
  },
  coverage: {
    uncovered_requirement_ids: [],
    passes: 1,
  },
};

const mockRecord = {
  id: 'kit-test-123',
  userId: 'user-1',
  kit: mockKit,
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
};

describe('Phase 10: PracticeModePage Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('fetches and renders kit flashcards with stats and navigation', async () => {
    vi.mocked(api.getKitById).mockResolvedValueOnce(mockRecord);

    render(<PracticeModePage />);

    // Initially shows loading or resolves
    await waitFor(() => {
      expect(screen.getByText('Senior Backend Engineer')).toBeInTheDocument();
      expect(screen.getByText(/@ Stripe/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('How does Stripe achieve payment idempotency?')).toBeInTheDocument();
  });

  it('flips card on Spacebar press and shows answer and rating buttons', async () => {
    vi.mocked(api.getKitById).mockResolvedValueOnce(mockRecord);

    render(<PracticeModePage />);

    await waitFor(() => {
      expect(screen.getByText('How does Stripe achieve payment idempotency?')).toBeInTheDocument();
    });

    // Press Spacebar to flip
    fireEvent.keyDown(window, { key: ' ' });

    expect(screen.getByText(/Idempotency-Key header stored in Redis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rate as mastered/i })).toBeInTheDocument();
  });

  it('records confidence rating via keyboard numbers and auto-advances', async () => {
    vi.mocked(api.getKitById).mockResolvedValueOnce(mockRecord);

    render(<PracticeModePage />);

    await waitFor(() => {
      expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
    });

    // Press '4' to rate current card as Mastered
    fireEvent.keyDown(window, { key: '4' });

    // Advances to Card 2 of 2 after rating
    await waitFor(() => {
      expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
      expect(screen.getByText('Explain two-phase commit vs saga pattern')).toBeInTheDocument();
    });

    // Verify localStorage was updated
    const saved = localStorage.getItem('prepkit_practice_kit-test-123');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.records.f1.confidence).toBe(4);
  });

  it('displays session complete celebration screen when all cards are reviewed', async () => {
    vi.mocked(api.getKitById).mockResolvedValueOnce(mockRecord);

    render(<PracticeModePage />);

    await waitFor(() => {
      expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
    });

    // Rate card 1
    fireEvent.keyDown(window, { key: '3' });

    await waitFor(() => {
      expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
    }, { timeout: 4000 });

    // Rate card 2
    fireEvent.keyDown(window, { key: '4' });

    // Celebration screen should appear
    await waitFor(() => {
      expect(screen.getByText(/Session Complete!/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /review all cards again/i })).toBeInTheDocument();
    });
  });
});
