import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  DocumentMeta,
  DocumentType,
  SupportedLanguage,
  Participant,
  ConnectionState,
  DEFAULT_DOCUMENTS,
  INITIAL_README_CONTENT,
  INITIAL_CODE_CONTENT,
} from '@forge/core';
import { CollabConfig, CollabEvents, LocalUserState } from './types';
import { resolveSignalingServers, DEFAULT_ICE_SERVERS } from './signaling';

export class CollabManager {
  public readonly roomId: string;
  public readonly signalingUrl: string | null = null;
  public readonly ydoc: Y.Doc;
  public readonly provider: WebrtcProvider | null = null;
  public readonly persistence: IndexeddbPersistence | null = null;
  public readonly filesMap: Y.Map<DocumentMeta>;

  private localUser: LocalUserState;
  private readonly events: CollabEvents;
  private isDestroyed = false;
  private persistenceSynced = false;
  private signalingConnected = false;
  private currentPeersCount = 0;
  private lastError: string | null = null;

  constructor(config: CollabConfig, events: CollabEvents = {}) {
    this.roomId = config.roomId.toLowerCase().trim();
    this.localUser = { ...config.localUser };
    this.events = events;
    this.ydoc = new Y.Doc();
    this.filesMap = this.ydoc.getMap<DocumentMeta>('workspace-files');

    // 1. Local Persistence (IndexedDB)
    if (!config.disableIndexedDB && typeof window !== 'undefined' && window.indexedDB) {
      try {
        this.persistence = new IndexeddbPersistence(`forge-workspace-${this.roomId}`, this.ydoc);
        this.persistence.on('synced', () => {
          this.persistenceSynced = true;
          this.ensureInitialContent();
          this.notifyStatus();
          this.events.onIndexedDBSynced?.();
        });
      } catch (err) {
        console.warn('[FORGE] IndexedDB initialization failed:', err);
        this.lastError = 'IndexedDB unavailable';
      }
    } else {
      this.persistenceSynced = true;
      this.ensureInitialContent();
    }

    // 2. WebRTC Provider for P2P Full-Mesh Sync
    if (!config.disableWebRTC && (typeof window !== 'undefined' || typeof WebSocket !== 'undefined')) {
      const signaling = config.signalingServers || resolveSignalingServers();
      this.signalingUrl = signaling[0] || null;
      try {
        this.provider = new WebrtcProvider(this.roomId, this.ydoc, {
          signaling,
          password: undefined,
          maxConns: 20, // allows mesh handshake negotiations
          filterBcConns: true,
          peerOpts: {
            config: {
              iceServers: config.iceServers || DEFAULT_ICE_SERVERS,
            },
          },
        });

        // Awareness setup
        this.setupAwareness();

        // Listen for signaling & peer connection status
        this.provider.on('status', ({ connected }: { connected: boolean }) => {
          this.signalingConnected = connected;
          this.notifyStatus();
        });

        this.provider.on('peers', ({ webrtcPeers, bcPeers }: { webrtcPeers: unknown[]; bcPeers?: unknown[] }) => {
          this.currentPeersCount = (webrtcPeers?.length || 0) + (bcPeers?.length || 0);
          this.notifyStatus();
          this.notifyParticipants();
        });

        this.provider.on('synced', () => {
          this.ensureInitialContent();
          this.notifyStatus();
        });
      } catch (err) {
        console.error('[FORGE] WebRTC provider error:', err);
        this.lastError = 'WebRTC initialization failed';
      }
    }

    // Listen to file tree changes
    this.filesMap.observe(() => {
      this.notifyFiles();
    });

    this.notifyStatus();
  }

  private setupAwareness(): void {
    if (!this.provider) return;

    const awareness = this.provider.awareness;
    awareness.setLocalStateField('user', {
      name: this.localUser.name,
      color: this.localUser.color,
      activeDocId: this.localUser.activeDocId,
      cursor: this.localUser.cursor,
      lastSeen: Date.now(),
    });

    awareness.on('change', () => {
      this.notifyParticipants();
    });
  }

  private ensureInitialContent(): void {
    if (this.filesMap.size === 0) {
      // First peer in room: populate default documents
      this.ydoc.transact(() => {
        for (const doc of DEFAULT_DOCUMENTS) {
          this.filesMap.set(doc.id, doc);
          const ytext = this.ydoc.getText(`content:${doc.id}`);
          if (ytext.length === 0) {
            const initialText = doc.id === 'doc-readme' ? INITIAL_README_CONTENT : INITIAL_CODE_CONTENT;
            ytext.insert(0, initialText);
          }
        }
      });
    }
  }

  public notifyStatus(): void {
    if (this.isDestroyed || !this.events.onStatusChange) return;

    let state: ConnectionState = 'disconnected';
    if (this.currentPeersCount >= 5) {
      state = 'mesh-saturated';
    } else if (this.currentPeersCount > 0) {
      state = 'connected';
    } else if (this.signalingConnected) {
      state = 'connecting';
    }

    this.events.onStatusChange({
      state,
      connectedPeers: this.currentPeersCount,
      signalingConnected: this.signalingConnected,
      persistedToIndexedDB: this.persistenceSynced,
      error: this.lastError,
    });
  }

