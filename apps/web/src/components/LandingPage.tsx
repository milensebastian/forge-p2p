import React, { useState, useEffect } from 'react';
import { generateRoomId, isValidRoomId, parseRoomFromUrl, getRandomName, getRandomColor } from '@forge/core';
import { Button } from '@forge/ui';
import {
  ArrowRight,
  Code2,
  Radio,
  FileCode,
  Layers,
  Database,
  Lock,
  Plus,
  Compass,
} from 'lucide-react';

interface LandingPageProps {
  onJoinRoom: (roomId: string, userName: string, userColor: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onJoinRoom }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
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
      if (window.location.protocol === 'https:') return;
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
      setInputError('Enter a valid room ID (e.g. forge-quantum-pulse-9a4f)');
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

  const colorPalette = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-8 md:p-12 font-sans selection:bg-zinc-800 selection:text-zinc-100">
      {/* Top Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-zinc-900">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
            <Code2 className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">FORGE</span>
          <span className="text-[11px] font-mono text-zinc-500 border border-zinc-800/80 rounded px-1.5 py-0.5">
            P2P
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>WebRTC Mesh • Yjs CRDT</span>
          </div>
          <a
            href="https://github.com/milensebastian/forge-p2p"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-200 transition-colors"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full my-auto py-10 sm:py-16">
        {/* Hero Copy */}
        <div className="text-center mb-8 sm:mb-10 space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Collaborative engineering, <br />
            direct peer-to-peer.
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto font-normal leading-relaxed">
            Real-time markdown and code editor synced over WebRTC data channels.
            Zero cloud storage, 100% local in your browser.
          </p>
        </div>

        {/* LAN Discovery Notice */}
        {detectedRooms.length > 0 && (
          <div className="mb-6 p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Workspace detected on local network:</span>
              <span className="font-mono text-emerald-400 font-medium">{detectedRooms[0]}</span>
            </div>
            <button
              onClick={() => handleJoinDetected(detectedRooms[0])}
              className="text-xs text-white hover:text-emerald-400 font-medium transition-colors"
            >
              Join &rarr;
            </button>
          </div>
        )}

        {/* Workspace Launcher Card */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 sm:p-7 shadow-xl backdrop-blur-xs">
          {/* Segmented Tab Bar */}
          <div className="flex items-center p-1 bg-zinc-950/80 rounded-lg border border-zinc-800/80 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-zinc-850 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Workspace</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'join'
                  ? 'bg-zinc-850 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Join Existing</span>
            </button>
          </div>

          {/* Peer Profile Configuration */}
          <div className="mb-6 pb-6 border-b border-zinc-800/70">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="w-full sm:w-auto flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Your Handle
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Cursor Color
                </label>
                <div className="flex items-center gap-2 py-1">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setUserColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full transition-all ${
                        userColor === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-105'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Panels */}
          {activeTab === 'create' ? (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Creates an ephemeral, end-to-end synchronized workspace. Share the room link or QR code with up to 4 peers to collaborate in real time.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleCreateNew}
                className="w-full"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Create Workspace
              </Button>
            </div>
          ) : (
            <form onSubmit={handleJoinExisting} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Room ID or Share URL
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
                  placeholder="forge-quantum-pulse-9a4f"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                />
                {inputError && (
                  <p className="text-xs text-rose-400 mt-1.5">{inputError}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
              >
                Join Room
              </Button>
            </form>
          )}
        </div>

        {/* Feature Specs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-zinc-900 text-xs text-zinc-400">
          <div className="space-y-1">
            <div className="font-medium text-zinc-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>Full-Mesh WebRTC</span>
            </div>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Direct peer-to-peer RTCDataChannels with automatic STUN/TURN fallback.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-medium text-zinc-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span>Local-First IndexedDB</span>
            </div>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Documents persist in the browser. Zero central database storing your work.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-medium text-zinc-300 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-zinc-400" />
              <span>Monaco & Markdown</span>
            </div>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              VS Code editor engine with multi-language syntax and live split preview.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-600 pt-6 border-t border-zinc-900">
        <span>FORGE • Open Source P2P Workspace</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-zinc-500" />
            DTLS 1.2 Encrypted
          </span>
          <span>IndexedDB Local Storage</span>
        </div>
      </footer>
    </div>
  );
};
