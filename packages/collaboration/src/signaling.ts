/**
 * Default public signaling servers for production and fallback.
 * Primary: Render-hosted production signaling server for FORGE.
 * Fallbacks: Public Yjs signaling cluster.
 * Can be overridden via VITE_SIGNALING_SERVERS (comma-delimited).
 */
export const DEFAULT_SIGNALING_SERVERS = [
  'wss://forge-signaling.onrender.com',
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-eu.fly.dev',
];

/**
 * Multiple reliable public STUN servers for cross-network NAT discovery.
 * Includes Google, Twilio, and Cloudflare STUN endpoints across diverse backbones.
 */
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:global.stun.twilio.com:3478',
      'stun:stun.cloudflare.com:3478',
    ],
  },
];

/**
 * Resolves signaling server list from environment variables or sensible defaults.
 */
export function resolveSignalingServers(envSignaling?: string): string[] {
  if (envSignaling && typeof envSignaling === 'string') {
    const list = envSignaling
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (list.length > 0) return list;
  }

  // Check Vite environment variable if in browser context
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (metaEnv && metaEnv.VITE_SIGNALING_SERVERS) {
    const fromMeta = metaEnv.VITE_SIGNALING_SERVERS
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    if (fromMeta.length > 0) return fromMeta;
  }

  // In browser context: dynamically resolve to host:4444 only if explicitly on localhost or direct private LAN IP
  // For production domains (e.g. forge-p2p.vercel.app), use DEFAULT_SIGNALING_SERVERS (Render WSS)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const isLanIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

    if (isLocalhost || isLanIp) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return [`${protocol}//${host}:4444`];
    }
  }

  return DEFAULT_SIGNALING_SERVERS;
}

/**
 * Resolves static or environment-configured ICE / STUN / TURN servers.
 * Can be overridden via VITE_ICE_SERVERS (JSON array or comma-delimited STUN/TURN URLs).
 */
export function resolveIceServers(envIce?: string): RTCIceServer[] {
  const raw = envIce || (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_ICE_SERVERS : undefined);

  if (raw && typeof raw === 'string') {
    const trimmed = raw.trim();
    // Try parsing as JSON array of RTCIceServer objects
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as RTCIceServer[];
        }
      } catch {
        // Fall back to delimited string parsing
      }
    }

    // Parse comma-separated STUN/TURN URLs
    const urls = trimmed
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length > 0) {
      return [{ urls }];
    }
  }

  return DEFAULT_ICE_SERVERS;
}

export interface DynamicIceResult {
  iceServers: RTCIceServer[];
  hasTurn: boolean;
  warning?: string;
}

/**
 * Fetches dynamic ICE / TURN credentials from the signaling server HTTP endpoint.
 * Falls back to resolveIceServers() if unavailable or unreachable.
 */
export async function fetchDynamicIceServers(signalingWsUrl?: string): Promise<DynamicIceResult> {
  const staticIce = resolveIceServers();
  const hasStaticTurn = staticIce.some((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some((u) => u.startsWith('turn:') || u.startsWith('turns:'));
  });

  if (!signalingWsUrl && typeof window === 'undefined') {
    return { iceServers: staticIce, hasTurn: hasStaticTurn };
  }

  // Derive HTTP base URL from signaling WebSocket URL
  let httpBase: string | null = null;
  const targetWs = signalingWsUrl || DEFAULT_SIGNALING_SERVERS[0];

  try {
    const parsed = new URL(targetWs);
    const protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
    httpBase = `${protocol}//${parsed.host}`;
  } catch {
    httpBase = null;
  }

  if (!httpBase) {
    return { iceServers: staticIce, hasTurn: hasStaticTurn };
  }

  try {
    const res = await fetch(`${httpBase}/api/turn-credentials`, {
      signal: AbortSignal.timeout(3000),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        // Merge with our default STUN servers if not already present
        const merged: RTCIceServer[] = [...data.iceServers];
        for (const defaultStun of DEFAULT_ICE_SERVERS) {
          const defaultUrls = Array.isArray(defaultStun.urls) ? defaultStun.urls : [defaultStun.urls];
          const alreadyPresent = merged.some((m) => {
            const mUrls = Array.isArray(m.urls) ? m.urls : [m.urls];
            return mUrls.some((u) => defaultUrls.includes(u));
          });
          if (!alreadyPresent) {
            merged.push(defaultStun);
          }
        }
        return {
          iceServers: merged,
          hasTurn: Boolean(data.hasTurn),
          warning: data.warning,
        };
      }
    }
  } catch {
    // If dynamic endpoint unreachable, fall back gracefully
  }

  return {
    iceServers: staticIce,
    hasTurn: hasStaticTurn,
    warning: hasStaticTurn ? undefined : 'No TURN relay configured. Strict symmetric NATs may fail.',
  };
}
