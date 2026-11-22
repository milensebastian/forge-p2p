import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@forge/ui';
import {
  KeybindingDef,
  KeyCombo,
  loadKeybindings,
  saveKeybinding,
  resetKeybinding,
  resetAllKeybindings,
  formatKeyCombo,
} from '../services/keybindings';
import {
  Command,
  Search,
  RotateCcw,
  Edit2,
  Check,
  X,
  Keyboard,
  AlertCircle,
} from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [bindings, setBindings] = useState<KeybindingDef[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordedCombo, setRecordedCombo] = useState<KeyCombo | null>(null);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  useEffect(() => {
    if (isOpen) {
      setBindings(loadKeybindings());
      setEditingId(null);
      setRecordedCombo(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Key recording listener
  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels recording
      if (e.key === 'Escape') {
        setEditingId(null);
        setRecordedCombo(null);
        return;
      }

      // Enter saves recording if a valid key was captured
      if (e.key === 'Enter' && recordedCombo) {
        saveKeybinding(editingId, recordedCombo);
        setBindings(loadKeybindings());
        setEditingId(null);
        setRecordedCombo(null);
        return;
      }

      // Ignore lone modifier keys
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      const hasMod = e.ctrlKey || e.metaKey || e.altKey;
      if (!hasMod && e.key.length === 1 && !['f1', 'f2', 'f3', 'f4', 'f5'].includes(e.key.toLowerCase())) {
        // Require at least one modifier key for safety so normal typing doesn't trigger commands
        return;
      }

      const newCombo: KeyCombo = {
        key: e.key.toLowerCase(),
        ctrl: e.ctrlKey || undefined,
        meta: e.metaKey || undefined,
        alt: e.altKey || undefined,
        shift: e.shiftKey || undefined,
      };

      setRecordedCombo(newCombo);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingId, recordedCombo]);

  const handleStartEdit = (item: KeybindingDef) => {
    setEditingId(item.id);
    setRecordedCombo(null);
  };

  const handleResetSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    resetKeybinding(id);
    setBindings(loadKeybindings());
  };

  const handleResetAll = () => {
    if (confirm('Reset all keyboard shortcuts back to default VS Code settings?')) {
      resetAllKeybindings();
      setBindings(loadKeybindings());
    }
  };

  const filteredBindings = bindings.filter((b) =>
    b.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    formatKeyCombo(b.combo, isMac).join(' ').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const hasAnyCustom = bindings.some((b) => b.isCustom);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts & Keybindings"
      description="View, customize, and edit keyboard shortcuts to match your workflow."
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands or shortcuts..."
            className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Live Recording Banner */}
        {editingId && (
          <div className="p-3 bg-zinc-900 border border-emerald-500/50 rounded-xl space-y-2 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 animate-pulse" />
                <span>Recording shortcut for &ldquo;{bindings.find((b) => b.id === editingId)?.label}&rdquo;</span>
              </span>
              <button
                onClick={() => {
                  setEditingId(null);
                  setRecordedCombo(null);
                }}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-zinc-850">
              <div className="flex items-center gap-1.5 font-mono">
                {recordedCombo ? (
                  formatKeyCombo(recordedCombo, isMac).map((k, i) => (
                    <kbd
                      key={i}
                      className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-semibold text-emerald-300"
                    >
                      {k}
                    </kbd>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500 italic">Press key combination (e.g. Ctrl + Shift + R)...</span>
                )}
              </div>

              {recordedCombo && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500 text-[11px]">Press Enter to save</span>
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => {
                      saveKeybinding(editingId, recordedCombo);
                      setBindings(loadKeybindings());
                      setEditingId(null);
                      setRecordedCombo(null);
                    }}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>

            <div className="text-[11px] text-zinc-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Press <kbd className="font-mono text-zinc-400">Esc</kbd> to cancel. Requires modifier (Ctrl/Cmd/Alt).</span>
            </div>
          </div>
        )}

        {/* Shortcuts List */}
        <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-1">
          {filteredBindings.length > 0 ? (
            filteredBindings.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleStartEdit(item)}
                  className={`group px-3 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isEditing
                      ? 'bg-zinc-850/80 border-emerald-500/40 text-white'
                      : 'bg-zinc-950/40 border-zinc-850/80 hover:bg-zinc-900/60 hover:border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200 truncate">{item.label}</span>
                      {item.isCustom && (
                        <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Customized
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500">{item.category}</span>
                  </div>

                  {/* Keys & Action Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 font-mono">
                      {formatKeyCombo(item.combo, isMac).map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-300 shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>

                    {/* Reset single custom binding */}
                    {item.isCustom && (
                      <button
                        onClick={(e) => handleResetSingle(item.id, e)}
                        className="p-1 rounded text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                        title="Reset to default"
                        aria-label="Reset to default"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(item);
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit keybinding"
                      aria-label="Edit keybinding"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-zinc-500">
              No shortcuts found matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-850 flex items-center justify-between text-xs text-zinc-500">
          <div>
            {hasAnyCustom && (
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All to Defaults</span>
              </button>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
