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
            dark: '#0c0d10',
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
        <div className="flex flex-col items-center justify-center p-4 bg-[#0c0d10] border border-[#23252f] rounded-lg">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Workspace QR code"
              className="w-48 h-48 rounded-md bg-white p-2 shadow-xs"
            />
          ) : (
            <div className="w-48 h-48 rounded-md bg-[#14151b] flex items-center justify-center text-zinc-500 text-xs">
              Generating QR...
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-3 font-mono">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span>Instant mobile camera pairing</span>
          </div>
        </div>

        {/* Share URL */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Share Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-1.5 rounded-md bg-[#0c0d10] border border-[#23252f] text-xs font-mono text-zinc-300 focus:outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyUrl}
              icon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {isCopied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Room ID Copy */}
        <div className="p-3 rounded-md bg-[#0c0d10] border border-[#1e2029] flex items-center justify-between text-xs font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Room Identifier</div>
            <div className="text-zinc-200 font-medium truncate max-w-[220px]">{roomId}</div>
          </div>
          <button
            onClick={handleCopyRoomId}
            className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
            title="Copy room ID"
          >
            {isRoomCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="p-2.5 rounded-md bg-[#14151b] border border-[#1e2029] text-[11px] text-zinc-400 flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Peers connect via direct WebRTC data channels with automatic STUN/TURN fallback.</span>
        </div>
      </div>
    </Modal>
  );
};
