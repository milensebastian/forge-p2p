import React from 'react';
import { Participant, MeshStatus } from '@forge/core';
import { Avatar, Badge, Button } from '@forge/ui';
import {
  X,
  Wifi,
  Radio,
  ShieldCheck,
  AlertTriangle,
  Activity,
  FileText,
  RotateCcw,
  Server,
  Zap,
  Globe,
  CheckCircle2,
  AlertCircle,
  Layers,
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

  const connectedPeersCount = Math.max(0, participants.length - 1);
  const meshSaturated = participants.length >= 5;

  // Format connection mode badge
  const renderConnectionBadge = () => {
    switch (meshStatus.overallConnectionStatus) {
      case 'connected-turn':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-950/80 text-purple-300 border border-purple-700/60">
            <Server className="w-3 h-3 text-purple-400" />
            Connected (TURN Relay)
          </span>
        );
      case 'connected-p2p':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
            <Zap className="w-3 h-3 text-emerald-400" />
            Connected (Direct P2P)
          </span>
        );
      case 'reconnecting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-700/60 animate-pulse">
            <RotateCcw className="w-3 h-3 text-amber-400 animate-spin" />
            Reconnecting...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/80 text-rose-300 border border-rose-700/60">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            Connection Failed
          </span>
        );
      case 'connecting':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-700/60">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            {meshStatus.signalingConnected ? 'Connecting to Peers' : 'Connecting to Signaling'}
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
        aria-label="Peer Mesh Network & Participants"
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 md:w-[420px] bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Peer Mesh Diagnostics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close mesh panel"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Real-Time WebRTC Connection Status Banner */}
        <div className="p-3.5 bg-zinc-950/90 border-b border-zinc-800 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Connection Mode</span>
            {renderConnectionBadge()}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Topology Capacity</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {participants.length} / 5 Peers
            </span>
          </div>

          {/* 5-segment mesh capacity bar */}
          <div className="grid grid-cols-5 gap-1.5 h-1.5">
            {[0, 1, 2, 3, 4].map((index) => {
              const isFilled = index < participants.length;
              return (
                <div
                  key={index}
                  className={`rounded-sm transition-all ${
                    isFilled
                      ? index === 4
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                      : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>

          {meshSaturated && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/50 border border-amber-800/40 px-2 py-1 rounded">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Full-mesh capacity reached (5 peers).</span>
            </div>
          )}
        </div>

        {/* Scrollable Center: Participants & WebRTC Diagnostics Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Participants List */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
              Connected Peers ({participants.length})
            </div>

            <div className="space-y-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-start gap-3 transition-colors hover:border-zinc-700"
                >
                  <Avatar
                    name={p.name}
                    color={p.color}
                    size="md"
                    isLocal={p.isLocal}
                    active={true}
                    className="mt-0.5"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-zinc-100 truncate">
                        {p.name}
                      </span>
                      {p.isLocal ? (
                        <Badge variant="emerald">You</Badge>
                      ) : (
                        <Badge variant="cyan">Peer</Badge>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400">
                      <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        {p.activeDocId || 'Viewing workspace'}
                      </span>
                      {p.cursor && (
                        <span className="font-mono text-zinc-500 ml-auto shrink-0">
                          L:{p.cursor.line} C:{p.cursor.col}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                      <span>Client ID: #{p.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deep WebRTC Diagnostics Panel */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>WebRTC Peer Diagnostics</span>
              </div>
              {onRestartIce && (
                <button
                  onClick={onRestartIce}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-0.5 rounded transition-colors"
                  title="Force ICE Restart and re-announce room"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restart ICE</span>
                </button>
              )}
            </div>

            {/* Peer Candidate Pairs Details */}
            {meshStatus.peersDiagnostics && meshStatus.peersDiagnostics.length > 0 ? (
              <div className="space-y-2.5">
                {meshStatus.peersDiagnostics.map((peer, idx) => (
                  <div
                    key={peer.id || idx}
                    className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-[11px] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-zinc-300 font-medium">
                        Peer: {peer.id.slice(0, 8)}...
                      </span>
                      <span
                        className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                          peer.candidateType === 'relay'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                            : peer.candidateType === 'host'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                        }`}
                      >
                        {peer.candidateType === 'relay'
                          ? 'TURN Relay'
                          : peer.candidateType === 'host'
                          ? 'Host (LAN)'
                          : 'STUN (srflx)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-400 pt-0.5">
                      <div>
                        ICE State:{' '}
                        <span className="font-mono text-zinc-200">{peer.iceConnectionState}</span>
                      </div>
                      <div>
                        WebRTC:{' '}
                        <span className="font-mono text-zinc-200">{peer.connectionState}</span>
                      </div>
                    </div>

                    {peer.selectedCandidatePair && (
                      <div className="pt-1 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Pair Protocol:</span>
                          <span className="text-zinc-300 uppercase">
                            {peer.selectedCandidatePair.protocol || 'UDP'}
                          </span>
                        </div>
                        {peer.selectedCandidatePair.rtt !== undefined && (
                          <div className="flex justify-between">
                            <span>RTT Latency:</span>
                            <span className="text-emerald-400 font-semibold">
                              {peer.selectedCandidatePair.rtt} ms
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500 py-1 font-mono">
                {meshStatus.signalingConnected
                  ? 'Awaiting remote peer candidate negotiation...'
                  : 'Signaling connecting...'}
              </div>
            )}

            {/* TURN Server Status & Advisory */}
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Server className="w-3 h-3 text-purple-400" />
                  TURN Relay Server:
                </span>
                <span
                  className={`font-semibold font-mono ${
                    meshStatus.turnConfigured ? 'text-purple-300' : 'text-amber-400'
                  }`}
                >
                  {meshStatus.turnConfigured ? 'Active / Configured' : 'STUN Only'}
                </span>
              </div>

              {!meshStatus.turnConfigured && (
                <div className="mt-2 p-2 rounded bg-amber-950/30 border border-amber-800/40 text-[10px] text-amber-200/90 leading-relaxed">
                  Notice: STUN hole-punching is active. On symmetric NATs (e.g. restrictive college Wi-Fi or cellular CGNAT), configure a TURN relay server to guarantee 100% connectivity.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer: Signaling & Transport */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-2 text-xs shrink-0">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            Signaling Mesh
          </div>

          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Signaling Server
            </span>
            <span className="font-mono text-[11px] text-zinc-300">
              {meshStatus.signalingConnected ? 'Connected (Live)' : 'Connecting...'}
            </span>
          </div>
          {signalingUrl && (
            <div className="text-[10px] font-mono text-zinc-500 pl-5 truncate" title={signalingUrl}>
              {signalingUrl}
            </div>
          )}

          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Transport Security
            </span>
            <span className="font-mono text-[11px] text-zinc-300">
              DTLS 1.2 / SRTP
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
