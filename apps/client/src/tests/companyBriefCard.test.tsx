import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanyBriefCard } from '../components/builder/CompanyBriefCard';

describe('Phase 9: CompanyBriefCard Component', () => {
  const defaultProps = {
    company: 'Stripe',
    companyUrl: 'https://stripe.com',
    location: 'San Francisco, CA',
    researchedAt: new Date().toISOString(),
    pagesUsed: ['https://stripe.com/about', 'https://stripe.com/jobs'],
    summary: 'Stripe builds financial infrastructure for the internet.',
    whatTheyDo: 'Payments, billing, and global financial operations.',
    isEdited: false,
    isRegenerating: false,
    onUpdateBrief: vi.fn(),
    onRegenerateBrief: vi.fn(),
  };

  it('renders company overview, location, URL, and signal sources', () => {
    render(<CompanyBriefCard {...defaultProps} />);

    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('https://stripe.com')).toBeInTheDocument();
    expect(screen.getByText(/San Francisco, CA/i)).toBeInTheDocument();
    expect(screen.getByText('Stripe builds financial infrastructure for the internet.')).toBeInTheDocument();
    expect(screen.getByText('Payments, billing, and global financial operations.')).toBeInTheDocument();
    expect(screen.getByText(/Signal Sources Researched \(2\)/i)).toBeInTheDocument();
  });

  it('enters inline edit mode and updates brief content', () => {
    const onUpdateBrief = vi.fn();
    render(<CompanyBriefCard {...defaultProps} onUpdateBrief={onUpdateBrief} />);

    // Click Edit Brief
    const editBtn = screen.getByRole('button', { name: /edit brief/i });
    fireEvent.click(editBtn);

    // Textarea fields should be editable
    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBe(2);

    fireEvent.change(textareas[0], { target: { value: 'Updated custom summary text.' } });

    // Click Done
    const doneBtn = screen.getByRole('button', { name: /done/i });
    fireEvent.click(doneBtn);

    expect(onUpdateBrief).toHaveBeenCalledWith(
      'Updated custom summary text.',
      'Payments, billing, and global financial operations.'
    );
  });

  it('calls onRegenerateBrief when regenerate button is clicked', () => {
    const onRegenerateBrief = vi.fn();
    render(<CompanyBriefCard {...defaultProps} onRegenerateBrief={onRegenerateBrief} />);

    const regenBtn = screen.getByRole('button', { name: /regenerate brief/i });
    fireEvent.click(regenBtn);

    expect(onRegenerateBrief).toHaveBeenCalledTimes(1);
  });
});
