import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { CollabManager, MonacoBinding } from '@forge/collaboration';
import { DocumentMeta, SupportedLanguage } from '@forge/core';
import { Code2, Settings, Eye, Check } from 'lucide-react';

type MonacoEditor = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

interface CodeEditorViewProps {
  document: DocumentMeta;
  collabManager: CollabManager;
  onLanguageChange: (newLang: SupportedLanguage) => void;
}

const SUPPORTED_LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'markdown', label: 'Markdown' },
];

export const CodeEditorView: React.FC<CodeEditorViewProps> = ({
  document,
  collabManager,
  onLanguageChange,
}) => {
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const [showMinimap, setShowMinimap] = React.useState(!isSmallScreen);
  const [wordWrap, setWordWrap] = React.useState<'on' | 'off'>(isSmallScreen ? 'on' : 'off');

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define dark Monaco theme to match Forge styling
    monaco.editor.defineTheme('forge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '34d399' },
        { token: 'string', foreground: '38bdf8' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'type', foreground: 'a78bfa' },
      ],
      colors: {
        'editor.background': '#0c0e14',
        'editor.foreground': '#e4e4e7',
        'editorCursor.foreground': '#10b981',
        'editor.lineHighlightBackground': '#181b26',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#10b981',
        'editor.selectionBackground': '#27272a80',
        'editorGutter.background': '#0c0e14',
      },
    });
    monaco.editor.setTheme('forge-dark');

    // Bind Yjs CRDT Text with Monaco Model & Awareness
    bindYjsToMonaco(editor);

    // Track local cursor movements
    editor.onDidChangeCursorPosition((e: any) => {
      collabManager.setLocalCursor(document.id, e.position.lineNumber, e.position.column);
    });
  };

  const bindYjsToMonaco = (editor: MonacoEditor) => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const ytext = collabManager.getText(document.id);
    const model = editor.getModel();

    if (model && collabManager.provider) {
      bindingRef.current = new MonacoBinding(
        ytext,
        model as any,
        new Set([editor as any]),
        collabManager.provider.awareness,
        monacoRef.current as any
      );
    }
  };

  // Re-bind when document ID changes — update model in-place
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (editor && monaco) {
      // Update the existing model's language to match the new document
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, document.language);
      }
      bindYjsToMonaco(editor);
    }
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [document.id, document.language]);

  return (
    <div className="flex flex-col h-full bg-[#0c0e14]">
      {/* Code Editor Header Bar */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-zinc-900/80 border-b border-zinc-800 shrink-0 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Code2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-mono font-medium text-zinc-200 max-w-[120px] sm:max-w-none truncate">
            {document.name}
          </span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            CRDT Synced
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language Selector */}
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <span className="text-[11px] hidden sm:inline">Lang:</span>
            <select
              value={document.language}
              onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
              aria-label="Select Programming Language"
              className="bg-zinc-950 border border-zinc-700/80 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Minimap toggle */}
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`p-1.5 rounded text-xs flex items-center gap-1 min-h-[32px] min-w-[32px] justify-center transition-colors ${
              showMinimap ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Minimap"
            aria-label="Toggle Minimap"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden md:inline">Minimap</span>
          </button>

          {/* Word wrap toggle */}
          <button
            onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
            className={`p-1.5 rounded text-xs flex items-center gap-1 min-h-[32px] min-w-[32px] justify-center transition-colors ${
              wordWrap === 'on' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Word Wrap"
            aria-label="Toggle Word Wrap"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden md:inline">Wrap</span>
          </button>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <Editor
          height="100%"
          language={document.language}
          theme="forge-dark"
          onMount={handleEditorMount}
          options={{
            fontSize: isSmallScreen ? 12 : 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: showMinimap },
            wordWrap,
            automaticLayout: true,
            tabSize: 2,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            lineNumbersMinChars: isSmallScreen ? 2 : 3,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
};
