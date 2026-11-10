import { DocumentMeta } from './types';

export const PARTICIPANT_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
];

export const ENGINEER_TITLES = [
  'Atlas Architect',
  'Nova Kernel',
  'Orion Compiler',
  'Zenith Systems',
  'Sol Hacker',
  'Hyperion Lead',
  'Vektor Specialist',
  'Cipher Protocol',
];

export function getRandomName(): string {
  return ENGINEER_TITLES[Math.floor(Math.random() * ENGINEER_TITLES.length)];
}

export function getRandomColor(existingColors: string[] = []): string {
  const unused = PARTICIPANT_COLORS.filter((c) => !existingColors.includes(c));
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)];
  }
  return PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)];
}

/**
 * Calculates total active full-mesh WebRTC data channels:
 * N * (N - 1) / 2
 */
export function calculateMeshChannels(peerCount: number): number {
  if (peerCount <= 1) return 0;
  return (peerCount * (peerCount - 1)) / 2;
}

export const INITIAL_README_CONTENT = `# FORGE — Local-First P2P Engineering Workspace

Welcome to **FORGE**, a privacy-focused collaborative engineering workspace designed for technical teams.

## 🚀 Key Architectural Pillars

- **Zero Central Storage**: Keystrokes and document contents are synchronized directly over WebRTC \`RTCDataChannel\` mesh connections.
- **Local-First Durability**: Changes are automatically committed to client-side \`IndexedDB\`. Workspaces reload instantaneously offline.
- **Conflict-Free State**: Powered by Yjs CRDTs (Conflict-free Replicated Data Types) ensuring mathematical convergence without locks.
- **Up to 5 Full-Mesh Peers**: Direct peer-to-peer data channels maintain real-time low latency with no intermediary server overhead.

---

## 🛠️ Getting Started

1. **Share this Room**: Click the room badge in the top navigation to copy your workspace link.
2. **Collaborative Code**: Open \`architecture.ts\` in the left explorer to edit TypeScript code with live Monaco cursors.
3. **Markdown Documentation**: Format specifications, architecture decision records (ADRs), and sprint roadmaps right here.
4. **Peer Awareness**: Check the mesh indicator on the top right to inspect connected engineering peers.

> **Security Notice**: Room IDs act as rendezvous identifiers. Do not share room links across untrusted public forums.
`;

export const INITIAL_CODE_CONTENT = `/**
 * FORGE Core System Architecture
 * Local-First P2P WebRTC Mesh Definition
 */

export interface PeerNode {
  readonly peerId: string;
  readonly name: string;
  readonly role: 'lead' | 'architect' | 'contributor';
  readonly lastHeartbeat: number;
}

export interface MeshTopology {
  readonly maxCapacity: 5;
  activePeers: Map<string, PeerNode>;
  isMeshSaturated: boolean;
}

/**
 * Calculates total active full-mesh WebRTC data channels:
 * N * (N - 1) / 2
 */
export function calculateMeshChannels(peerCount: number): number {
  if (peerCount <= 1) return 0;
  return (peerCount * (peerCount - 1)) / 2;
}

// Live collaborative Monaco editor powered by Yjs & y-monaco
export function initializeForgeWorkspace(roomName: string): MeshTopology {
  console.log(\`[FORGE] Initializing local-first peer session for room: \${roomName}\`);
  
  return {
    maxCapacity: 5,
    activePeers: new Map(),
    isMeshSaturated: false,
  };
}
`;

export const DEFAULT_DOCUMENTS: DocumentMeta[] = [
  {
    id: 'doc-readme',
    name: 'README.md',
    type: 'markdown',
    language: 'markdown',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'doc-architecture',
    name: 'architecture.ts',
    type: 'code',
    language: 'typescript',
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
  },
];

