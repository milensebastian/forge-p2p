import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DocumentMeta,
  DocumentType,
  SupportedLanguage,
  Participant,
  MeshStatus,
  formatRoomUrl,
  getLanguageConfig,
} from '@forge/core';
import { CollabManager } from '@forge/collaboration';
import { Avatar, Tooltip } from '@forge/ui';
import { CodeEditorView } from './CodeEditorView';
import { MarkdownEditorView } from './MarkdownEditorView';
import { ParticipantDrawer } from './ParticipantDrawer';
import { SecurityModal } from './SecurityModal';
import { NewDocModal } from './NewDocModal';
import { ConnectModal } from './ConnectModal';
import { QuickOpenModal } from './QuickOpenModal';
import { ShortcutsModal } from './ShortcutsModal';
import {
  Code2,
  FileCode,
  FileText,
  Plus,
  Trash2,
  Copy,
  Check,
  Users,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  QrCode,
  FolderOpen,
  X,
  Search,
  Keyboard,
  CheckCircle2,
} from 'lucide-react';

interface WorkspaceViewProps {
  roomId: string;
  userName: string;
  userColor: string;
  onLeave: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  roomId,
  userName,
  userColor,
  onLeave,
}) => {
  const [collabManager, setCollabManager] = useState<CollabManager | null>(null);
  const [files, setFiles] = useState<DocumentMeta[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('doc-readme');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [meshStatus, setMeshStatus] = useState<MeshStatus>({
    state: 'disconnected',
    peerCount: 0,
    maxPeers: 5,
    signalingConnected: false,
    persistedToIndexedDB: false,
    overallConnectionStatus: 'connecting',
    turnConfigured: false,
    peersDiagnostics: [],
  });

  const [isCopied, setIsCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });
  const [isParticipantDrawerOpen, setIsParticipantDrawerOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const managerRef = useRef<CollabManager | null>(null);
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize CollabManager for this workspace room
  useEffect(() => {
    if (destroyTimerRef.current) {
      clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }

    if (managerRef.current && managerRef.current.roomId === roomId) {
      if (typeof window !== 'undefined') {
        (window as any).__forgeCollab = managerRef.current;
      }
      setCollabManager(managerRef.current);
      setFiles(managerRef.current.getFiles());
      return;
    }

    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }

    const manager = new CollabManager(
      {
        roomId,
        localUser: {
          name: userName,
          color: userColor,
          activeDocId: 'doc-readme',
        },
      },
      {
        onStatusChange: (status) => {
          setMeshStatus((prev) => ({
            ...prev,
            state: status.state,
            peerCount: status.connectedPeers,
            signalingConnected: status.signalingConnected,
            persistedToIndexedDB: status.persistedToIndexedDB,
            error: status.error,
            overallConnectionStatus: status.overallConnectionStatus,
            activeCandidateType: status.activeCandidateType,
            turnConfigured: status.turnConfigured,
            iceServers: status.iceServers,
            peersDiagnostics: status.peersDiagnostics,
          }));
        },
        onParticipantsChange: (pList) => {
          setParticipants(pList);
        },
        onFilesChange: (fList) => {
          setFiles(fList);
          if (fList.length > 0 && !fList.some((f) => f.id === activeDocId)) {
            setActiveDocId(fList[0].id);
          }
        },
        onIndexedDBSynced: () => {
          setMeshStatus((prev) => ({ ...prev, persistedToIndexedDB: true }));
        },
      }
    );

    managerRef.current = manager;
    if (typeof window !== 'undefined') {
      (window as any).__forgeCollab = manager;
    }
    setCollabManager(manager);
    setFiles(manager.getFiles());

    return () => {
      destroyTimerRef.current = setTimeout(() => {
        if (managerRef.current) {
          managerRef.current.destroy();
          managerRef.current = null;
          setCollabManager(null);
        }
      }, 150);
    };
  }, [roomId, userName, userColor]);

  // Global VS Code keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // 1. Quick Open (Ctrl+P / Cmd+P)
      if (isMod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsQuickOpenOpen(true);
        return;
      }

      // 2. Toggle Sidebar (Ctrl+B / Cmd+B)
      if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }

      // 3. Save (Ctrl+S / Cmd+S)
      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerSaveFeedback();
        return;
      }

      // 4. New Document (Ctrl+Shift+N / Cmd+Shift+N)
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewDocModalOpen(true);
        return;
      }

      // 5. Shortcuts Reference (Ctrl+? / Cmd+? or F1)
      if ((isMod && (e.key === '?' || (e.shiftKey && e.key === '/'))) || e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update awareness when active document changes
  useEffect(() => {
    if (collabManager && activeDocId) {
      collabManager.setLocalActiveDoc(activeDocId);
    }
  }, [activeDocId, collabManager]);

  const activeDoc = useMemo(() => {
    return files.find((f) => f.id === activeDocId) || files[0];
  }, [files, activeDocId]);

  const triggerSaveFeedback = () => {
    setSaveToast('Saved to IndexedDB & Mesh');
    setTimeout(() => setSaveToast(null), 2000);
  };

  const handleCopyLink = () => {
    const shareUrl = formatRoomUrl(roomId);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => fallbackCopy(shareUrl));
    } else {
      fallbackCopy(shareUrl);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch {
      // Ignore copy error
    }
    document.body.removeChild(textArea);
  };

  const handleSelectDoc = (docId: string) => {
    setActiveDocId(docId);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleCreateFile = (name: string, type: DocumentType, language: SupportedLanguage) => {
    if (!collabManager) return;
    const initialText =
      type === 'markdown'
        ? `# ${name}\n\nStart writing documentation here...`
        : getLanguageConfig(language).boilerplate;
    const newDoc = collabManager.addFile(name, type, language, initialText);
    setActiveDocId(newDoc.id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteFile = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) {
      alert('Workspace must contain at least one document.');
      return;
    }
    if (confirm('Delete this file for all peers in the workspace?')) {
      collabManager?.deleteFile(docId);
    }
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    if (!collabManager || !activeDoc) return;
    const existing = collabManager.filesMap.get(activeDoc.id);
    if (existing) {
      collabManager.ydoc.transact(() => {
        collabManager.filesMap.set(activeDoc.id, {
          ...existing,
          language: newLang,
          updatedAt: Date.now(),
        });
      });
    }
  };

  const docsList = files.filter((f) => f.type === 'markdown');
  const codeList = files.filter((f) => f.type === 'code');

  // Render minimalist connection indicator
  const renderConnectionPill = () => {
    let dotClass = 'bg-zinc-500';
    let text = 'Connecting...';

    if (meshStatus.overallConnectionStatus === 'connected-turn') {
      dotClass = 'bg-purple-400';
      text = `Relay Mesh (${meshStatus.peerCount + 1}/5)`;
    } else if (meshStatus.overallConnectionStatus === 'connected-p2p' || meshStatus.peerCount > 0) {
      dotClass = 'bg-emerald-400';
      text = `P2P Mesh (${meshStatus.peerCount + 1}/5)`;
    } else if (meshStatus.overallConnectionStatus === 'reconnecting') {
      dotClass = 'bg-amber-400 animate-pulse';
      text = 'Reconnecting...';
    } else if (meshStatus.overallConnectionStatus === 'failed') {
      dotClass = 'bg-rose-400';
      text = 'Failed';
    } else if (meshStatus.signalingConnected) {
      dotClass = 'bg-emerald-500/80';
      text = 'Ready for peers (1/5)';
    }

    return (
      <button
        onClick={() => setIsParticipantDrawerOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
        title="View WebRTC diagnostics"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <span className="font-mono text-[11px]">{text}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] relative">
      {/* Top Header */}
      <header className="h-11 border-b border-zinc-850 bg-zinc-950 px-3 flex items-center justify-between shrink-0 select-none z-30 gap-2">
        {/* Left Side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile / Desktop Sidebar Toggle (Ctrl+B) */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
            title="Toggle File Explorer (Ctrl+B)"
            aria-label="Toggle File Explorer"
          >
            <FolderOpen className="w-4 h-4 text-zinc-300" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Code2 className="w-3 h-3" />
            </div>
            <span className="font-semibold text-xs tracking-tight text-white hidden sm:inline">FORGE</span>
          </div>

          <div className="h-3.5 w-px bg-zinc-800 hidden sm:block mx-0.5" />

          {/* Quick Open File Button (Ctrl+P) */}
          <button
            onClick={() => setIsQuickOpenOpen(true)}
            className="hidden sm:flex items-center gap-1.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded-md text-xs transition-colors"
            title="Quick Open File (Ctrl+P)"
          >
            <Search className="w-3 h-3 text-zinc-500" />
            <span className="text-[11px]">Go to file...</span>
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 ml-1">⌘P</kbd>
          </button>

          {/* Room ID Pill */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-md text-xs">
            <span className="font-mono text-[11px] text-zinc-300 max-w-[85px] sm:max-w-[140px] md:max-w-[180px] truncate">
              {roomId}
            </span>
            <button
              onClick={handleCopyLink}
              className="p-0.5 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Copy share URL"
              aria-label="Copy share link"
            >
              {isCopied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Share / Invite Button */}
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 font-medium"
            title="Share room or scan QR code"
          >
            <QrCode className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Center: Minimal Connection State */}
        <div className="hidden md:flex items-center">
          {renderConnectionPill()}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Overlapping Avatars */}
          <div
            onClick={() => setIsParticipantDrawerOpen(true)}
            className="flex items-center -space-x-1 cursor-pointer p-0.5 rounded-md hover:bg-zinc-900 transition-colors"
            title="View participants & diagnostics"
          >
            {participants.slice(0, 5).map((p) => (
              <Avatar
                key={p.id}
                name={p.name}
                color={p.color}
                size="sm"
                isLocal={p.isLocal}
                className="ring-2 ring-zinc-950 w-5 h-5 text-[9px]"
              />
            ))}
          </div>

          {/* Participant count trigger */}
          <button
            onClick={() => setIsParticipantDrawerOpen(!isParticipantDrawerOpen)}
            className="text-zinc-400 hover:text-white px-1.5 py-1 rounded-md hover:bg-zinc-850 transition-colors flex items-center gap-1 text-xs"
            title="Diagnostics"
          >
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono text-[11px]">{participants.length}</span>
          </button>

          <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />

          {/* Keyboard Shortcuts Trigger (Ctrl+?) */}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors hidden sm:block"
            title="VS Code Shortcuts (Ctrl+?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Security info */}
          <button
            onClick={() => setIsSecurityModalOpen(true)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
            title="Security info"
            aria-label="Security info"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>

          {/* Leave Workspace */}
          <button
            onClick={onLeave}
            className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-zinc-850 transition-colors"
            title="Leave workspace"
            aria-label="Leave workspace"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Floating Save Toast Notification */}
      {saveToast && (
        <div className="fixed top-14 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-750 text-zinc-200 text-xs rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar: File Explorer */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40 md:z-20
            ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0'}
            bg-zinc-950 border-r border-zinc-850 flex flex-col shrink-0 transition-all duration-150 overflow-hidden shadow-xl md:shadow-none
          `}
        >
          {/* Sidebar Header */}
          <div className="h-9 px-3 border-b border-zinc-850 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Explorer
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsNewDocModalOpen(true)}
                className="p-1 rounded hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors"
                title="New File (Ctrl+Shift+N)"
                aria-label="New File"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1 rounded text-zinc-400 hover:text-white transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Document Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Source Code Section */}
            <div>
              <div className="text-[10px] uppercase font-medium text-zinc-500 px-2 mb-1 tracking-wider">
                Source Code ({codeList.length})
              </div>
              <div className="space-y-0.5">
                {codeList.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                      activeDoc?.id === doc.id
                        ? 'bg-zinc-850 text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate font-mono">{doc.name}</span>
                    </div>
                    {files.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteFile(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 transition-opacity"
                        title="Delete file"
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Documentation Section */}
            <div>
              <div className="text-[10px] uppercase font-medium text-zinc-500 px-2 mb-1 tracking-wider">
                Documentation ({docsList.length})
              </div>
              <div className="space-y-0.5">
                {docsList.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                      activeDoc?.id === doc.id
                        ? 'bg-zinc-850 text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                    {files.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteFile(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 transition-opacity"
                        title="Delete file"
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-2.5 border-t border-zinc-850 text-[10px] text-zinc-500 flex items-center justify-between font-mono">
            <span>IndexedDB</span>
            <span className="text-zinc-400">Yjs CRDT</span>
          </div>
        </aside>

        {/* Center: Editor Canvas */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
          {activeDoc && collabManager ? (
            activeDoc.type === 'markdown' ? (
              <MarkdownEditorView
                document={activeDoc}
                collabManager={collabManager}
              />
            ) : (
              <CodeEditorView
                document={activeDoc}
                collabManager={collabManager}
                onLanguageChange={handleLanguageChange}
                onOpenQuickOpen={() => setIsQuickOpenOpen(true)}
                onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                onSave={triggerSaveFeedback}
                onOpenShortcuts={() => setIsShortcutsOpen(true)}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              Loading workspace...
            </div>
          )}
        </main>

        {/* Right: Participant & Mesh Drawer */}
        <ParticipantDrawer
          isOpen={isParticipantDrawerOpen}
          onClose={() => setIsParticipantDrawerOpen(false)}
          participants={participants}
          meshStatus={meshStatus}
          signalingUrl={collabManager?.signalingUrl || undefined}
          onRestartIce={() => collabManager?.restartIce()}
        />
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 border-t border-zinc-850 bg-zinc-950 px-3 flex items-center justify-between text-[11px] text-zinc-500 shrink-0 select-none z-30 font-mono overflow-hidden">
        <div className="flex items-center gap-2 truncate">
          <span className="text-zinc-300 truncate max-w-[140px] sm:max-w-none">
            {activeDoc?.name}
          </span>
          <span className="text-zinc-700">/</span>
          <span className="uppercase text-zinc-500">{activeDoc?.language}</span>
          <span className="text-zinc-700 hidden sm:inline">/</span>
          <span className="text-zinc-500 hidden sm:inline">UTF-8</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="hover:text-zinc-300 transition-colors flex items-center gap-1 hidden md:flex"
            title="Shortcuts reference"
          >
            <Keyboard className="w-3 h-3" />
            <span>Shortcuts</span>
          </button>

          <span className="text-zinc-700 hidden md:inline">/</span>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                meshStatus.overallConnectionStatus === 'connected-turn'
                  ? 'bg-purple-400'
                  : meshStatus.peerCount > 0
                  ? 'bg-emerald-400'
                  : meshStatus.signalingConnected
                  ? 'bg-emerald-500/80'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="text-zinc-400">
              {meshStatus.peerCount > 0
                ? `${meshStatus.peerCount} peer${meshStatus.peerCount > 1 ? 's' : ''}`
                : meshStatus.signalingConnected
                ? 'Signaling active'
                : 'Offline'}
            </span>
          </div>

          <span className="text-zinc-700 hidden sm:inline">/</span>

          <span className="hidden sm:inline text-zinc-500">
            Local-First
          </span>
        </div>
      </footer>

      {/* Modals */}
      <QuickOpenModal
        isOpen={isQuickOpenOpen}
        onClose={() => setIsQuickOpenOpen(false)}
        files={files}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <NewDocModal
        isOpen={isNewDocModalOpen}
        onClose={() => setIsNewDocModalOpen(false)}
        onCreate={handleCreateFile}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        roomId={roomId}
      />
    </div>
  );
};
