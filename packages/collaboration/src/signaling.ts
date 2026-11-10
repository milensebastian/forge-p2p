/**
 * Default public signaling servers for development and fallback.
 * Can be overridden via VITE_SIGNALING_SERVERS (comma-delimited).
 */
export const DEFAULT_SIGNALING_SERVERS = [
  'ws://localhost:4444',
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.herokuapp.com'
];

/**
 * Standard public STUN servers for ICE discovery.
 */
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
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

  // In browser context: dynamically resolve to the host serving the web application
  // This ensures mobile/remote devices (e.g. phone at http://172.20.10.2:5173) connect to
  // ws://172.20.10.2:4444 rather than attempting to connect to their own local loopback.
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    return [`${protocol}//${host}:4444`];
  }

  return DEFAULT_SIGNALING_SERVERS;
}

