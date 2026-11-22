import React, { useState, useEffect, useRef } from 'react';
import { DocumentMeta } from '@forge/core';
import { FileText, FileCode, Search } from 'lucide-react';

interface QuickOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DocumentMeta[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
}

export const QuickOpenModal: React.FC<QuickOpenModalProps> = ({
  isOpen,
  onClose,
  files,
  activeDocId,
  onSelectDoc,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase().trim())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        onSelectDoc(filteredFiles[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Floating Quick Open Palette */}
      <div
        className="relative w-full max-w-lg bg-[#121318] border border-[#23252f] rounded-xl shadow-2xl overflow-hidden z-10 animate-in fade-in-50 zoom-in-95 duration-100"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-3 py-2 border-b border-[#1e2029] bg-[#0c0d10]">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type document name to open... (↑/↓ to navigate, Enter to open)"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#181922] border border-[#282a38] text-[10px] font-mono text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
          {filteredFiles.length > 0 ? (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              const isActive = file.id === activeDocId;

              return (
                <div
                  key={file.id}
                  onClick={() => {
                    onSelectDoc(file.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#181922] text-white border-l-2 border-indigo-500'
                      : 'text-zinc-400 hover:bg-[#14151b] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {file.type === 'markdown' ? (
                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                    <span className="font-mono text-xs">{file.name}</span>
                    {isActive && (
                      <span className="text-[10px] text-zinc-500 font-sans">(active)</span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#0c0d10] border border-[#1e2029] text-zinc-400">
                    {file.language}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-zinc-500 font-sans">
              No documents matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Palette Footer Tip */}
        <div className="px-3 py-1.5 border-t border-[#1e2029] bg-[#0c0d10] text-[11px] text-zinc-500 flex items-center justify-between font-mono">
          <span>Quick Open</span>
          <span>Ctrl + P / ⌘P</span>
        </div>
      </div>
    </div>
  );
};
