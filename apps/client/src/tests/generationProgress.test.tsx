import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  GenerationProgress,
  CANONICAL_STAGES,
} from '../components/progress/GenerationProgress';

describe('Phase 8: GenerationProgress Component', () => {
  it('renders all 6 canonical stages of the pipeline', () => {
    render(<GenerationProgress currentStatusText="Initializing..." />);

    expect(screen.getByText('Autonomous Pipeline Generation')).toBeInTheDocument();

    for (const stage of CANONICAL_STAGES) {
      expect(screen.getByText(stage.label)).toBeInTheDocument();
      expect(screen.getByText(stage.description)).toBeInTheDocument();
    }
  });

  it('marks stage active according to currentStatusText', () => {
    render(
      <GenerationProgress
        currentStatusText="Extracting role metadata and requirements from Job Description..."
        currentStep="extract"
      />
    );

    // Active badge should be rendered next to the active stage
    const activeBadge = screen.getByText('Active');
    expect(activeBadge).toBeInTheDocument();

    // The active stage is "Extracting role requirements"
    const stageElement = screen.getByText('Extracting role requirements');
    expect(stageElement).toHaveClass('font-bold');
  });

  it('detects and displays non-fatal warning badge when company site is unreachable', () => {
    render(
      <GenerationProgress
        currentStatusText="Unable to access company website at https://invalid.example.com. Proceeding with JD analysis."
        logs={[
          {
            timestamp: new Date().toISOString(),
            message: 'Unable to access company website. Proceeding with JD analysis.',
          },
        ]}
      />
    );

    expect(screen.getByText(/Company site could not be reached\. Proceeding with JD analysis\./i)).toBeInTheDocument();
    expect(screen.getByText('NON-FATAL')).toBeInTheDocument();
  });

  it('renders error state with retry button and calls onRetry when clicked', () => {
    const onRetryMock = vi.fn();

    render(
      <GenerationProgress
        error="Network timeout while connecting to LLM service"
        onRetry={onRetryMock}
      />
    );

    expect(screen.getByText('Pipeline Execution Interrupted')).toBeInTheDocument();
    expect(screen.getByText('Network timeout while connecting to LLM service')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it('renders 100% completed status when isCompleted is true', () => {
    render(
      <GenerationProgress
        currentStatusText="Preparation kit generated successfully"
        isCompleted={true}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('includes proper accessible ARIA live attributes', () => {
    const { container } = render(<GenerationProgress currentStatusText="Validating..." />);
    const liveRegion = container.querySelector('[role="status"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