  public notifyParticipants(): void {
    if (this.isDestroyed || !this.events.onParticipantsChange || !this.provider) return;

    const states = this.provider.awareness.getStates();
    const localId = this.provider.awareness.clientID;
    const participants: Participant[] = [];

    // Add local user first
    participants.push({
      id: localId,
      name: this.localUser.name,
      color: this.localUser.color,
      isLocal: true,
      activeDocId: this.localUser.activeDocId,
      cursor: this.localUser.cursor,
      lastSeen: Date.now(),
    });

    // Add remote peers (limit to active participants)
    states.forEach((state, clientID) => {
      if (clientID === localId) return;
      const user = state.user as LocalUserState & { lastSeen?: number };
      if (user && user.name) {
        participants.push({
          id: clientID,
          name: user.name,
          color: user.color || '#3b82f6',
          isLocal: false,
          activeDocId: user.activeDocId,
          cursor: user.cursor,
          lastSeen: user.lastSeen,
        });
      }
    });

    this.events.onParticipantsChange(participants);
  }

  public notifyFiles(): void {
    if (this.isDestroyed || !this.events.onFilesChange) return;
    const files = this.getFiles();
    this.events.onFilesChange(files);
  }

  public getFiles(): DocumentMeta[] {
    const list: DocumentMeta[] = [];
    this.filesMap.forEach((meta) => {
      list.push(meta);
    });
    return list.sort((a, b) => a.createdAt - b.createdAt);
  }

  public getText(docId: string): Y.Text {
    return this.ydoc.getText(`content:${docId}`);
  }

  public addFile(name: string, type: DocumentType, language: SupportedLanguage, initialContent = ''): DocumentMeta {
    const id = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = Date.now();
    const meta: DocumentMeta = {
      id,
      name,
      type,
      language,
      createdAt: now,
      updatedAt: now,
    };

    this.ydoc.transact(() => {
      this.filesMap.set(id, meta);
      const text = this.getText(id);
      if (initialContent && text.length === 0) {
        text.insert(0, initialContent);
      }
    });

    return meta;
  }

  public deleteFile(docId: string): void {
    this.ydoc.transact(() => {
      this.filesMap.delete(docId);
      // We don't delete Y.Text directly to preserve CRDT history safely if needed
    });
  }

  public renameFile(docId: string, newName: string): void {
    const existing = this.filesMap.get(docId);
    if (!existing) return;

    this.ydoc.transact(() => {
      this.filesMap.set(docId, {
        ...existing,
        name: newName,
        updatedAt: Date.now(),
      });
    });
  }

  public setLocalActiveDoc(docId: string): void {
    this.localUser.activeDocId = docId;
    if (this.provider) {
      this.provider.awareness.setLocalStateField('user', {
        ...this.localUser,
        activeDocId: docId,
        lastSeen: Date.now(),
      });
    }
  }

  public setLocalCursor(docId: string, line: number, col: number): void {
    this.localUser.activeDocId = docId;
    this.localUser.cursor = { line, col };
    if (this.provider) {
      this.provider.awareness.setLocalStateField('user', {
        ...this.localUser,
        activeDocId: docId,
        cursor: { line, col },
        lastSeen: Date.now(),
      });
    }
  }

  public updateLocalUser(name: string, color: string): void {
    this.localUser.name = name;
    this.localUser.color = color;
    if (this.provider) {
      this.provider.awareness.setLocalStateField('user', {
        ...this.localUser,
        name,
        color,
        lastSeen: Date.now(),
      });
    }
    this.notifyParticipants();
  }

  public getDiagnostics() {
    const signaling = this.provider?.signalingUrls || [];
    const room = (this.provider as any)?.room;
    const webrtcConns = room ? Array.from((room.webrtcConns as Map<string, any>).entries()) : [];
    const peers = webrtcConns.map(([id, conn]) => ({
      id,
      connected: !!conn.connected,
      synced: !!conn.synced,
      iceState: conn.peer?._pc?.iceConnectionState || (conn.connected ? 'connected' : 'checking'),
      dataChannelState: conn.peer?._channel?.readyState || (conn.connected ? 'open' : 'connecting'),
    }));
    return {
      roomId: this.roomId,
      signalingUrls: signaling,
      signalingConnected: this.signalingConnected,
      currentPeersCount: this.currentPeersCount,
      isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
      protocol: typeof window !== 'undefined' ? window.location.protocol : '',
      host: typeof window !== 'undefined' ? window.location.host : '',
      peers,
    };
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.provider) {
      try {
        this.provider.disconnect();
        this.provider.destroy();
      } catch (e) {
        console.warn('[FORGE] Error destroying WebRTC provider:', e);
      }
    }
    if (this.persistence) {
      try {
        this.persistence.destroy();
      } catch (e) {
        console.warn('[FORGE] Error destroying IndexedDB persistence:', e);
      }
    }
    this.ydoc.destroy();
  }
}

