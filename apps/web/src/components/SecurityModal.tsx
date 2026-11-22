import React from 'react';
import { Modal, Button } from '@forge/ui';
import { Shield, Lock, HardDrive, Radio } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Architecture & Security"
      description="Architectural boundaries and data flow in FORGE."
      className="max-w-lg"
    >
      <div className="space-y-3 text-xs text-zinc-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
        {/* Zero Server Storage */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center gap-2 font-medium text-zinc-200">
            <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
            <span>Zero Server Document Storage</span>
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            FORGE has no central database. Documents and CRDT states are saved locally in browser IndexedDB and synced peer-to-peer over WebRTC data channels.
          </p>
        </div>

        {/* DTLS Transport */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center gap-2 font-medium text-zinc-200">
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Transport Security (DTLS)</span>
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Data channels are encrypted using standard WebRTC DTLS 1.2 in transit between peers.
          </p>
        </div>

        {/* Room Access */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center gap-2 font-medium text-zinc-200">
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span>Room Identifiers</span>
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Anyone with the room link can join the collaborative session. Keep room links private if sharing sensitive engineering drafts.
          </p>
        </div>

        {/* Signaling */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center gap-2 font-medium text-zinc-200">
            <Radio className="w-3.5 h-3.5 text-zinc-400" />
            <span>Signaling & NAT Traversal</span>
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            The signaling server brokers WebRTC handshakes (SDP/ICE) and provides TURN relay credentials when direct P2P connections are blocked by symmetric NATs. It never inspects document contents.
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};
