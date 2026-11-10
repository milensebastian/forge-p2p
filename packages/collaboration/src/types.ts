import { Participant, ConnectionState, DocumentMeta } from '@forge/core';

export interface LocalUserState {
  name: string;
  color: string;
  activeDocId?: string;
  cursor?: {
    line: number;
    col: number;
  };
}

export interface CollabEvents {
  onStatusChange?: (status: {
    state: ConnectionState;
    connectedPeers: number;
    signalingConnected: boolean;
    persistedToIndexedDB: boolean;
    error?: string | null;
  }) => void;
  onParticipantsChange?: (participants: Participant[]) => void;
  onFilesChange?: (files: DocumentMeta[]) => void;
  onIndexedDBSynced?: () => void;
}

export interface CollabConfig {
  roomId: string;
  localUser: LocalUserState;
  signalingServers?: string[];
  iceServers?: RTCIceServer[];
  disableIndexedDB?: boolean;
  disableWebRTC?: boolean;
}

