// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type {
  ImportError,
  ImportHistoryItem,
} from '../../src/features/setlist-import/useSetlistImportState';

vi.mock('../../src/components/ErrorAlert', () => ({
  ErrorAlert: ({ message, onRetry }: { message: string; onRetry?: () => void }) =>
    React.createElement(
      'div',
      { role: 'alert' },
      message,
      onRetry ? React.createElement('button', { onClick: onRetry }, 'Retry load setlist') : null
    ),
}));
vi.mock('@repo/ui', () => ({
  Button: ({
    loading,
    loadingChildren,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingChildren?: React.ReactNode;
  }) =>
    React.createElement(
      'button',
      { ...props, disabled: Boolean(props.disabled || loading) },
      loading ? loadingChildren : children
    ),
}));
vi.mock('../../src/components/StatusText', () => ({
  StatusText: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', null, children),
}));
vi.mock('../../src/features/setlist-import/SetlistPreview', () => ({
  SetlistPreview: () => React.createElement('div', null, 'Preview'),
}));
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

const mockLoadSetlist = vi.fn().mockResolvedValue(false);
const mockValidateInput = vi.fn().mockReturnValue(true);
const mockCancelLoad = vi.fn();
const mockRetryLast = vi.fn().mockResolvedValue(false);
const mockSelectHistoryItem = vi.fn().mockResolvedValue(false);
const mockGoToPreview = vi.fn();

const baseImportState = {
  inputValue: '',
  setInputValue: vi.fn(),
  setlist: null,
  loading: false,
  error: null as ImportError | null,
  history: [] as ImportHistoryItem[],
  loadSetlist: mockLoadSetlist,
  validateInput: mockValidateInput,
  cancelLoad: mockCancelLoad,
  retryLast: mockRetryLast,
  selectHistoryItem: mockSelectHistoryItem,
  clearHistory: vi.fn(),
  resetForAnother: vi.fn(),
};

const mockUseSetlistImportState = vi.fn(() => baseImportState);
vi.mock('../../src/features/setlist-import/useSetlistImportState', () => ({
  useSetlistImportState: () => mockUseSetlistImportState(),
}));
vi.mock('../../src/features/setlist-import/useFlowState', () => ({
  useFlowState: () => ({
    step: 'import',
    matchRows: null,
    stepContainerRef: { current: null },
    goToPreview: mockGoToPreview,
    goToMatching: vi.fn(),
    goToExport: vi.fn(),
    goBackToPreview: vi.fn(),
    goBackToMatching: vi.fn(),
    updateMatchDraft: vi.fn(),
    startAnotherSetlist: vi.fn(),
  }),
}));

import { SetlistImportView } from '../../src/features/setlist-import/SetlistImportView';

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateInput.mockReturnValue(true);
  mockLoadSetlist.mockResolvedValue(false);
  mockSelectHistoryItem.mockResolvedValue(false);
  mockUseSetlistImportState.mockReturnValue(baseImportState);
});

afterEach(cleanup);

describe('SetlistImportView import controls', () => {
  it('renders the initial orientation and import field', () => {
    render(<SetlistImportView />);
    expect(screen.getByRole('heading', { name: 'Import a setlist' })).toBeInTheDocument();
    expect(screen.getByLabelText('Setlist URL or ID')).toBeInTheDocument();
    expect(screen.getByText('Confirm the show and song order.')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Playlist creation progress' })).toContainElement(
      screen.getByText('Import').closest('[aria-current="step"]')
    );
  });

  it('does not request an invalid input', () => {
    mockUseSetlistImportState.mockReturnValue({
      ...baseImportState,
      inputValue: 'not valid',
    });
    mockValidateInput.mockReturnValue(false);
    render(<SetlistImportView />);

    fireEvent.submit(screen.getByRole('button', { name: 'Load setlist' }).closest('form')!);

    expect(mockValidateInput).toHaveBeenCalledOnce();
    expect(mockLoadSetlist).not.toHaveBeenCalled();
  });

  it('offers cancellation while a request is active', () => {
    mockUseSetlistImportState.mockReturnValue({
      ...baseImportState,
      inputValue: '63de4613',
      loading: true,
    });
    render(<SetlistImportView />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockCancelLoad).toHaveBeenCalledOnce();
  });
});

describe('SetlistImportView recovery and history', () => {
  it('shows retry only for retryable errors', () => {
    mockUseSetlistImportState.mockReturnValue({
      ...baseImportState,
      inputValue: '63de4613',
      error: { message: 'Setlist not found.', code: 'not-found', retryable: false },
    });
    const { rerender } = render(<SetlistImportView />);
    expect(screen.queryByRole('button', { name: 'Retry load setlist' })).not.toBeInTheDocument();

    mockUseSetlistImportState.mockReturnValue({
      ...baseImportState,
      inputValue: '63de4613',
      error: { message: 'Service unavailable.', code: 'service', retryable: true },
    });
    rerender(<SetlistImportView />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry load setlist' }));
    expect(mockRetryLast).toHaveBeenCalledOnce();
  });

  it('renders input-only history and imports the selected record', async () => {
    const historyItem = {
      input: '63de4613',
      setlistId: '63de4613',
    };
    mockSelectHistoryItem.mockResolvedValue(true);
    mockUseSetlistImportState.mockReturnValue({
      ...baseImportState,
      history: [historyItem],
    });
    render(<SetlistImportView />);

    fireEvent.click(screen.getByRole('button', { name: /Setlist 63de4613/ }));

    await waitFor(() => expect(mockSelectHistoryItem).toHaveBeenCalledWith(historyItem));
    expect(mockGoToPreview).toHaveBeenCalledOnce();
  });
});
