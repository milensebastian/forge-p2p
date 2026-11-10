import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DocumentMeta,
  DocumentType,
  SupportedLanguage,
  Participant,
  MeshStatus,
  formatRoomUrl,
} from '@forge/core';
import { CollabManager } from '@forge/collaboration';
import { Avatar, Badge, Button, Tooltip } from '@forge/ui';
import { CodeEditorView } from './CodeEditorView';
import { MarkdownEditorView } from './MarkdownEditorView';
import { ParticipantDrawer } from './ParticipantDrawer';
import { SecurityModal } from './SecurityModal';
import { NewDocModal } from './NewDocModal';
import { ConnectModal } from './ConnectModal';
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
  Database,
  Radio,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Menu,
  X,
  QrCode,
  FolderOpen,
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
  });

  const [isCopied, setIsCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });
  const [isParticipantDrawerOpen, setIsParticipantDrawerOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const managerRef = useRef<CollabManager | null>(null);
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize CollabManager for this workspace room
  useEffect(() => {
    // Cancel any scheduled destruction from StrictMode unmount
    if (destroyTimerRef.current) {
      clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }

    // If manager exists and is for this room, reuse it
    if (managerRef.current && managerRef.current.roomId === roomId) {
      if (typeof window !== 'undefined') {
        (window as any).__forgeCollab = managerRef.current;
      }
      setCollabManager(managerRef.current);
      setFiles(managerRef.current.getFiles());
      return;
    }

    // If an old manager exists for a different room, destroy it immediately
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
          }));
        },
        onParticipantsChange: (pList) => {
          setParticipants(pList);
        },
        onFilesChange: (fList) => {
          setFiles(fList);
          // If active document was deleted, fallback to first available
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

  // Update awareness when active document changes
  useEffect(() => {
    if (collabManager && activeDocId) {
      collabManager.setLocalActiveDoc(activeDocId);
    }
  }, [activeDocId, collabManager]);

  const activeDoc = useMemo(() => {
    return files.find((f) => f.id === activeDocId) || files[0];
  }, [files, activeDocId]);

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
      // Ignore copy error in non-interactive context
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
        : `// ${name}\n// Created in FORGE workspace\n\n`;
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
    if (confirm('Are you sure you want to delete this file for all peers in the workspace?')) {
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

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-[#090a0f] text-zinc-100 overflow-hidden font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Top Workspace Header */}
      <header className="h-12 border-b border-zinc-800 bg-[#0c0e14] px-2 sm:px-4 flex items-center justify-between shrink-0 select-none z-30 gap-2">
        {/* Left: Mobile Menu + Brand & Room Pill */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Toggle File Explorer"
            aria-label="Toggle File Explorer"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Code2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">FORGE</span>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Room ID Badge & Copy Link */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md text-xs">
            <span className="text-zinc-500 font-mono hidden md:inline">room:</span>
            <span className="font-mono font-medium text-emerald-400 max-w-[85px] sm:max-w-[140px] md:max-w-[200px] truncate">
              {roomId}
            </span>
            <button
              onClick={handleCopyLink}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-0.5"
              title="Copy share link for peers"
              aria-label="Copy share link"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Connect Mobile / QR Code Button */}
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-1 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 px-2 py-1 rounded-md text-xs transition-colors shrink-0 font-medium"
            title="Connect Phone or Tablet via QR Code"
            aria-label="Connect Mobile Device"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Connect Phone</span>
          </button>
        </div>

        {/* Center: Live Mesh Status & IndexedDB Badge (Desktop) */}
        <div className="hidden lg:flex items-center gap-3">
          <Badge
            variant={
              meshStatus.state === 'mesh-saturated'
                ? 'amber'
                : meshStatus.peerCount > 0
                ? 'emerald'
                : meshStatus.signalingConnected
                ? 'cyan'
                : 'zinc'
            }
            dot
          >
            {meshStatus.peerCount > 0
              ? `Mesh: ${meshStatus.peerCount + 1}/5 Peers Connected`
              : meshStatus.signalingConnected
              ? 'Mesh: Waiting for Peers (1/5)'
              : 'Mesh: Signaling Offline'}
          </Badge>

          <Tooltip content="All changes persisted locally to browser IndexedDB">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 px-2 py-0.5 rounded-full cursor-help">
              <HardDrive className="w-3 h-3 text-cyan-400" />
              <span>IndexedDB Synced</span>
            </span>
          </Tooltip>
        </div>

        {/* Right: Participants Avatars, Security & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Participants Avatar Stack (Hidden on very small screens) */}
          <div
            onClick={() => setIsParticipantDrawerOpen(true)}
            className="hidden sm:flex items-center -space-x-1.5 cursor-pointer p-1 rounded-lg hover:bg-zinc-800/60 transition-colors"
            title="Inspect connected participants and mesh status"
          >
            {participants.slice(0, 5).map((p) => (
              <Avatar
                key={p.id}
                name={p.name}
                color={p.color}
                size="sm"
                isLocal={p.isLocal}
                className="ring-2 ring-[#0c0e14]"
              />
            ))}
          </div>

          {/* Participant count button */}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setIsParticipantDrawerOpen(!isParticipantDrawerOpen)}
            className="text-zinc-400 hover:text-white min-h-[32px] px-2 flex items-center gap-1"
            icon={<Users className="w-3.5 h-3.5 text-emerald-400" />}
          >
            <span className="font-mono text-xs">{participants.length}/5</span>
          </Button>

          {/* Security Info */}
          <button
            onClick={() => setIsSecurityModalOpen(true)}
            className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Security & Privacy Model"
            aria-label="Security and Privacy Model"
          >
            <Shield className="w-4 h-4 text-zinc-400" />
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Leave Workspace */}
          <button
            onClick={onLeave}
            className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            title="Leave workspace"
            aria-label="Leave workspace"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for Sidebar Drawer */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar: File Explorer (Desktop Collapsible, Mobile Slide-over Drawer) */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40 md:z-20
            ${isSidebarOpen ? 'w-72 md:w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0'}
            bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 transition-all duration-200 overflow-hidden shadow-2xl md:shadow-none
          `}
        >
          {/* Sidebar Header */}
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Workspace Files
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsNewDocModalOpen(true)}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 hover:text-white transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                title="New Document"
                aria-label="New Document"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1 rounded text-zinc-400 hover:text-white transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                title="Close files menu"
                aria-label="Close files menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Documentation Section */}
            <div>
              <div className="text-[10px] uppercase font-semibold text-zinc-500 px-2 mb-1.5 tracking-wider">
                Documentation ({docsList.length})
              </div>
              <div className="space-y-0.5">
                {docsList.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className={`group flex items-center justify-between px-2.5 py-2 sm:py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                      activeDoc?.id === doc.id
                        ? 'bg-zinc-800 text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                    {files.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteFile(doc.id, e)}
                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                        title="Delete file"
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Source Code Section */}
            <div>
              <div className="text-[10px] uppercase font-semibold text-zinc-500 px-2 mb-1.5 tracking-wider">
                Source Code ({codeList.length})
              </div>
              <div className="space-y-0.5">
                {codeList.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className={`group flex items-center justify-between px-2.5 py-2 sm:py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                      activeDoc?.id === doc.id
                        ? 'bg-zinc-800 text-white font-medium'
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
                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                        title="Delete file"
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Footer info */}
          <div className="p-3 border-t border-zinc-800 bg-[#0c0e14] text-[11px] text-zinc-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Local Storage:</span>
              <span className="text-zinc-400 font-mono">IndexedDB</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sync Protocol:</span>
              <span className="text-emerald-400 font-mono">Yjs CRDT</span>
            </div>
          </div>
        </aside>

        {/* Desktop Sidebar Toggle Handle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 p-1 rounded-r bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all shadow-md"
          style={{ left: isSidebarOpen ? '16rem' : '0' }}
          title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Center: Active Editor Canvas */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0e14]">
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
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Loading workspace documents...
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
        />
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 border-t border-zinc-800 bg-zinc-950 px-3 flex items-center justify-between text-[11px] text-zinc-400 shrink-0 select-none z-30 font-mono overflow-hidden">
        <div className="flex items-center gap-2 truncate">
          <span className="flex items-center gap-1 text-zinc-300 truncate max-w-[120px] sm:max-w-none">
            {activeDoc?.name}
          </span>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="uppercase text-zinc-500 hidden sm:inline">{activeDoc?.language}</span>
          <span className="text-zinc-600 hidden md:inline">|</span>
          <span className="text-emerald-400 hidden md:inline">UTF-8</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                meshStatus.peerCount > 0
                  ? 'bg-emerald-400'
                  : meshStatus.signalingConnected
                  ? 'bg-amber-400'
                  : 'bg-zinc-500'
              }`}
            />
            <span>
              {meshStatus.peerCount > 0
                ? `${meshStatus.peerCount} Peer(s)`
                : meshStatus.signalingConnected
                ? 'Signaling Ready'
                : 'Offline'}
            </span>
          </span>

          <span className="text-zinc-600 hidden sm:inline">|</span>

          <span className="hidden sm:flex items-center gap-1 text-zinc-400">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>IndexedDB</span>
          </span>
        </div>
      </footer>

      {/* Modals */}
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
