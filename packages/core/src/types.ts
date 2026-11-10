export type DocumentType = 'markdown' | 'code';

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'html'
  | 'css'
  | 'json'
  | 'rust'
  | 'go'
  | 'sql'
  | 'markdown';

export interface DocumentMeta {
  id: string;
  name: string;
  type: DocumentType;
  language: SupportedLanguage;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceMeta {
  id: string;
  name: string;
  createdAt: number;
}

export interface CursorPosition {
  line: number;
  col: number;
}

export interface Participant {
  id: number;
  name: string;
  color: string;
  isLocal: boolean;
  activeDocId?: string;
  cursor?: CursorPosition;
  lastSeen?: number;
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'synced'
  | 'mesh-saturated';

export interface MeshStatus {
  state: ConnectionState;
  peerCount: number;
  maxPeers: number;
  signalingConnected: boolean;
  persistedToIndexedDB: boolean;
  error?: string | null;
}

