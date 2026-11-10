import React, { useState } from 'react';
import { Modal, Button } from '@forge/ui';
import { DocumentType, SupportedLanguage } from '@forge/core';
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
      setError('Please provide a document filename');
      return;
    }
    onCreate(cleanName, type, type === 'markdown' ? 'markdown' : language);
    setName('');
    setError(null);
    onClose();
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (error) setError(null);
    // Auto-detect type based on extension
    if (val.endsWith('.md')) {
      setType('markdown');
    } else if (val.endsWith('.ts') || val.endsWith('.tsx')) {
      setType('code');
      setLanguage('typescript');
    } else if (val.endsWith('.js') || val.endsWith('.jsx')) {
      setType('code');
      setLanguage('javascript');
    } else if (val.endsWith('.py')) {
      setType('code');
      setLanguage('python');
    } else if (val.endsWith('.rs')) {
      setType('code');
      setLanguage('rust');
    } else if (val.endsWith('.go')) {
      setType('code');
      setLanguage('go');
    } else if (val.endsWith('.sql')) {
      setType('code');
      setLanguage('sql');
    } else if (val.endsWith('.json')) {
      setType('code');
      setLanguage('json');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Document"
      description="Add a collaborative Markdown specification or Monaco code file to this workspace."
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Filename & Extension
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. server.ts, notes.md, schema.sql"
            autoFocus
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700/80 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-mono"
          />
          {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Document Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('code')}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                type === 'code'
                  ? 'bg-zinc-800 border-emerald-500/80 text-white'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Monaco Code</div>
                <div className="text-[10px] text-zinc-500">Syntax highlighted source</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('markdown')}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                type === 'markdown'
                  ? 'bg-zinc-800 border-emerald-500/80 text-white'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Markdown Doc</div>
                <div className="text-[10px] text-zinc-500">Rich live preview doc</div>
              </div>
            </button>
          </div>
        </div>

        {type === 'code' && (
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Code Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              aria-label="Code Language"
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="rust">Rust</option>
              <option value="go">Go</option>
              <option value="sql">SQL</option>
              <option value="json">JSON</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create File
          </Button>
        </div>
      </form>
    </Modal>
  );
};

