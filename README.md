# FORGE — Local-First P2P Engineering Workspace

An open-source, privacy-focused collaborative engineering workspace. FORGE enables engineering teams to collaboratively edit technical documentation and code in real time without a centralized server storing workspace content.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Yjs](https://img.shields.io/badge/CRDT-Yjs-orange.svg)](https://yjs.dev/)
[![WebRTC](https://img.shields.io/badge/P2P-WebRTC%20Full--Mesh-emerald.svg)](https://webrtc.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏛️ Architecture Overview

FORGE is organized as a clean TypeScript monorepo using npm workspaces:

```
forge/
├── apps/
│   ├── web/                 # Browser application (React 18 + Vite + Tailwind + Monaco)
│   └── desktop/             # Reserved for future Tauri integration (placeholder)
├── packages/
│   ├── core/                # Shared workspace, document types, and room primitives
│   ├── collaboration/       # Yjs CRDT engine, y-webrtc mesh sync, y-indexeddb & signaling server
│   ├── ui/                  # Reusable dark engineering UI component library
│   └── config/              # Shared TypeScript & build configs
├── SECURITY.md              # Detailed security model and threat boundary
└── vitest.config.ts         # Unit & integration testing configuration
```

### Key Pillars
- **Zero Central Document Storage**: Keystrokes and file trees never touch a centralized cloud database.
- **P2P WebRTC Full-Mesh**: Direct `RTCDataChannel` connections link up to 5 participants with sub-millisecond local synchronization.
- **Local-First Durability**: Client-side `IndexedDB` automatically saves every CRDT transaction. Workspaces load offline instantly.
- **Dual Collaborative Editors**:
  - **Monaco Code Editor**: VS Code engine with syntax highlighting, remote cursor awareness labels, and language selection.
  - **Markdown Documentation**: Split-screen live preview with syntax-highlighted tables, code blocks, and formatting toolbar.
- **Self-Hostable Signaling**: Zero-dependency WebSocket signaling service that handles SDP handshakes without touching document content.

---

## 🚀 Quickstart & Exact Commands

### 1. Prerequisites
- Node.js v18+ (tested on Node v20.20+)
- npm v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Self-Hostable Signaling Server (Optional for Local / Isolated LAN)
```bash
npm run signaling
```
*Runs on `ws://0.0.0.0:4444` with a `/health` endpoint at `http://localhost:4444/health`.*

### 4. Start the Web Application
```bash
npm run dev
```
*Vite dev server will start at `http://localhost:5173`.*

Open two separate browser tabs or share the generated `#room=...` link across your local network to test real-time P2P collaborative editing!

---

## 🧪 Testing

Run the test suite across core and collaboration packages:

```bash
npm run test
```

---

## 🔒 Security Model & Limitations

See [SECURITY.md](./SECURITY.md) for complete details.
- **Room IDs are Rendezvous Identifiers**: Anyone with the room ID can join the WebRTC session.
- **DTLS Transport**: P2P data channels are encrypted using DTLS.
- **NAT / Firewall Traversal**: Direct connectivity relies on STUN NAT discovery; symmetric enterprise NATs may require TURN relay.

---

## 📜 License
MIT

