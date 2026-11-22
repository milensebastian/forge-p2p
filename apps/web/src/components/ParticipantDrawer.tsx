import React from 'react';
import { Participant, MeshStatus } from '@forge/core';
import { Avatar } from '@forge/ui';
import {
  X,
  Radio,
  FileText,
  RotateCcw,
  Server,
  Zap,
  Globe,
  AlertCircle,
  Activity,
} from 'lucide-react';

interface ParticipantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  meshStatus: MeshStatus;
  signalingUrl?: string;
  onRestartIce?: () => void;
}

export const ParticipantDrawer: React.FC<ParticipantDrawerProps> = ({
  isOpen,
  onClose,
  participants,
  meshStatus,
  signalingUrl,
  onRestartIce,
}) => {
  if (!isOpen) return null;

  const renderConnectionStatus = () => {
    switch (meshStatus.overallConnectionStatus) {
      case 'connected-turn':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Connected (TURN Relay)
          </span>
        );
      case 'connected-p2p':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Connected (Direct P2P)
          </span>
        );
      case 'reconnecting':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Reconnecting...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Connection Failed
          </span>
        );
      case 'connecting':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
            {meshStatus.signalingConnected ? 'Awaiting peers...' : 'Connecting to signaling...'}
          </span>
        );
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs sm:hidden"
        aria-hidden="true"
      />

      <aside
        aria-label="Peer Network & Diagnostics"
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#101115] border-l border-[#1e2029] shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-right-5 duration-150"
      >
        {/* Drawer Header */}
        <div className="h-10 px-4 border-b border-[#1e2029] flex items-center justify-between shrink-0 bg-[#0e0f13]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Mesh Diagnostics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#181922] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Status Banner */}
        <div className="p-3.5 border-b border-[#1e2029] space-y-2 bg-[#0e0f13]/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Status</span>
            {renderConnectionStatus()}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Mesh Capacity</span>
            <span className="font-mono text-zinc-200">
              {participants.length} / 5 Peers
            </span>
          </div>

          {/* 5-segment discrete meter */}
          <div className="grid grid-cols-5 gap-1 pt-0.5">
            {[0, 1, 2, 3, 4].map((index) => {
              const isFilled = index < participants.length;
              return (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-all ${
                    isFilled ? 'bg-indigo-500' : 'bg-[#1e2029]'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* Active Participants */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Connected Peers ({participants.length})
            </div>

            <div className="space-y-1.5">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-md bg-[#14151b] border border-[#23252f] flex items-center gap-3 text-xs"
                >
                  <Avatar
                    name={p.name}
                    color={p.color}
                    size="sm"
                    isLocal={p.isLocal}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-zinc-200 truncate">
                        {p.name}
                      </span>
                      {p.isLocal && (
                        <span className="text-[10px] font-mono text-zinc-400 border border-[#23252f] bg-[#0c0d10] px-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mt-0.5">
                      <span className="truncate">{p.activeDocId || 'Viewing'}</span>
                      {p.cursor && (
                        <span>
                          {p.cursor.line}:{p.cursor.col}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WebRTC Diagnostics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Candidate Telemetry
              </span>
              {onRestartIce && (
                <button
                  onClick={onRestartIce}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Force ICE restart"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restart ICE</span>
                </button>
              )}
            </div>

            {meshStatus.peersDiagnostics && meshStatus.peersDiagnostics.length > 0 ? (
              <div className="space-y-1.5">
                {meshStatus.peersDiagnostics.map((peer, idx) => (
                  <div
                    key={peer.id || idx}
                    className="p-2.5 rounded-md bg-[#14151b] border border-[#23252f] text-[11px] font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-zinc-300">
                      <span>Peer: {peer.id.slice(0, 8)}</span>
                      <span className="text-zinc-400 uppercase text-[10px] px-1.5 py-0.5 rounded bg-[#181922] border border-[#282a38]">
                        {peer.candidateType === 'relay'
                          ? 'TURN Relay'
                          : peer.candidateType === 'host'
                            ? 'Host LAN'
                            : 'STUN srflx'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 pt-0.5">
                      <div>ICE: <span className="text-zinc-300">{peer.iceConnectionState}</span></div>
                      <div>RTC: <span className="text-zinc-300">{peer.connectionState}</span></div>
                    </div>

                    {peer.selectedCandidatePair && (
                      <div className="pt-1 border-t border-[#1e2029] flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Protocol: {peer.selectedCandidatePair.protocol?.toUpperCase() || 'UDP'}</span>
                        {peer.selectedCandidatePair.rtt !== undefined && (
                          <span className="text-emerald-400 font-medium">
                            {peer.selectedCandidatePair.rtt} ms
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-600 font-mono py-2">
                {meshStatus.signalingConnected
                  ? 'Awaiting remote peer handshake...'
                  : 'Connecting to signaling server...'}
              </div>
            )}
          </div>

          {/* TURN Status */}
          <div className="p-2.5 rounded-md bg-[#14151b] border border-[#23252f] text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-zinc-500" />
                TURN Relay Server
              </span>
              <span className="font-mono text-[11px] text-zinc-300">
                {meshStatus.turnConfigured ? 'Available' : 'STUN Only'}
              </span>
            </div>
            {signalingUrl && (
              <div className="text-[10px] font-mono text-zinc-600 truncate">
                {signalingUrl}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-[#1e2029] text-[11px] text-zinc-500 font-mono flex items-center justify-between bg-[#0e0f13]">
          <span>DTLS 1.2 / SRTP</span>
          <span>RTCDataChannel</span>
        </div>
      </aside>
    </>
  );
};
