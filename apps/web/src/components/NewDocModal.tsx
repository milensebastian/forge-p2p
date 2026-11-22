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
      setError('Provide a filename');
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
      title="New Document"
      description="Create a markdown document or source code file in this workspace."
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Filename
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. index.ts, notes.md"
            autoFocus
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 text-sm font-mono"
          />
          {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('code')}
              className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                type === 'code'
                  ? 'bg-zinc-850 border-zinc-700 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="w-4 h-4 text-zinc-300 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium">Source Code</div>
                <div className="text-[10px] text-zinc-500">Monaco editor</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('markdown')}
              className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                type === 'markdown'
                  ? 'bg-zinc-850 border-zinc-700 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-4 h-4 text-zinc-300 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium">Markdown</div>
                <div className="text-[10px] text-zinc-500">Live preview</div>
              </div>
            </button>
          </div>
        </div>

        {type === 'code' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              aria-label="Language"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono"
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
};
