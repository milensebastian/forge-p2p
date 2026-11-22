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
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 text-sm font-mono"
          />
          {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Document Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType('code');
                if (language === 'markdown') setLanguage('typescript');
              }}
              className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                type === 'code'
                  ? 'bg-zinc-850 border-zinc-700 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium">Executable Code</div>
                <div className="text-[10px] text-zinc-500">Run in 20+ languages</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('markdown');
                setLanguage('markdown');
              }}
              className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                type === 'markdown'
                  ? 'bg-zinc-850 border-zinc-700 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium">Markdown</div>
                <div className="text-[10px] text-zinc-500">Live preview doc</div>
              </div>
            </button>
          </div>
        </div>

        {type === 'code' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Programming Language
            </label>
            <select
              value={language}
              onChange={(e) => handleLanguageSelect(e.target.value as SupportedLanguage)}
              aria-label="Language"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono"
            >
              {Object.entries(categorizedLanguages).map(([cat, langs]) => (
                <optgroup key={cat} label={cat}>
                  {langs.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label} ({lang.extension})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Create File
          </Button>
        </div>
      </form>
    </Modal>
  );
};
