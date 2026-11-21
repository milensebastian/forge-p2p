import {
  Participant,
  ConnectionState,
  DocumentMeta,
  CandidateType,
  OverallConnectionStatus,
  PeerDiagnostic,
} from '@forge/core';

export interface LocalUserState {
  name: string;
  color: string;
  activeDocId?: string;
  cursor?: {
    line: number;
    col: number;
  };
}

export interface CollabStatusPayload {
  state: ConnectionState;
  connectedPeers: number;
  signalingConnected: boolean;
  persistedToIndexedDB: boolean;
  error?: string | null;
  overallConnectionStatus: OverallConnectionStatus;
  activeCandidateType?: CandidateType;
  turnConfigured: boolean;
  iceServers?: RTCIceServer[];
  peersDiagnostics?: PeerDiagnostic[];
}

export interface CollabEvents {
  onStatusChange?: (status: CollabStatusPayload) => void;
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
