import React, { useState, useEffect } from 'react';
import { generateRoomId, isValidRoomId, parseRoomFromUrl, getRandomName, getRandomColor } from '@forge/core';
import { Button, Badge } from '@forge/ui';
import { ArrowRight, Shield, Cpu, Users, Database, Sparkles, Code2, Radio } from 'lucide-react';

interface LandingPageProps {
  onJoinRoom: (roomId: string, userName: string, userColor: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onJoinRoom }) => {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('forge_user_name') || getRandomName();
  });
  const [userColor, setUserColor] = useState(() => {
    return localStorage.getItem('forge_user_color') || getRandomColor();
  });
  const [inputError, setInputError] = useState<string | null>(null);
  const [detectedRooms, setDetectedRooms] = useState<string[]>([]);

  // Probe signaling server for active LAN rooms
  useEffect(() => {
    let active = true;
    async function checkActiveRooms() {
      if (typeof window === 'undefined') return;
      const host = window.location.hostname || 'localhost';
      try {
        const res = await fetch(`http://${host}:4444/health`, {
          signal: AbortSignal.timeout(1200),
        });
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.rooms) && data.rooms.length > 0) {
            setDetectedRooms(data.rooms);
          }
        }
      } catch {
        // Signaling server check silently ignored if offline
      }
    }
    checkActiveRooms();
    return () => {
      active = false;
    };
  }, []);

  const handleCreateNew = () => {
    const newRoomId = generateRoomId();
    localStorage.setItem('forge_user_name', userName);
    localStorage.setItem('forge_user_color', userColor);
    onJoinRoom(newRoomId, userName, userColor);
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = roomIdInput.trim();
    const parsed = parseRoomFromUrl(raw) || raw;
    const cleanId = parsed.toLowerCase();
    if (!isValidRoomId(cleanId)) {
      setInputError('Please enter a valid room ID (e.g. forge-quantum-pulse-9a4f)');
      return;
    }
    setInputError(null);
    localStorage.setItem('forge_user_name', userName);
    localStorage.setItem('forge_user_color', userColor);
    onJoinRoom(cleanId, userName, userColor);
  };

  const handleJoinDetected = (targetRoomId: string) => {
    localStorage.setItem('forge_user_name', userName);
    localStorage.setItem('forge_user_color', userColor);
    onJoinRoom(targetRoomId, userName, userColor);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col justify-between p-4 sm:p-6 md:p-12">
      {/* Top Brand Bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              FORGE
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                MVP P2P
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-400">Local-First Engineering Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="emerald" dot>
            Zero Cloud Storage
          </Badge>
          <Badge variant="indigo">
            WebRTC Mesh (Max 5)
          </Badge>
        </div>
      </header>

      {/* Main Interactive Card */}
      <main className="max-w-4xl mx-auto w-full my-6 sm:my-8">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 sm:mb-4">
            Private, Collaborative Engineering.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Direct Peer-to-Peer. No Central Server.
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto px-1">
            Edit technical documentation and Monaco code in real time with up to 5 engineering peers. Powered by Yjs CRDTs and IndexedDB local persistence.
          </p>
        </div>

        {/* Active LAN Workspace Detection Banner */}
        {detectedRooms.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 shadow-xl shadow-emerald-950/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-300">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Active Workspace Detected on Network</span>
                </div>
                <div className="text-xs font-mono text-zinc-300">
                  Room: <span className="text-emerald-400 font-semibold">{detectedRooms[0]}</span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleJoinDetected(detectedRooms[0])}
                className="w-full sm:w-auto min-h-[40px] text-xs font-semibold px-4"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Join Laptop Workspace
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-2xl">
          {/* User Profile Config */}
          <div className="space-y-5 border-b md:border-b-0 md:border-r border-zinc-800 pb-6 md:pb-0 md:pr-6">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              1. Your Peer Identity
            </h3>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Engineer Handle / Callout
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Atlas Architect"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-700/80 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-base sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">
                Awareness Cursor Color
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setUserColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full transition-all touch-manipulation ${
                      userColor === color ? 'scale-110 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={handleCreateNew}
                className="w-full text-base py-3 min-h-[44px] shadow-lg shadow-emerald-950/60 font-semibold"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Create New Workspace
              </Button>
              <p className="text-[11px] text-zinc-500 text-center mt-2">
                Generates a unique room ID with local IndexedDB persistence
              </p>
            </div>
          </div>

          {/* Join Existing Workspace */}
          <div className="space-y-5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                2. Join Peer Session
              </h3>

              <form onSubmit={handleJoinExisting} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Room Identifier or Share Link
                  </label>
                  <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => {
                      setRoomIdInput(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="e.g. forge-quantum-pulse-9a4f"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-700/80 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-base sm:text-sm font-mono"
                  />
                  {inputError && (
                    <p className="text-xs text-rose-400 mt-1.5">{inputError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  className="w-full text-base py-3 min-h-[44px] font-semibold border-zinc-700 hover:border-zinc-500"
                >
                  Connect to Room
                </Button>
              </form>
            </div>

            {/* Architecture Highlights */}
            <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3.5 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2 text-zinc-300 font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Privacy & Zero Knowledge
              </div>
              <p className="text-[11px] leading-relaxed">
                Signaling exchanges only WebRTC network routes. Your code, markdown, and keystrokes travel strictly over direct peer data channels.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-start gap-3">
            <Cpu className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-zinc-200">Full-Mesh WebRTC</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Direct P2P RTCDataChannels between up to 5 participants. Ultra-low latency CRDT sync.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-start gap-3">
            <Database className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-zinc-200">Local-First IndexedDB</h4>
              <p className="text-xs text-zinc-400 mt-1">
                All documents are saved locally in the browser. Reload, disconnect, and edit offline seamlessly.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-start gap-3">
            <Code2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-zinc-200">Monaco + Markdown</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Rich VS Code-powered Monaco code editor with multi-language syntax and live Markdown split preview.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-zinc-500 py-4 border-t border-zinc-800/50">
        FORGE Open Source P2P Engineering Workspace • Zero Central Storage • WebRTC Mesh CRDT
      </footer>
    </div>
  );
};
