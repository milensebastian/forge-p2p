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
  Quote,
  Columns,
  Maximize2,
  BookOpen,
} from 'lucide-react';

interface MarkdownEditorViewProps {
  document: DocumentMeta;
  collabManager: CollabManager;
}

type ViewMode = 'split' | 'editor' | 'preview';

const LOCAL_ORIGIN = 'markdown-local';

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

  const renderedHtml = React.useMemo(() => {
    try {
      return marked.parse(content || '', { async: false, gfm: true, breaks: true }) as string;
    } catch {
      return '<p class="text-zinc-500">Failed to render markdown</p>';
    }
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-[#0c0d10]">
      {/* Markdown Sub-toolbar */}
      <div className="h-9 px-3 border-b border-[#1e2029] flex items-center justify-between shrink-0 gap-2 bg-[#0e0f13]">
        {/* Quick Format Tools */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => insertFormatting('**', '**', 'bold')}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#181922] transition-colors"
            title="Bold"
            aria-label="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('*', '*', 'italic')}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#181922] transition-colors"
            title="Italic"
            aria-label="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('# ', '', 'Heading 1')}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#181922] transition-colors"
            title="Heading 1"
            aria-label="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('## ', '', 'Heading 2')}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#181922] transition-colors"
            title="Heading 2"
            aria-label="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('`', '`', 'code')}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#181922] transition-colors"
            title="Inline Code"
            aria-label="Inline Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('- ', '', 'List item')}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#181922] transition-colors hidden sm:flex"
            title="Bullet List"
            aria-label="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('> ', '', 'Quote')}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#181922] transition-colors hidden sm:flex"
            title="Quote"
            aria-label="Quote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex items-center gap-2">
          {/* Desktop 3-Way Switch */}
          <div className="hidden md:flex items-center bg-[#121318] border border-[#1e2029] rounded-md p-0.5">
            <button
              onClick={() => setViewMode('editor')}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === 'editor' ? 'bg-[#181922] text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Editor only"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === 'split' ? 'bg-[#181922] text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Split view"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === 'preview' ? 'bg-[#181922] text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Preview only"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile 2-Way Switch */}
          <div className="flex md:hidden items-center bg-[#121318] border border-[#1e2029] rounded-md p-0.5">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                viewMode !== 'preview' ? 'bg-[#181922] text-white' : 'text-zinc-400'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'preview' ? 'bg-[#181922] text-white' : 'text-zinc-400'
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Editor & Preview Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'split' && (
          <SplitPane
            initialRatio={0.5}
            left={
              <div className="h-full flex flex-col bg-[#0c0d10]">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleTextChange}
                  placeholder="Start writing markdown..."
                  className="w-full h-full p-4 sm:p-6 bg-transparent text-zinc-200 font-mono text-sm leading-relaxed resize-none focus:outline-none placeholder-zinc-700 selection:bg-indigo-500/30"
                  spellCheck={false}
                />
              </div>
            }
            right={
              <div className="h-full overflow-y-auto p-4 sm:p-6 bg-[#0c0d10] border-l border-[#1e2029]">
                <div
                  className="markdown-body max-w-2xl mx-auto"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            }
          />
        )}

        {viewMode === 'editor' && (
          <div className="h-full flex flex-col bg-[#0c0d10]">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              placeholder="Start writing markdown..."
              className="w-full h-full p-4 sm:p-6 bg-transparent text-zinc-200 font-mono text-sm leading-relaxed resize-none focus:outline-none placeholder-zinc-700 selection:bg-indigo-500/30"
              spellCheck={false}
            />
          </div>
        )}

        {viewMode === 'preview' && (
          <div className="h-full overflow-y-auto p-4 sm:p-8 bg-[#0c0d10]">
            <div
              className="markdown-body max-w-3xl mx-auto"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
