import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../Toolbar';
import { vi } from 'vitest';

const mockProps = {
  activeTool: 'pencil' as const,
  onChangeTool: vi.fn(),
  activeColor: '#ffffff',
  onChangeColor: vi.fn(),
  activeStrokeWidth: 5,
  onChangeStrokeWidth: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  canUndo: false,
  canRedo: false,
  onClearBoard: vi.fn(),
  onExportImage: vi.fn(),
  gridStyle: 'dots' as const,
  onChangeGridStyle: vi.fn(),
  filled: false,
  onChangeFilled: vi.fn(),
  selectedElementExists: false,
  onBringToFront: vi.fn(),
  onSendToBack: vi.fn(),
  strokeStyle: 'solid' as const,
  onChangeStrokeStyle: vi.fn(),
  backgroundColor: '#0b0f17',
  onChangeBackgroundColor: vi.fn(),
  onAddImage: vi.fn(),
};

test('renders toolbar and calls onChangeTool when a tool button is clicked', () => {
  render(<Toolbar {...mockProps} />);
  const selectBtn = screen.getByTitle(/Select & Move/i);
  fireEvent.click(selectBtn);
  expect(mockProps.onChangeTool).toHaveBeenCalledWith('select');
  const stickyBtn = screen.getByTitle(/Sticky Note/i);
  fireEvent.click(stickyBtn);
  expect(mockProps.onChangeTool).toHaveBeenCalledWith('sticky-note');
});

