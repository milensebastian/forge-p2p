import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal, Button } from '@forge/ui';
import { Copy, Check, Smartphone, Wifi } from 'lucide-react';

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
          width: 240,
          margin: 1.5,
          color: {
            dark: '#09090b',
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
      title="Invite Peers to Workspace"
      description="Scan with a mobile camera or share the direct link to collaborate in real time."
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
          {qrDataUrl ? (
            <div className="p-2.5 bg-white rounded-lg shadow-sm">
              <img
                src={qrDataUrl}
                alt={`QR code for room ${roomId}`}
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
              />
            </div>
          ) : (
            <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-zinc-600 text-xs font-mono">
              Generating QR...
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-400">
            <Smartphone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span>Point camera to join on mobile device</span>
          </div>
        </div>

        {/* Room ID */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Room ID</span>
            <button
              onClick={handleCopyRoomId}
              className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white transition-colors"
            >
              {isRoomCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {isRoomCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="font-mono text-xs text-zinc-200 select-all break-all bg-zinc-900/80 px-2.5 py-1.5 rounded border border-zinc-850">
            {roomId}
          </div>
        </div>

        {/* Mobile LAN Share Link */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Direct Link</span>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white transition-colors"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {isCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="font-mono text-xs text-zinc-400 select-all break-all bg-zinc-900/80 px-2.5 py-1.5 rounded border border-zinc-850 truncate">
            {shareUrl || 'Resolving...'}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
};
