import React, { useRef, useEffect, useState, useMemo } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { CollabManager, MonacoBinding } from '@forge/collaboration';
import { DocumentMeta, SupportedLanguage, SUPPORTED_LANGUAGES_LIST, getLanguageConfig } from '@forge/core';
import { runProgram, compileProgram, ExecutionResult, CompilerDiagnostic } from '../services/codeRunner';
import { loadKeybindings, matchesKeybinding } from '../services/keybindings';
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
  Keyboard,
  Hammer,
  Sliders,
  Check,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

type MonacoEditor = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

interface CodeEditorViewProps {
  document: DocumentMeta;
  collabManager: CollabManager;
  onLanguageChange: (newLang: SupportedLanguage) => void;
  onOpenQuickOpen?: () => void;
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenShortcuts?: () => void;
}

export const CodeEditorView: React.FC<CodeEditorViewProps> = ({
  document,
  collabManager,
  onLanguageChange,
  onOpenQuickOpen,
  onToggleSidebar,
  onSave,
  onOpenShortcuts,
}) => {
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const [showMinimap, setShowMinimap] = useState(!isSmallScreen);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>(isSmallScreen ? 'on' : 'off');

  const langConfig = useMemo(() => getLanguageConfig(document.language), [document.language]);

  // Compiler Flags state
  const [compilerFlags, setCompilerFlags] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      let saved = localStorage.getItem(`forge_flags_${document.language}`);
      if (saved !== null) {
        if (document.language === 'typescript' && saved.includes('es2022')) {
          saved = saved.replace(/es2022/g, 'es2020');
          localStorage.setItem(`forge_flags_${document.language}`, saved);
        }
        return saved;
      }
    }
    return langConfig.defaultCompilerFlags || '';
  });

  // Keep flags updated when switching languages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let saved = localStorage.getItem(`forge_flags_${document.language}`);
      if (saved !== null) {
        if (document.language === 'typescript' && saved.includes('es2022')) {
          saved = saved.replace(/es2022/g, 'es2020');
          localStorage.setItem(`forge_flags_${document.language}`, saved);
        }
        setCompilerFlags(saved);
        return;
      }
    }
    setCompilerFlags(langConfig.defaultCompilerFlags || '');
  }, [document.language, langConfig.defaultCompilerFlags]);

  const handleUpdateCompilerFlags = (flags: string) => {
    setCompilerFlags(flags);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`forge_flags_${document.language}`, flags);
    }
  };

  // Execution & Compiler Terminal States
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalTab, setTerminalTab] = useState<'output' | 'compiler' | 'stdin' | 'flags' | 'preview'>('output');
  const [isRunning, setIsRunning] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [stdinInput, setStdinInput] = useState('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [isFlagsModalOpen, setIsFlagsModalOpen] = useState(false);

  // Sync Compiler Diagnostics to Monaco Editor Markers (Red / Yellow squigglies)
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    if (executionResult?.diagnostics && executionResult.diagnostics.length > 0) {
      const markers = executionResult.diagnostics.map((d) => ({
        startLineNumber: Math.max(1, d.line),
        startColumn: Math.max(1, d.column || 1),
        endLineNumber: Math.max(1, d.line),
        endColumn: Math.max(1, (d.column || 1) + 60),
        message: d.message,
        severity: d.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
      }));
      monaco.editor.setModelMarkers(model, 'compiler', markers);
    } else if (executionResult?.status === 'success') {
      monaco.editor.setModelMarkers(model, 'compiler', []);
    }
  }, [executionResult]);

  // Jump to specific line from compiler error click
  const handleJumpToLine = (lineNumber: number, column = 1) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(lineNumber);
      editorRef.current.setPosition({ lineNumber, column });
      editorRef.current.focus();
    }
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme('forge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '62677b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8' },
        { token: 'string', foreground: '38bdf8' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'type', foreground: 'a78bfa' },
      ],
      colors: {
        'editor.background': '#0c0d10',
        'editor.foreground': '#e4e4e7',
        'editorCursor.foreground': '#818cf8',
        'editor.lineHighlightBackground': '#15161e',
        'editorLineNumber.foreground': '#434757',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editor.selectionBackground': '#2b2e3d',
        'editorGutter.background': '#0c0d10',
      },
    });
    monaco.editor.setTheme('forge-dark');

    bindYjsToMonaco(editor);

    editor.onDidChangeCursorPosition((e: any) => {
      collabManager.setLocalCursor(document.id, e.position.lineNumber, e.position.column);
    });

    // Dynamic Customizable Keyboard Shortcuts Listener for Monaco
    editor.onKeyDown((e: any) => {
      const raw = e.browserEvent as KeyboardEvent;
      if (!raw) return;
      const bindings = loadKeybindings();

      // Compile & Run Program
      const runBinding = bindings.find((b) => b.id === 'runProgram');
      if (runBinding && matchesKeybinding(raw, runBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        handleRunCode();
        return;
      }

      // Compile / Build Only (Ctrl+Shift+B)
      const compileBinding = bindings.find((b) => b.id === 'compileProgram');
      if (compileBinding && matchesKeybinding(raw, compileBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        handleCompileOnly();
        return;
      }

      // Quick Open
      const quickOpenBinding = bindings.find((b) => b.id === 'quickOpen');
      if (quickOpenBinding && matchesKeybinding(raw, quickOpenBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        onOpenQuickOpen?.();
        return;
      }

      // Toggle Sidebar
      const toggleSidebarBinding = bindings.find((b) => b.id === 'toggleSidebar');
      if (toggleSidebarBinding && matchesKeybinding(raw, toggleSidebarBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        onToggleSidebar?.();
        return;
      }

      // Save
      const saveBinding = bindings.find((b) => b.id === 'save');
      if (saveBinding && matchesKeybinding(raw, saveBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        onSave?.();
        return;
      }

      // Toggle Terminal
      const terminalBinding = bindings.find((b) => b.id === 'toggleTerminal');
      if (terminalBinding && matchesKeybinding(raw, terminalBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        setIsTerminalOpen((prev) => !prev);
        return;
      }

      // Toggle Word Wrap
      const wordWrapBinding = bindings.find((b) => b.id === 'toggleWordWrap');
      if (wordWrapBinding && matchesKeybinding(raw, wordWrapBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        setWordWrap((prev) => (prev === 'on' ? 'off' : 'on'));
        return;
      }

      // Delete Line
      const deleteLineBinding = bindings.find((b) => b.id === 'deleteLine');
      if (deleteLineBinding && matchesKeybinding(raw, deleteLineBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        editor.getAction('editor.action.deleteLines')?.run();
        return;
      }

      // Format Document
      const formatBinding = bindings.find((b) => b.id === 'formatDocument');
      if (formatBinding && matchesKeybinding(raw, formatBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        editor.getAction('editor.action.formatDocument')?.run();
        return;
      }

      // Keyboard Shortcuts Palette
      const shortcutsBinding = bindings.find((b) => b.id === 'openShortcuts');
      if (shortcutsBinding && matchesKeybinding(raw, shortcutsBinding.combo)) {
        e.preventDefault();
        e.stopPropagation();
        onOpenShortcuts?.();
        return;
      }
    });
  };

  const bindYjsToMonaco = (editor: MonacoEditor) => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const ytext = collabManager.getText(document.id);
    const model = editor.getModel();

    if (model) {
      bindingRef.current = new MonacoBinding(
        ytext,
        model as any,
        new Set([editor as any]),
        collabManager.awareness,
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

  // Execute current program (Compile & Run)
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
      const result = await runProgram(code, document.language, {
        stdin: stdinInput,
        compilerFlags,
        compileOnly: false,
      });
      setExecutionResult(result);
      if (result.compileOutput && (result.compileStatus === 'error' || result.diagnostics?.length)) {
        setTerminalTab('compiler');
      }
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

  // Compile / Build current program without executing
  const handleCompileOnly = async () => {
    const ytext = collabManager.getText(document.id);
    const code = ytext.toString();

    setIsTerminalOpen(true);
    setTerminalTab('compiler');
    setIsBuilding(true);
    setExecutionResult(null);

    try {
      const result = await compileProgram(code, document.language, compilerFlags);
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionResult({
        stdout: '',
        stderr: err?.message || 'Compilation build error occurred.',
        compileOutput: err?.message || 'Compilation failed.',
        compileStatus: 'error',
        exitCode: 1,
        status: 'error',
        runnerName: 'Compiler',
        isCompileOnly: true,
      });
    } finally {
      setIsBuilding(false);
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
    <div className="flex flex-col h-full bg-[#0c0d10] overflow-hidden relative">
      {/* Code Editor Header Bar */}
      <div className="h-9 px-3 border-b border-[#1e2029] flex items-center justify-between shrink-0 gap-2 bg-[#0e0f13]">
        <div className="flex items-center gap-2 shrink-0">
          <Code2 className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className="text-xs font-mono text-zinc-200 truncate max-w-[130px] sm:max-w-none">
            {document.name}
          </span>
          <span className="text-[10px] font-mono text-zinc-400 uppercase px-1.5 py-0.5 rounded bg-[#14151b] border border-[#23252f] hidden sm:inline">
            {langConfig.label}
          </span>

          {/* Active Compiler Indicator Badge */}
          {langConfig.compilerName && (
            <button
              onClick={() => {
                setIsTerminalOpen(true);
                setTerminalTab('flags');
              }}
              className="hidden lg:flex items-center gap-1 text-[10px] font-mono text-indigo-300 hover:text-white px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
              title={`Compiler: ${langConfig.compilerName}. Click to configure compiler flags.`}
            >
              <Hammer className="w-2.5 h-2.5" />
              <span>{langConfig.compilerName.split(' ')[0]} {langConfig.compilerVersion || ''}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Build / Compile Only Button */}
          {langConfig.isCompiled && (
            <button
              onClick={handleCompileOnly}
              disabled={isBuilding || isRunning}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shadow-xs ${
                isBuilding
                  ? 'bg-[#181922] text-zinc-500 cursor-not-allowed border border-[#23252f]'
                  : 'bg-[#181922] hover:bg-[#202230] text-zinc-200 hover:text-white border border-[#282a38] active:scale-[0.98]'
              }`}
              title="Compile / Build file (Ctrl + Shift + B)"
            >
              {isBuilding ? (
                <RotateCcw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Hammer className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span className="hidden sm:inline">{isBuilding ? 'Building...' : 'Build'}</span>
              <span className="hidden xl:inline text-[9px] opacity-70 font-mono">⇧⌘B</span>
            </button>
          )}

          {/* Run Button (Compile & Run) */}
          <button
            onClick={handleRunCode}
            disabled={isRunning || isBuilding}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shadow-xs ${
              isRunning
                ? 'bg-[#181922] text-zinc-500 cursor-not-allowed border border-[#23252f]'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white font-medium border border-indigo-500 active:scale-[0.98]'
            }`}
            title="Compile & Run program (Ctrl + Enter)"
          >
            {isRunning ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Running...' : 'Run'}</span>
            <span className="hidden lg:inline text-[10px] opacity-75 font-mono">⌘↵</span>
          </button>

          {/* Toggle Terminal / Compiler drawer */}
          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={`px-2 py-1 rounded-md text-xs transition-colors flex items-center gap-1 border ${
              isTerminalOpen
                ? 'bg-[#181922] text-white border-[#2b2d3a]'
                : 'bg-[#121318] text-zinc-400 border-[#1e2029] hover:text-zinc-200 hover:bg-[#181922]'
            }`}
            title="Toggle Console & Compiler Output (Ctrl+`)"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline text-[11px]">Console</span>
            {executionResult?.diagnostics && executionResult.diagnostics.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            )}
          </button>

          {/* Compiler Flags Quick Trigger */}
          <button
            onClick={() => {
              setIsTerminalOpen(true);
              setTerminalTab('flags');
            }}
            className={`p-1 rounded-md text-xs transition-colors flex items-center border ${
              terminalTab === 'flags' && isTerminalOpen
                ? 'bg-[#181922] text-indigo-300 border-indigo-500/40'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-[#181922]'
            }`}
            title="Configure Compiler Flags & Standards"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Quick Shortcuts Helper Button */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#181922] transition-colors hidden sm:flex items-center"
              title="VS Code Shortcuts (Ctrl+?)"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-3 w-px bg-[#23252f] mx-0.5" />

          {/* Language Selector */}
          <select
            value={document.language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            aria-label="Language"
            className="bg-[#121318] border border-[#1e2029] rounded px-2 py-0.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/80 font-mono"
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
            className={`p-1 rounded text-xs transition-colors hidden sm:flex ${
              showMinimap ? 'bg-[#181922] text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Minimap"
            aria-label="Toggle Minimap"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Word wrap toggle */}
          <button
            onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
            className={`p-1 rounded text-xs transition-colors hidden sm:flex ${
              wordWrap === 'on' ? 'bg-[#181922] text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Word Wrap (Alt+Z)"
            aria-label="Toggle Word Wrap (Alt+Z)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0c0d10]">
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

      {/* Execution & Compiler Terminal Drawer */}
      {isTerminalOpen && (
        <div
          className={`border-t border-[#1e2029] bg-[#0c0d10] flex flex-col shrink-0 z-20 shadow-2xl transition-all duration-150 ${
            isTerminalMaximized ? 'h-[75%]' : 'h-64 sm:h-72'
          }`}
        >
          {/* Terminal Tabs & Toolbar */}
          <div className="h-8 px-3 border-b border-[#1e2029] bg-[#0e0f13] flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1">
              {/* Output Tab */}
              <button
                onClick={() => setTerminalTab('output')}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  terminalTab === 'output'
                    ? 'bg-[#181922] text-white border border-[#2b2d3a]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-3 h-3 text-indigo-400" />
                <span>Program Output</span>
                {executionResult && !executionResult.isCompileOnly && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      executionResult.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                )}
              </button>

              {/* Compiler Tab */}
              <button
                onClick={() => setTerminalTab('compiler')}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  terminalTab === 'compiler'
                    ? 'bg-[#181922] text-white border border-[#2b2d3a]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Hammer className="w-3 h-3 text-indigo-400" />
                <span>Compiler & Diagnostics</span>
                {executionResult?.compileStatus && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      executionResult.compileStatus === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                )}
              </button>

              {/* Stdin Tab */}
              <button
                onClick={() => setTerminalTab('stdin')}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  terminalTab === 'stdin'
                    ? 'bg-[#181922] text-white border border-[#2b2d3a]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Input (stdin)</span>
                {stdinInput && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </button>

              {/* Compiler Flags Tab */}
              <button
                onClick={() => setTerminalTab('flags')}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  terminalTab === 'flags'
                    ? 'bg-[#181922] text-white border border-[#2b2d3a]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sliders className="w-3 h-3 text-indigo-400" />
                <span>Compiler Flags</span>
                {compilerFlags && (
                  <span className="text-[10px] text-zinc-500 font-mono hidden md:inline truncate max-w-[80px]">
                    ({compilerFlags})
                  </span>
                )}
              </button>

              {/* Web Preview Tab */}
              {(langConfig.id === 'html' || langConfig.id === 'css' || langConfig.id === 'javascript') && (
                <button
                  onClick={() => setTerminalTab('preview')}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                    terminalTab === 'preview'
                      ? 'bg-[#181922] text-white border border-[#2b2d3a]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Globe className="w-3 h-3 text-indigo-400" />
                  <span>Web Preview</span>
                </button>
              )}
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1">
              {executionResult && (
                <button
                  onClick={() => setExecutionResult(null)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Clear console"
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
          <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed bg-[#0c0d10] select-text">
            {/* 1. Program Output Tab */}
            {terminalTab === 'output' && (
              <>
                {isRunning ? (
                  <div className="flex items-center gap-2 text-zinc-400 py-4 px-2">
                    <RotateCcw className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span>Compiling & executing {langConfig.label} program...</span>
                  </div>
                ) : executionResult ? (
                  <div className="space-y-3">
                    {/* Execution Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1e2029] text-[11px] text-zinc-400">
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

                    {/* Standard Error */}
                    {executionResult.stderr && (
                      <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300 whitespace-pre-wrap">
                        {executionResult.stderr}
                      </div>
                    )}

                    {/* Standard Output */}
                    {executionResult.stdout ? (
                      <div className="text-zinc-200 whitespace-pre-wrap font-mono">
                        {executionResult.stdout}
                      </div>
                    ) : (
                      !executionResult.stderr && (
                        <div className="text-zinc-500 italic">
                          (Program completed with no output to stdout)
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-500 py-4 px-2 space-y-1">
                    <div>Click <span className="text-indigo-400 font-medium">Run ▶</span> or press <kbd className="px-1.5 py-0.5 rounded bg-[#14151b] border border-[#23252f] text-zinc-300">Ctrl+Enter</kbd> to compile & execute.</div>
                    <div className="text-[11px] text-zinc-600">Active compiler: {langConfig.compilerName || langConfig.label}</div>
                  </div>
                )}
              </>
            )}

            {/* 2. Compiler & Diagnostics Tab */}
            {terminalTab === 'compiler' && (
              <div className="space-y-3">
                {isBuilding ? (
                  <div className="flex items-center gap-2 text-zinc-400 py-4 px-2">
                    <RotateCcw className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span>Running compiler build ({langConfig.compilerName || langConfig.label})...</span>
                  </div>
                ) : executionResult ? (
                  <div className="space-y-3">
                    {/* Compiler Summary Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-[#14151b] border border-[#23252f] text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">
                          {executionResult.compilerName || langConfig.compilerName || langConfig.label}
                        </span>
                        <span className="text-zinc-600">·</span>
                        {executionResult.compileStatus === 'error' ? (
                          <span className="flex items-center gap-1 text-rose-400 font-medium">
                            <AlertCircle className="w-3 h-3" />
                            Compilation Failed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Build Passed
                          </span>
                        )}
                      </div>

                      {compilerFlags && (
                        <div className="text-zinc-400 font-mono text-[10px]">
                          Flags: <span className="text-zinc-300">{compilerFlags}</span>
                        </div>
                      )}
                    </div>

                    {/* Interactive Clickable Diagnostics */}
                    {executionResult.diagnostics && executionResult.diagnostics.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                          Parsed Diagnostics ({executionResult.diagnostics.length}) - Click to jump
                        </div>
                        {executionResult.diagnostics.map((diag, dIdx) => (
                          <button
                            key={dIdx}
                            onClick={() => handleJumpToLine(diag.line, diag.column)}
                            className={`w-full text-left p-2 rounded border text-xs font-mono transition-colors flex items-start gap-2 ${
                              diag.severity === 'error'
                                ? 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-900/50 text-rose-200'
                                : 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-900/50 text-amber-200'
                            }`}
                          >
                            <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold bg-[#0c0d10] border border-[#23252f] shrink-0">
                              Line {diag.line}{diag.column ? `:${diag.column}` : ''}
                            </span>
                            <span className="flex-1 truncate">{diag.message}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Raw Compiler Output */}
                    {executionResult.compileOutput ? (
                      <div className="p-3 rounded bg-[#0c0d10] border border-[#1e2029] space-y-1">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Raw Compiler Log</div>
                        <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                          {executionResult.compileOutput}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-zinc-500 italic py-2">
                        Compiler finished with zero warnings or errors. Binary ready for execution.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-500 py-4 px-2 space-y-1">
                    <div>Click <span className="text-indigo-400 font-medium">Build (Ctrl+Shift+B)</span> to run the compiler for syntax checks and diagnostics.</div>
                    <div className="text-[11px] text-zinc-600">Supports GCC, Clang, rustc, tsc, javac, Go build, and C# compilers.</div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Stdin Tab */}
            {terminalTab === 'stdin' && (
              <div className="h-full flex flex-col space-y-2">
                <div className="text-zinc-400 text-[11px]">
                  Provide standard input (stdin) passed to your compiled program when reading from keyboard/terminal.
                </div>
                <textarea
                  value={stdinInput}
                  onChange={(e) => setStdinInput(e.target.value)}
                  placeholder="Type stdin input here..."
                  className="flex-1 w-full p-2 bg-[#121318] border border-[#1e2029] rounded text-zinc-200 font-mono text-xs focus:outline-none focus:border-indigo-500/80 resize-none"
                />
              </div>
            )}

            {/* 4. Compiler Flags & Standards Tab */}
            {terminalTab === 'flags' && (
              <div className="h-full flex flex-col space-y-4 max-w-xl">
                <div>
                  <div className="text-zinc-200 font-semibold text-xs mb-1">
                    Compiler Configuration for {langConfig.label}
                  </div>
                  <div className="text-zinc-500 text-[11px]">
                    Toolchain: <span className="text-zinc-300 font-mono">{langConfig.compilerName || 'Standard Interpreter'}</span>
                  </div>
                </div>

                {/* Preset Flags */}
                {langConfig.compilerPresets && langConfig.compilerPresets.length > 0 && (
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-medium mb-1.5">
                      Recommended Optimization & Standard Presets
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {langConfig.compilerPresets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleUpdateCompilerFlags(preset.flags)}
                          className={`p-2 rounded-md border text-left text-xs transition-colors ${
                            compilerFlags === preset.flags
                              ? 'bg-[#181922] border-indigo-500 text-white'
                              : 'bg-[#121318] border-[#1e2029] text-zinc-400 hover:text-zinc-200 hover:bg-[#181922]'
                          }`}
                        >
                          <div className="font-medium text-zinc-200">{preset.label}</div>
                          <div className="text-[10px] font-mono text-zinc-500 truncate">{preset.flags || '(default)'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Flags Input */}
                <div>
                  <label className="block text-zinc-400 text-[11px] font-medium mb-1.5">
                    Custom Compiler Flags / CLI Arguments
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={compilerFlags}
                      onChange={(e) => handleUpdateCompilerFlags(e.target.value)}
                      placeholder="e.g. -std=c++20 -O2 -Wall -Wextra"
                      className="flex-1 px-3 py-1.5 bg-[#121318] border border-[#1e2029] rounded text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateCompilerFlags(langConfig.defaultCompilerFlags || '')}
                      className="px-2.5 py-1.5 rounded bg-[#181922] hover:bg-[#222432] border border-[#23252f] text-zinc-300 text-xs transition-colors shrink-0"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Flags are passed directly to the compiler when building or executing this file.
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleCompileOnly}
                    className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>Test Build with Flags</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. Web Preview Tab */}
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
