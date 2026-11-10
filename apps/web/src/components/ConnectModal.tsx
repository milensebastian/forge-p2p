import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal, Button, Badge } from '@forge/ui';
import { QrCode, Copy, Check, Smartphone, Wifi, ExternalLink } from 'lucide-react';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ isOpen, onClose, roomId }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isRoomCopied, setIsRoomCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function resolveUrl() {
      let host = window.location.host;
      const protocol = window.location.protocol;
      const pathname = window.location.pathname;

      // If on localhost, attempt to fetch LAN IP from signaling server health
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
          const res = await fetch(`http://${window.location.hostname}:4444/health`, {
            signal: AbortSignal.timeout(1500),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.lanIps && data.lanIps.length > 0) {
              const lanIp = data.lanIps[0];
              const port = window.location.port || '5173';
              host = `${lanIp}:${port}`;
            }
          }
        } catch {
          // Keep default host
        }
      }

      const finalUrl = `${protocol}//${host}${pathname}#room=${encodeURIComponent(roomId)}`;
      if (!active) return;
      setShareUrl(finalUrl);

      try {
        const url = await QRCode.toDataURL(finalUrl, {
          width: 256,
          margin: 1.5,
          color: {
            dark: '#090a0f',
            light: '#ffffff',
          },
        });
        if (active) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate QR code', err);
      }
    }

    resolveUrl();

    return () => {
      active = false;
    };
  }, [isOpen, roomId]);

  const handleCopyUrl = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyRoomId = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(roomId);
    }
    setIsRoomCopied(true);
    setTimeout(() => setIsRoomCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Mobile / Peer Device"
      description="Scan with your phone camera or share the direct LAN link to join this room in real time."
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
          {qrDataUrl ? (
            <div className="p-3 bg-white rounded-xl shadow-lg shadow-black/40">
              <img
                src={qrDataUrl}
                alt={`QR code to join room ${roomId}`}
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
            </div>
          ) : (
            <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center text-zinc-500 text-xs animate-pulse">
              Generating QR Code...
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 text-xs text-zinc-300">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Point your phone camera at the screen to open</span>
          </div>
        </div>

        {/* Room ID Badge & Copy */}
        <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Room ID:</span>
            <button
              onClick={handleCopyRoomId}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {isRoomCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {isRoomCopied ? 'Copied' : 'Copy Room ID'}
            </button>
          </div>
          <div className="font-mono text-sm font-semibold text-emerald-300 select-all break-all bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
            {roomId}
          </div>
        </div>

        {/* Mobile LAN Share Link */}
        <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Mobile Direct Link:</span>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
          <div className="font-mono text-xs text-zinc-300 select-all break-all bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800 line-clamp-2">
            {shareUrl || 'Resolving...'}
          </div>
        </div>

        {/* Notice on Wi-Fi connection */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-[11px] text-zinc-400">
          <Wifi className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>Both phone and laptop must be on the same local network (Wi-Fi or phone hotspot) to establish the direct WebRTC peer mesh.</span>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

