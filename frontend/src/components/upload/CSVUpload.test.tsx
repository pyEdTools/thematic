import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CSVUpload } from './CSVUpload';
import Papa from 'papaparse';

// Mock PapaParse
vi.mock('papaparse', async () => {
  const actual = await vi.importActual<any>('papaparse');
  return {
    ...actual,
    default: {
      ...actual.default,
      parse: vi.fn((file, config) => {
        if (config.complete) {
          config.complete({
            data: [
              { feedback: 'Great course!', sentiment: 'positive' },
              { feedback: 'Too hard.', sentiment: 'negative' }
            ],
            meta: { fields: ['feedback', 'sentiment'] }
          });
        }
      })
    }
  };
});

describe('CSVUpload', () => {
  const mockOnUploadComplete = vi.fn();
  const projectId = 'test-project-id';

  it('renders the upload area initially', () => {
    render(<CSVUpload projectId={projectId} onUploadComplete={mockOnUploadComplete} />);
    expect(screen.getByText(/Drop your CSV here/i)).toBeInTheDocument();
    expect(screen.getByText(/Select File/i)).toBeInTheDocument();
  });

  it('shows column selection after "uploading" a file', async () => {
    render(<CSVUpload projectId={projectId} onUploadComplete={mockOnUploadComplete} />);
    
    const file = new File(['feedback,sentiment\nGreat course!,positive'], 'test.csv', { type: 'text/csv' });
    const input = document.getElementById('csv-upload-input') as HTMLInputElement;
    
    // We have to use fireEvent.change on the hidden input
    fireEvent.change(input, { target: { files: [file] } });

    // Check if column selection title appears
    expect(await screen.findByText(/Select Columns to Analyze/i)).toBeInTheDocument();
    expect(screen.getAllByText(/feedback/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sentiment/i).length).toBeGreaterThan(0);
  });
});
