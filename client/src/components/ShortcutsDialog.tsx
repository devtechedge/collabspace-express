import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './ShortcutsDialog.css';

const SHORTCUTS = [
  { keys: 'V', action: 'Select' },
  { keys: 'P', action: 'Pencil' },
  { keys: 'H', action: 'Highlighter' },
  { keys: 'E', action: 'Eraser' },
  { keys: 'L', action: 'Line' },
  { keys: 'R', action: 'Rectangle' },
  { keys: 'O', action: 'Circle' },
  { keys: 'T', action: 'Text' },
  { keys: 'N', action: 'Sticky note' },
  { keys: 'Z', action: 'Laser' },
  { keys: 'I', action: 'Image' },
  { keys: 'Shift + drag', action: 'Pan' },
  { keys: 'Scroll', action: 'Zoom' },
  { keys: '⌘/Ctrl + Z', action: 'Undo' },
  { keys: '⌘/Ctrl + Y', action: 'Redo' },
  { keys: 'Delete', action: 'Remove selection' },
  { keys: '[  ]', action: 'Send back / bring forward' },
  { keys: '?', action: 'Show this panel' },
];

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="shortcuts-overlay"
      role="presentation"
      onClick={onClose}
      data-testid="shortcuts-overlay"
    >
      <div
        className="shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="shortcuts-dialog"
      >
        <div className="shortcuts-header">
          <div>
            <h2 id="shortcuts-title">Keyboard shortcuts</h2>
            <p>Every drawing tool is one key away. Pan with Shift-drag or a middle click.</p>
          </div>
          <button
            type="button"
            className="shortcuts-close"
            onClick={onClose}
            aria-label="Close shortcuts"
          >
            <X size={16} />
          </button>
        </div>
        <ul className="shortcuts-list">
          {SHORTCUTS.map((item) => (
            <li key={item.action}>
              <span>{item.action}</span>
              <kbd>{item.keys}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
