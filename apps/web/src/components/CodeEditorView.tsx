import React, { useRef, useEffect, useState, useMemo } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { CollabManager, MonacoBinding } from '@forge/collaboration';
import { DocumentMeta, SupportedLanguage, SUPPORTED_LANGUAGES_LIST, getLanguageConfig } from '@forge/core';
import { runProgram, ExecutionResult } from '../services/codeRunner';
import {
  Code2,
  Play,
  RotateCcw,
  Terminal,
  Eye,
  Settings,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  Globe,
} from 'lucide-react';

type MonacoEditor = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

interface CodeEditorViewProps {
  document: DocumentMeta;
  collabManager: CollabManager;
  onLanguageChange: (newLang: SupportedLanguage) => void;
}

export const CodeEditorView: React.FC<CodeEditorViewProps> = ({
  document,
  collabManager,
  onLanguageChange,
}) => {
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const [showMinimap, setShowMinimap] = useState(!isSmallScreen);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>(isSmallScreen ? 'on' : 'off');

  // Execution Terminal States
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalTab, setTerminalTab] = useState<'output' | 'stdin' | 'preview'>('output');
  const [isRunning, setIsRunning] = useState(false);
  const [stdinInput, setStdinInput] = useState('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);

  const langConfig = useMemo(() => getLanguageConfig(document.language), [document.language]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

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

    // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to Run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunCode();
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
        monaco.editor.setModelLanguage(model, langConfig.monacoLang);
      }
      bindYjsToMonaco(editor);
    }
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [document.id, document.language, langConfig.monacoLang]);

  // Execute current program
  const handleRunCode = async () => {
    const ytext = collabManager.getText(document.id);
    const code = ytext.toString();

    // If HTML/CSS, automatically switch to web preview
    if (langConfig.id === 'html' || langConfig.id === 'css') {
      setIsTerminalOpen(true);
      setTerminalTab('preview');
      return;
    }

    setIsTerminalOpen(true);
    setTerminalTab('output');
    setIsRunning(true);
    setExecutionResult(null);

    try {
      const result = await runProgram(code, document.language, stdinInput);
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionResult({
        stdout: '',
        stderr: err?.message || 'Execution error occurred.',
        exitCode: 1,
        status: 'error',
        runnerName: 'Runner',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Group languages by category for selector
  const categorizedLanguages = useMemo(() => {
    const categories: Record<string, typeof SUPPORTED_LANGUAGES_LIST> = {
      Popular: [],
      Systems: [],
      Web: [],
      'Data / Scripts': [],
      Other: [],
    };
    SUPPORTED_LANGUAGES_LIST.forEach((l) => {
      if (categories[l.category]) {
        categories[l.category].push(l);
      } else {
        categories['Other'].push(l);
      }
    });
    return categories;
  }, []);

  const currentCode = collabManager.getText(document.id).toString();

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden relative">
      {/* Code Editor Header Bar */}
      <div className="h-10 px-3 border-b border-zinc-850 flex items-center justify-between shrink-0 gap-2 bg-zinc-950">
        <div className="flex items-center gap-2 shrink-0">
          <Code2 className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className="text-xs font-mono text-zinc-200 truncate max-w-[140px] sm:max-w-none">
            {document.name}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 hidden sm:inline">
            {langConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Run Button */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all shadow-xs ${
              isRunning
                ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold active:scale-[0.98]'
            }`}
            title="Run code (Ctrl + Enter)"
          >
            {isRunning ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Running...' : 'Run'}</span>
            <span className="hidden lg:inline text-[10px] opacity-75 font-mono">⌘↵</span>
          </button>

          {/* Toggle Terminal drawer */}
          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={`p-1.5 rounded-md text-xs transition-colors flex items-center gap-1 border ${
              isTerminalOpen
                ? 'bg-zinc-850 text-white border-zinc-700'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            title="Toggle Console / Output"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Console</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-0.5" />

          {/* Language Selector */}
          <select
            value={document.language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            aria-label="Language"
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 font-mono"
          >
            {Object.entries(categorizedLanguages).map(([cat, langs]) => (
              <optgroup key={cat} label={cat}>
                {langs.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Minimap toggle */}
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`p-1.5 rounded text-xs transition-colors hidden sm:flex ${
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
            className={`p-1.5 rounded text-xs transition-colors hidden sm:flex ${
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
          language={langConfig.monacoLang}
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

      {/* Execution Terminal / Output Panel */}
      {isTerminalOpen && (
        <div
          className={`border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0 z-20 shadow-2xl transition-all duration-150 ${
            isTerminalMaximized ? 'h-[75%]' : 'h-64 sm:h-72'
          }`}
        >
          {/* Terminal Tabs & Toolbar */}
          <div className="h-9 px-3 border-b border-zinc-850 bg-zinc-900/60 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTerminalTab('output')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  terminalTab === 'output'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Console Output</span>
                {executionResult && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      executionResult.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                )}
              </button>

              <button
                onClick={() => setTerminalTab('stdin')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  terminalTab === 'stdin'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Input (stdin)</span>
                {stdinInput && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </button>

              {(langConfig.id === 'html' || langConfig.id === 'css' || langConfig.id === 'javascript') && (
                <button
                  onClick={() => setTerminalTab('preview')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    terminalTab === 'preview'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>Web Preview</span>
                </button>
              )}
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1">
              {terminalTab === 'output' && executionResult && (
                <button
                  onClick={() => setExecutionResult(null)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Clear output"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setIsTerminalMaximized(!isTerminalMaximized)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block"
                title={isTerminalMaximized ? 'Restore size' : 'Maximize terminal'}
              >
                {isTerminalMaximized ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={() => setIsTerminalOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                title="Close console"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Terminal Content Body */}
          <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed bg-zinc-950 select-text">
            {terminalTab === 'output' && (
              <>
                {isRunning ? (
                  <div className="flex items-center gap-2 text-zinc-400 py-4 px-2">
                    <RotateCcw className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>Executing {langConfig.label} program...</span>
                  </div>
                ) : executionResult ? (
                  <div className="space-y-3">
                    {/* Execution Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-850 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-2">
                        {executionResult.status === 'success' ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Success (exit {executionResult.exitCode})
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-400 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Failed (exit {executionResult.exitCode})
                          </span>
                        )}
                        <span className="text-zinc-600">|</span>
                        <span className="text-zinc-400">{executionResult.runnerName}</span>
                      </div>

                      <div className="flex items-center gap-3 text-zinc-500">
                        {executionResult.executionTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {executionResult.executionTime}
                          </span>
                        )}
                        {executionResult.memory && (
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            {executionResult.memory}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compiler Error / Message */}
                    {executionResult.compileOutput && (
                      <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 text-amber-300 whitespace-pre-wrap">
                        {executionResult.compileOutput}
                      </div>
                    )}

                    {/* Standard Error */}
                    {executionResult.stderr && (
                      <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300 whitespace-pre-wrap">
                        {executionResult.stderr}
                      </div>
                    )}

                    {/* Standard Output */}
                    {executionResult.stdout ? (
                      <div className="text-zinc-200 whitespace-pre-wrap">
                        {executionResult.stdout}
                      </div>
                    ) : (
                      !executionResult.stderr && (
                        <div className="text-zinc-500 italic">
                          (Program completed with no output)
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-600 py-4 px-2 space-y-1">
                    <div>Click <span className="text-emerald-400 font-medium">Run ▶</span> or press <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">Ctrl+Enter</kbd> to execute this {langConfig.label} file.</div>
                    <div className="text-[11px] text-zinc-600">Supports Python, C, C++, Rust, Go, Java, C#, JS, TS, Bash, PHP, Ruby, R, Swift, Kotlin, SQL.</div>
                  </div>
                )}
              </>
            )}

            {terminalTab === 'stdin' && (
              <div className="h-full flex flex-col space-y-2">
                <div className="text-zinc-400 text-[11px]">
                  Provide standard input (stdin) passed to your program when reading from keyboard/terminal.
                </div>
                <textarea
                  value={stdinInput}
                  onChange={(e) => setStdinInput(e.target.value)}
                  placeholder="Type stdin input here..."
                  className="flex-1 w-full p-2 bg-zinc-900/80 border border-zinc-800 rounded text-zinc-200 font-mono text-xs focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>
            )}

            {terminalTab === 'preview' && (
              <div className="h-full w-full rounded bg-white overflow-hidden">
                <iframe
                  title="Web Preview"
                  sandbox="allow-scripts allow-modals"
                  srcDoc={currentCode}
                  className="w-full h-full border-0"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
