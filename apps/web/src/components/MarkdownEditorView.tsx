import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { CollabManager } from '@forge/collaboration';
import { DocumentMeta } from '@forge/core';
import { SplitPane } from '@forge/ui';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Code,
  List,
  ListOrdered,
  Quote,
  Columns,
  Maximize2,
  BookOpen,
  FileText,
  Eye,
  PenTool,
} from 'lucide-react';

interface MarkdownEditorViewProps {
  document: DocumentMeta;
  collabManager: CollabManager;
}

type ViewMode = 'split' | 'editor' | 'preview';

const LOCAL_ORIGIN = 'markdown-local';

/** Compute the minimal index, deleteLength, and insertText between old and new strings */
function computeStringDiff(oldStr: string, newStr: string) {
  let start = 0;
  while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
    start++;
  }

  let oldEnd = oldStr.length;
  let newEnd = newStr.length;
  while (oldEnd > start && newEnd > start && oldStr[oldEnd - 1] === newStr[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  return {
    index: start,
    deleteLength: oldEnd - start,
    insertText: newStr.slice(start, newEnd),
  };
}

export const MarkdownEditorView: React.FC<MarkdownEditorViewProps> = ({
  document,
  collabManager,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'editor';
    }
    return 'split';
  });
  const [content, setContent] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevContentRef = useRef<string>('');

  // Bind Yjs Y.Text to local state
  useEffect(() => {
    const ytext = collabManager.getText(document.id);
    const initialContent = ytext.toString();
    setContent(initialContent);
    prevContentRef.current = initialContent;

    const observer = (event: any) => {
      // Ignore edits that originated from this local textarea
      if (event.transaction && event.transaction.origin === LOCAL_ORIGIN) return;

      const newVal = ytext.toString();
      prevContentRef.current = newVal;
      setContent(newVal);
    };

    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
    };
  }, [document.id, collabManager]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setContent(newText);

    const oldText = prevContentRef.current;
    const diff = computeStringDiff(oldText, newText);

    if (diff.deleteLength > 0 || diff.insertText.length > 0) {
      const ytext = collabManager.getText(document.id);
      collabManager.ydoc.transact(() => {
        if (diff.deleteLength > 0) {
          ytext.delete(diff.index, diff.deleteLength);
        }
        if (diff.insertText.length > 0) {
          ytext.insert(diff.index, diff.insertText);
        }
      }, LOCAL_ORIGIN);
      prevContentRef.current = newText;
    }

    // Update cursor position in awareness
    const cursorIndex = e.target.selectionStart;
    const lines = newText.substring(0, cursorIndex).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    collabManager.setLocalCursor(document.id, line, col);
  };

  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    const ytext = collabManager.getText(document.id);
    collabManager.ydoc.transact(() => {
      const deleteLen = end - start;
      if (deleteLen > 0) {
        ytext.delete(start, deleteLen);
      }
      ytext.insert(start, replacement);
    }, LOCAL_ORIGIN);
    prevContentRef.current = newContent;

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  // Safe HTML output from marked
  const renderedHtml = React.useMemo(() => {
    try {
      return marked.parse(content || '', { async: false, gfm: true, breaks: true }) as string;
    } catch {
      return '<p class="text-rose-400">Failed to render markdown</p>';
    }
  }, [content]);

  // Stats
  const wordCount = (content.trim().match(/\S+/g) || []).length;
  const lineCount = content.split('\n').length;

  return (
    <div className="flex flex-col h-full bg-[#0c0e14]">
      {/* Markdown Toolbar */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-zinc-900/80 border-b border-zinc-800 shrink-0 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-mono font-medium text-zinc-200 mr-1 sm:mr-2 max-w-[100px] sm:max-w-none truncate">
            {document.name}
          </span>

          <div className="h-4 w-px bg-zinc-800 mx-1 hidden sm:block" />

          {/* Quick Format Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => insertFormatting('**', '**', 'bold text')}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Bold"
              aria-label="Bold text"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('*', '*', 'italic text')}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Italic"
              aria-label="Italic text"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('# ', '', 'Heading 1')}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Heading 1"
              aria-label="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('## ', '', 'Heading 2')}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Heading 2"
              aria-label="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('`', '`', 'code')}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Inline Code"
              aria-label="Inline Code"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('> ', '', 'Quote')}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors hidden sm:flex"
              title="Blockquote"
              aria-label="Blockquote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('- ', '', 'List item')}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors hidden sm:flex"
              title="Bulleted List"
              aria-label="Bulleted List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('1. ', '', 'Numbered item')}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors hidden sm:flex"
              title="Numbered List"
              aria-label="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-zinc-500 hidden md:inline">
            {wordCount} words • {lineCount} lines
          </span>

          {/* Desktop 3-Way Switcher */}
          <div className="hidden md:flex items-center bg-zinc-950 border border-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('editor')}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === 'editor' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Editor Only"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === 'split' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Split View"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === 'preview' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Preview Only"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile 2-Tab Segmented Control */}
          <div className="flex md:hidden items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode !== 'preview' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PenTool className="w-3 h-3" />
              <span>Write</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'preview' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'split' && (
          <SplitPane
            initialRatio={0.5}
            left={
              <div className="h-full flex flex-col bg-[#0c0e14]">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleTextChange}
                  placeholder="Type Markdown documentation here... Keystrokes sync via Yjs CRDT."
                  className="w-full h-full p-3 sm:p-4 bg-transparent text-zinc-200 font-mono text-base sm:text-sm leading-relaxed resize-none focus:outline-none placeholder-zinc-600 selection:bg-emerald-500/30 touch-manipulation"
                  spellCheck={false}
                />
              </div>
            }
            right={
              <div className="h-full overflow-y-auto p-4 sm:p-6 bg-zinc-950/60">
                <div
                  className="markdown-body max-w-3xl mx-auto"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            }
          />
        )}

        {viewMode === 'editor' && (
          <div className="h-full flex flex-col bg-[#0c0e14]">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              placeholder="Type Markdown documentation here..."
              className="w-full h-full p-4 sm:p-6 bg-transparent text-zinc-200 font-mono text-base sm:text-sm leading-relaxed resize-none focus:outline-none placeholder-zinc-600 selection:bg-emerald-500/30 touch-manipulation"
              spellCheck={false}
            />
          </div>
        )}

        {viewMode === 'preview' && (
          <div className="h-full overflow-y-auto p-4 sm:p-8 bg-zinc-950">
            <div
              className="markdown-body max-w-4xl mx-auto"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
