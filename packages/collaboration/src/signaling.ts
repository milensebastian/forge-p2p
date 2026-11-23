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

function isTurnUrl(url: string): boolean {
  return /^turns?:/i.test(url);
}

export function hasTurnServer(servers: RTCIceServer[]): boolean {
  return servers.some(({ urls, username, credential }) =>
    Boolean(username && credential && [urls].flat().some(isTurnUrl))
  );
}

export function usableIceServers(servers: unknown[]): RTCIceServer[] {
  const result: RTCIceServer[] = [];
  for (const value of servers) {
    if (!value || typeof value !== 'object') continue;
    const { urls: rawUrls, username, credential } = value as Partial<RTCIceServer>;
    const urls = [rawUrls].flat().filter((url): url is string =>
      typeof url === 'string' && /^(stuns?|turns?):/i.test(url)
    );
    const stun = urls.filter((url) => !isTurnUrl(url));
    const turn = urls.filter(isTurnUrl);
    if (stun.length) result.push({ urls: stun });
    if (turn.length && typeof username === 'string' && username &&
        typeof credential === 'string' && credential) {
      result.push({ urls: turn, username, credential });
    }
  }
  return result;
}

/** Resolve fresh credentials before starting WebRTC, including after a Render cold start. */
export async function fetchDynamicIceServers(
  signalingWsUrl: string,
  fallback = resolveIceServers(),
  signal?: AbortSignal
): Promise<DynamicIceResult> {
  const fallbackIce = usableIceServers(fallback);
  const fallbackResult = { iceServers: fallbackIce, hasTurn: hasTurnServer(fallbackIce) };
  const request = new AbortController();
  const cancelRequest = () => request.abort();
  if (signal?.aborted) return fallbackResult;
  signal?.addEventListener('abort', cancelRequest, { once: true });
  const timeout = setTimeout(cancelRequest, 45000);
  try {
    const endpoint = new URL(signalingWsUrl);
    if (endpoint.protocol !== 'ws:' && endpoint.protocol !== 'wss:') return fallbackResult;
    endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
    const response = await fetch(new URL('/api/turn-credentials', endpoint), {
      signal: request.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return fallbackResult;

    const { iceServers } = await response.json();
    if (!Array.isArray(iceServers)) return fallbackResult;

    const remote = usableIceServers(iceServers);
    if (!hasTurnServer(remote)) return fallbackResult;
    const seen = new Set<string>();
    const merged = [...remote, ...fallbackIce].flatMap((server) => {
      const urls = [server.urls].flat().filter((url) => {
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
      return urls.length ? [{ ...server, urls }] : [];
    });
    return { iceServers: merged, hasTurn: true };
  } catch {
    return fallbackResult;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancelRequest);
  }
}
