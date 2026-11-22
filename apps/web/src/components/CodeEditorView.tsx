import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { CollabManager, MonacoBinding } from '@forge/collaboration';
import { DocumentMeta, SupportedLanguage } from '@forge/core';
import { Code2, Settings, Eye } from 'lucide-react';

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

    // Define refined dark Monaco theme
    monaco.editor.defineTheme('forge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
        { token: 'keyword', foreground: '10b981' },
        { token: 'string', foreground: '38bdf8' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'type', foreground: 'c084fc' },
      ],
      colors: {
        'editor.background': '#09090b',
        'editor.foreground': '#e4e4e7',
        'editorCursor.foreground': '#10b981',
        'editor.lineHighlightBackground': '#18181b',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editor.selectionBackground': '#27272a99',
        'editorGutter.background': '#09090b',
      },
    });
    monaco.editor.setTheme('forge-dark');

    bindYjsToMonaco(editor);

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

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (editor && monaco) {
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
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Code Editor Header Bar */}
      <div className="h-9 px-3 border-b border-zinc-850 flex items-center justify-between shrink-0 gap-2 bg-zinc-950">
        <div className="flex items-center gap-2 shrink-0">
          <Code2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-xs font-mono text-zinc-200 truncate">
            {document.name}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Language Selector */}
          <select
            value={document.language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            aria-label="Language"
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 font-mono"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          {/* Minimap toggle */}
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`p-1 rounded text-xs transition-colors ${
              showMinimap ? 'bg-zinc-850 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Minimap"
            aria-label="Toggle Minimap"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Word wrap toggle */}
          <button
            onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
            className={`p-1 rounded text-xs transition-colors ${
              wordWrap === 'on' ? 'bg-zinc-850 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Word Wrap"
            aria-label="Toggle Word Wrap"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-zinc-950">
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
