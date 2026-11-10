import React from 'react';
import { Modal, Button } from '@forge/ui';
import { ShieldAlert, Lock, ServerOff, Radio, CheckCircle2 } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="FORGE Security Model & Limitations"
      description="Architectural boundary and privacy disclosure for this peer-to-peer workspace."
      className="max-w-xl"
    >
      <div className="space-y-4 text-xs text-zinc-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
        {/* Zero Cloud Guarantee */}
        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-emerald-300 text-sm">
            <ServerOff className="w-4 h-4 text-emerald-400" />
            Zero Server Document Storage
          </div>
          <p className="text-zinc-300">
            FORGE has no centralized database or cloud storage. Keystrokes, source code, and markdown documents are stored locally in your browser's IndexedDB and synchronized directly with connected peers via WebRTC <code className="text-emerald-300 bg-zinc-950 px-1 py-0.5 rounded">RTCDataChannel</code>.
          </p>
        </div>

        {/* Room IDs are NOT Passwords */}
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-amber-300 text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Room IDs are Rendezvous Identifiers, Not Credentials
          </div>
          <p className="text-zinc-300">
            Anyone possessing the Room ID can join this session topic and exchange CRDT state. There is no user password authentication or access control list in this MVP. Do not publish room links in public channels if your workspace contains confidential code.
          </p>
        </div>

        {/* DTLS Transport Security */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-cyan-300 text-sm">
            <Lock className="w-4 h-4 text-cyan-400" />
            Transport Security (DTLS)
          </div>
          <p className="text-zinc-400">
            All direct peer-to-peer data channels use standard WebRTC DTLS encryption in transit. However, payload-level application encryption with authenticated key exchange is not yet implemented.
          </p>
        </div>

        {/* Signaling & NAT */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-zinc-200 text-sm">
            <Radio className="w-4 h-4 text-indigo-400" />
            NAT Traversal & Signaling Role
          </div>
          <p className="text-zinc-400">
            The WebSocket signaling server only facilitates SDP offer/answer handshakes. It never receives or inspects document contents. Due to symmetric NATs and firewalls, direct peer connections are not guaranteed on all networks without a TURN relay.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Understood
        </Button>
      </div>
    </Modal>
  );
};

