import React from 'react';
import { Participant, MeshStatus } from '@forge/core';
import { Avatar, Badge, Button } from '@forge/ui';
import { X, Wifi, Radio, ShieldCheck, AlertTriangle, Activity, FileText } from 'lucide-react';

interface ParticipantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  meshStatus: MeshStatus;
  signalingUrl?: string;
}

export const ParticipantDrawer: React.FC<ParticipantDrawerProps> = ({
  isOpen,
  onClose,
  participants,
  meshStatus,
  signalingUrl,
}) => {
  if (!isOpen) return null;

  const connectedPeersCount = Math.max(0, participants.length - 1);
  const meshSaturated = participants.length >= 5;

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
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 md:w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Peer Mesh Network
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

        {/* Mesh Capacity Status Bar */}
        <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-400">Full-Mesh Topology Limit</span>
            <span className="font-mono font-medium text-emerald-400">
              {participants.length} / 5 Peers
            </span>
          </div>

          {/* Visual 5-segment bar */}
          <div className="grid grid-cols-5 gap-1.5 h-2">
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
            <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-amber-300 bg-amber-950/50 border border-amber-800/40 px-2 py-1.5 rounded">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Maximum mesh capacity reached (5 participants).</span>
            </div>
          )}
        </div>

        {/* Participants List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
            Active Participants ({participants.length})
          </div>

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

                {/* Cursor / Active Doc info */}
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-zinc-400">
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

        {/* Diagnostics & Network Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-2.5 text-xs shrink-0">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            Network Transport
          </div>

          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Signaling Server
            </span>
            <span className="font-mono text-[11px] text-zinc-300">
              {meshStatus.signalingConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          {signalingUrl && (
            <div className="text-[10px] font-mono text-zinc-500 pl-5 truncate" title={signalingUrl}>
              {signalingUrl}
            </div>
          )}

          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              Direct RTCDataChannels
            </span>
            <span className="font-mono text-[11px] text-emerald-400">
              {connectedPeersCount} Active
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Transport Security
            </span>
            <span className="font-mono text-[11px] text-zinc-300">
              DTLS-SRTP
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
