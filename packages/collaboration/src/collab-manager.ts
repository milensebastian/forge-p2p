import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  DocumentMeta,
  DocumentType,
  SupportedLanguage,
  Participant,
  ConnectionState,
  CandidateType,
  OverallConnectionStatus,
  PeerDiagnostic,
  DEFAULT_DOCUMENTS,
  INITIAL_README_CONTENT,
  INITIAL_CODE_CONTENT,
} from '@forge/core';
import { CollabConfig, CollabEvents, CollabStatusPayload, LocalUserState } from './types';
import {
  resolveSignalingServers,
  resolveIceServers,
  fetchDynamicIceServers,
  DEFAULT_ICE_SERVERS,
} from './signaling';

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

  // WebRTC Diagnostics State
  private iceServers: RTCIceServer[];
  private turnConfigured = false;
  private activeCandidateType: CandidateType = 'unknown';
  private overallConnectionStatus: OverallConnectionStatus = 'connecting';
  private peersDiagnostics: PeerDiagnostic[] = [];
  private statsTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: CollabConfig, events: CollabEvents = {}) {
    this.roomId = config.roomId.toLowerCase().trim();
    this.localUser = { ...config.localUser };
    this.events = events;
    this.ydoc = new Y.Doc();
    this.filesMap = this.ydoc.getMap<DocumentMeta>('workspace-files');

    this.iceServers = config.iceServers || resolveIceServers();
    this.turnConfigured = this.iceServers.some((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((u) => u.startsWith('turn:') || u.startsWith('turns:'));
    });

    // 1. Local Persistence (IndexedDB)
    if (!config.disableIndexedDB && typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        const idbProvider = new IndexeddbPersistence(this.roomId, this.ydoc);
        this.persistence = idbProvider;

        idbProvider.on('synced', () => {
          this.persistenceSynced = true;
          this.ensureInitialContent();
          this.notifyStatus();
          if (this.events.onIndexedDBSynced) {
            this.events.onIndexedDBSynced();
          }
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
            trickle: true,
            config: {
              iceServers: this.iceServers,
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
          this.pollStats();
        });

        this.provider.on('synced', () => {
          this.ensureInitialContent();
          this.notifyStatus();
        });

        // Start periodic WebRTC stats inspection
        this.statsTimer = setInterval(() => {
          this.pollStats();
        }, 2000);

        // Fetch dynamic TURN credentials in background if available
        if (typeof window !== 'undefined' && this.signalingUrl) {
          fetchDynamicIceServers(this.signalingUrl).then((dyn) => {
            if (this.isDestroyed) return;
            if (dyn.hasTurn) {
              const hadTurn = this.turnConfigured;
              this.turnConfigured = true;
              this.iceServers = dyn.iceServers;
              if (this.provider) {
                const p = this.provider as any;
                if (!p.peerOpts) p.peerOpts = {};
                p.peerOpts.config = {
                  ...(p.peerOpts.config || {}),
                  iceServers: dyn.iceServers,
                };
              }
              this.notifyStatus();
              // If we didn't have TURN initially, trigger ICE restart now that TURN is available
              if (!hadTurn) {
                this.restartIce();
              }
            }
          });
        }
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

  /**
   * Periodically inspects native RTCPeerConnection stats across active mesh peers
   * to determine direct P2P vs TURN Relay, candidate types, and latency.
   */
  public async pollStats(): Promise<void> {
    if (this.isDestroyed || !this.provider) return;

    const room = (this.provider as any).room;
    if (!room || !room.webrtcConns) return;

    const webrtcConns = Array.from((room.webrtcConns as Map<string, any>).entries());
    const peersDiags: PeerDiagnostic[] = [];

    let hasAnyRelay = false;
    let hasAnyDirect = false;
    let hasAnyReconnecting = false;
    let hasAnyFailed = false;

    for (const [peerId, conn] of webrtcConns) {
      const pc: RTCPeerConnection | undefined = conn.peer?._pc;
      const iceState = pc?.iceConnectionState || (conn.connected ? 'connected' : 'checking');
      const connectionState = pc?.connectionState || (conn.connected ? 'connected' : 'connecting');

      let candidateType: CandidateType = 'unknown';
      let selectedPairInfo: PeerDiagnostic['selectedCandidatePair'] = undefined;

      if (pc && typeof pc.getStats === 'function') {
        try {
          const stats = await pc.getStats();
          let selectedPair: any = null;
          const candidateMap = new Map<string, any>();

          stats.forEach((report: any) => {
            if (report.type === 'candidate-pair' && (report.selected || report.nominated || report.state === 'succeeded')) {
              selectedPair = report;
            } else if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
              candidateMap.set(report.id, report);
            }
          });

          if (selectedPair) {
            const local = candidateMap.get(selectedPair.localCandidateId);
            const remote = candidateMap.get(selectedPair.remoteCandidateId);

            const localType = local?.candidateType || 'unknown';
            const remoteType = remote?.candidateType || 'unknown';

            if (localType === 'relay' || remoteType === 'relay') {
              candidateType = 'relay';
              hasAnyRelay = true;
            } else if (localType === 'host' && remoteType === 'host') {
              candidateType = 'host';
              hasAnyDirect = true;
            } else {
              candidateType = localType === 'prflx' || remoteType === 'prflx' ? 'prflx' : 'srflx';
              hasAnyDirect = true;
            }

            selectedPairInfo = {
              localType,
              remoteType,
              protocol: local?.protocol || selectedPair.protocol,
              localAddress: local?.address || local?.ip,
              remoteAddress: remote?.address || remote?.ip,
              rtt: selectedPair.currentRoundTripTime ? Math.round(selectedPair.currentRoundTripTime * 1000) : undefined,
            };
          }
        } catch {
          // getStats may throw if PC is closing
        }
      }

      if (iceState === 'disconnected') {
        hasAnyReconnecting = true;
      } else if (iceState === 'failed') {
        hasAnyFailed = true;
      }

      peersDiags.push({
        id: peerId,
        connected: !!conn.connected,
        synced: !!conn.synced,
        iceConnectionState: iceState,
        connectionState,
        candidateType,
        selectedCandidatePair: selectedPairInfo,
      });
    }

    this.peersDiagnostics = peersDiags;

    // Determine overall connection status
    if (this.currentPeersCount === 0) {
      this.overallConnectionStatus = this.signalingConnected ? 'connecting' : 'disconnected';
      this.activeCandidateType = 'unknown';
    } else if (hasAnyFailed && !hasAnyDirect && !hasAnyRelay) {
      this.overallConnectionStatus = 'failed';
    } else if (hasAnyReconnecting) {
      this.overallConnectionStatus = 'reconnecting';
    } else if (hasAnyRelay) {
      this.overallConnectionStatus = 'connected-turn';
      this.activeCandidateType = 'relay';
    } else {
      this.overallConnectionStatus = 'connected-p2p';
      this.activeCandidateType = hasAnyDirect ? 'srflx' : 'host';
    }

    this.notifyStatus();
  }

  /**
   * Triggers an explicit ICE restart and re-announces the room to the signaling mesh.
   * Useful when transitioning networks (e.g. Wi-Fi to cellular) or recovering from stalled handshakes.
   */
  public restartIce(): void {
    if (!this.provider) return;

    const room = (this.provider as any).room;
    if (room && room.webrtcConns) {
      (room.webrtcConns as Map<string, any>).forEach((conn) => {
        const pc: RTCPeerConnection | undefined = conn.peer?._pc;
        if (pc && typeof (pc as any).restartIce === 'function') {
          try {
            (pc as any).restartIce();
          } catch (e) {
            console.warn('[FORGE] restartIce error:', e);
          }
        }
      });

      // Re-announce room to all signaling connections
      if (Array.isArray((this.provider as any).signalingConns)) {
        (this.provider as any).signalingConns.forEach((conn: any) => {
          if (conn.connected) {
            conn.send({
              type: 'publish',
              topic: this.roomId,
              data: { type: 'announce', from: room.peerId },
            });
          }
        });
      }
    }

    this.pollStats();
  }

  public notifyStatus(): void {
    if (this.isDestroyed || !this.events.onStatusChange) return;

    let state: ConnectionState = 'disconnected';
    if (this.overallConnectionStatus === 'failed') {
      state = 'failed';
    } else if (this.overallConnectionStatus === 'reconnecting') {
      state = 'reconnecting';
    } else if (this.currentPeersCount >= 5) {
      state = 'mesh-saturated';
    } else if (this.currentPeersCount > 0) {
      state = 'connected';
    } else if (this.signalingConnected) {
      state = 'connecting';
    }

    const payload: CollabStatusPayload = {
      state,
      connectedPeers: this.currentPeersCount,
      signalingConnected: this.signalingConnected,
      persistedToIndexedDB: this.persistenceSynced,
      error: this.lastError,
      overallConnectionStatus: this.overallConnectionStatus,
      activeCandidateType: this.activeCandidateType,
      turnConfigured: this.turnConfigured,
      iceServers: this.iceServers,
      peersDiagnostics: this.peersDiagnostics,
    };

    this.events.onStatusChange(payload);
  }

  private notifyParticipants(): void {
    if (this.isDestroyed || !this.events.onParticipantsChange || !this.provider) return;

    const states = this.provider.awareness.getStates();
    const localClientId = this.ydoc.clientID;
    const participantsList: Participant[] = [];

    states.forEach((state, clientId) => {
      if (state.user) {
        participantsList.push({
          id: clientId,
          name: state.user.name || `Peer #${clientId.toString().slice(-4)}`,
          color: state.user.color || '#10b981',
          isLocal: clientId === localClientId,
          activeDocId: state.user.activeDocId,
          cursor: state.user.cursor,
          lastSeen: state.user.lastSeen || Date.now(),
        });
      }
    });

    participantsList.sort((a, b) => (a.isLocal ? -1 : b.isLocal ? 1 : 0));
    this.events.onParticipantsChange(participantsList);
  }

  private notifyFiles(): void {
    if (this.isDestroyed || !this.events.onFilesChange) return;
    this.events.onFilesChange(this.getFiles());
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

  public addFile(
    name: string,
    type: DocumentType,
    language: SupportedLanguage,
    initialContent = ''
  ): DocumentMeta {
    const id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newDoc: DocumentMeta = {
      id,
      name,
      type,
      language,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.ydoc.transact(() => {
      this.filesMap.set(id, newDoc);
      const ytext = this.getText(id);
      if (initialContent) {
        ytext.insert(0, initialContent);
      }
    });

    return newDoc;
  }

  public deleteFile(docId: string): void {
    this.ydoc.transact(() => {
      this.filesMap.delete(docId);
      const ytext = this.getText(docId);
      if (ytext.length > 0) {
        ytext.delete(0, ytext.length);
      }
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
    return {
      roomId: this.roomId,
      signalingUrls: signaling,
      signalingConnected: this.signalingConnected,
      currentPeersCount: this.currentPeersCount,
      overallConnectionStatus: this.overallConnectionStatus,
      activeCandidateType: this.activeCandidateType,
      turnConfigured: this.turnConfigured,
      isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
      protocol: typeof window !== 'undefined' ? window.location.protocol : '',
      host: typeof window !== 'undefined' ? window.location.host : '',
      peers: this.peersDiagnostics,
    };
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
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
