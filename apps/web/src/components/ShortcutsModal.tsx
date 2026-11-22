import React from 'react';
import { Modal, Button } from '@forge/ui';
import { Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const mod = isMac ? '⌘' : 'Ctrl';
  const alt = isMac ? '⌥' : 'Alt';

  const categories: ShortcutCategory[] = [
    {
      title: 'General & Workspace Navigation',
      items: [
        { keys: [mod, 'P'], description: 'Quick Open (fuzzy file search)' },
        { keys: ['F1', `or ${mod}+Shift+P`], description: 'Monaco Command Palette' },
        { keys: [mod, 'B'], description: 'Toggle File Explorer sidebar' },
        { keys: [mod, '`'], description: 'Toggle Output Terminal / Console' },
        { keys: [mod, 'S'], description: 'Commit & sync workspace to IndexedDB' },
        { keys: [mod, 'Shift', 'N'], description: 'Create new document' },
        { keys: [mod, '?'], description: 'Open Keyboard Shortcuts cheat sheet' },
      ],
    },
    {
      title: 'Execution & Terminal',
      items: [
        { keys: [mod, 'Enter'], description: 'Run current program (Python, C++, Rust, Go, JS, etc.)' },
      ],
    },
    {
      title: 'Line & Code Editing',
      items: [
        { keys: [alt, '↑ / ↓'], description: 'Move line up / down' },
        { keys: ['Shift', alt, '↑ / ↓'], description: 'Copy line up / down' },
        { keys: [mod, 'Shift', 'K'], description: 'Delete current line' },
        { keys: [mod, 'Enter'], description: 'Insert line below' },
        { keys: [mod, 'Shift', 'Enter'], description: 'Insert line above' },
        { keys: [alt, 'Z'], description: 'Toggle word wrap' },
        { keys: ['Shift', alt, 'F'], description: 'Format document' },
      ],
    },
    {
      title: 'Comments & Multi-Cursor',
      items: [
        { keys: [mod, '/'], description: 'Toggle line comment' },
        { keys: ['Shift', alt, 'A'], description: 'Toggle block comment' },
        { keys: [mod, 'D'], description: 'Add selection to next find match' },
        { keys: [mod, 'U'], description: 'Undo last cursor position' },
        { keys: [mod, 'Shift', 'L'], description: 'Select all occurrences of current word' },
      ],
    },
    {
      title: 'Search & Code Folding',
      items: [
        { keys: [mod, 'F'], description: 'Find' },
        { keys: [mod, 'H'], description: 'Find and Replace' },
        { keys: [mod, 'G'], description: 'Go to line number' },
        { keys: [mod, 'Shift', '['], description: 'Fold code block' },
        { keys: [mod, 'Shift', ']'], description: 'Unfold code block' },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="VS Code Keyboard Shortcuts"
      description="Familiar coding and navigation shortcuts available in the FORGE editor."
      className="max-w-2xl"
    >
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        {categories.map((cat) => (
          <div key={cat.title} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Command className="w-3.5 h-3.5 text-zinc-500" />
              <span>{cat.title}</span>
            </h3>

            <div className="rounded-lg border border-zinc-850 divide-y divide-zinc-850 bg-zinc-950/60 overflow-hidden">
              {cat.items.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 flex items-center justify-between text-xs gap-3 hover:bg-zinc-900/40 transition-colors"
                >
                  <span className="text-zinc-300 font-normal">{item.description}</span>
                  <div className="flex items-center gap-1 shrink-0 font-mono">
                    {item.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-medium shadow-xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};
