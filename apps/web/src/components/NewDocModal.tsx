import React, { useState, useMemo } from 'react';
import { Modal, Button } from '@forge/ui';
import {
  DocumentType,
  SupportedLanguage,
  SUPPORTED_LANGUAGES_LIST,
  getLanguageConfig,
  detectLanguageFromFilename,
} from '@forge/core';
import { FileCode, FileText } from 'lucide-react';

interface NewDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, type: DocumentType, language: SupportedLanguage) => void;
}

export const NewDocModal: React.FC<NewDocModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>('code');
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please provide a filename');
      return;
    }

    // Ensure extension exists
    let finalName = cleanName;
    if (!finalName.includes('.')) {
      const config = getLanguageConfig(type === 'markdown' ? 'markdown' : language);
      finalName = `${cleanName}${config.extension}`;
    }

    onCreate(finalName, type, type === 'markdown' ? 'markdown' : language);
    setName('');
    setError(null);
    onClose();
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (error) setError(null);

    if (val.includes('.')) {
      const detected = detectLanguageFromFilename(val);
      setType(detected.type);
      setLanguage(detected.language);
    }
  };

  const handleLanguageSelect = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    const config = getLanguageConfig(newLang);
    if (name && name.includes('.')) {
      const base = name.split('.')[0];
      setName(`${base}${config.extension}`);
    }
  };

  const categorizedLanguages = useMemo(() => {
    const categories: Record<string, typeof SUPPORTED_LANGUAGES_LIST> = {
      Popular: [],
      Systems: [],
      Web: [],
      'Data / Scripts': [],
      Other: [],
    };
    SUPPORTED_LANGUAGES_LIST.filter((l) => l.id !== 'markdown').forEach((l) => {
      if (categories[l.category]) {
        categories[l.category].push(l);
      } else {
        categories['Other'].push(l);
      }
    });
    return categories;
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New File"
      description="Add a source code program or markdown specification."
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Filename & Extension
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. main.py, solver.cpp, index.ts, query.sql"
            autoFocus
            className="w-full px-3 py-1.5 rounded-md bg-[#0c0d10] border border-[#23252f] text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 transition-colors"
          />
          {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        </div>

        {/* Document Type Selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Document Kind
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType('code');
                if (!name.includes('.')) {
                  setName('main.ts');
                }
              }}
              className={`p-2 rounded-md border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                type === 'code'
                  ? 'bg-[#181922] border-indigo-500/80 text-white'
                  : 'bg-[#0c0d10] border-[#23252f] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Source Code</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('markdown');
                if (!name.includes('.')) {
                  setName('notes.md');
                }
              }}
              className={`p-2 rounded-md border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                type === 'markdown'
                  ? 'bg-[#181922] border-indigo-500/80 text-white'
                  : 'bg-[#0c0d10] border-[#23252f] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Markdown Spec</span>
            </button>
          </div>
        </div>

        {/* Language Selection for Code files */}
        {type === 'code' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Target Language
            </label>
            <select
              value={language}
              onChange={(e) => handleLanguageSelect(e.target.value as SupportedLanguage)}
              aria-label="Target Language"
              className="w-full px-3 py-1.5 rounded-md bg-[#0c0d10] border border-[#23252f] text-sm font-mono text-zinc-200 focus:outline-none focus:border-indigo-500/80"
            >
              {Object.entries(categorizedLanguages).map(([cat, langs]) => (
                <optgroup key={cat} label={cat}>
                  {langs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label} ({l.extension})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2 border-t border-[#1e2029]">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" size="sm">
            Create Document
          </Button>
        </div>
      </form>
    </Modal>
  );
};
