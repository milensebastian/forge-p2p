const ADJECTIVES = [
  'hyper', 'quantum', 'cyber', 'vector', 'sonic', 'stellar', 'plasma', 'atomic',
  'binary', 'neural', 'flux', 'zenith', 'apex', 'vortex', 'crypto', 'prime'
];

const NOUNS = [
  'forge', 'node', 'mesh', 'orbit', 'matrix', 'stream', 'core', 'pulse',
  'nexus', 'beacon', 'array', 'relay', 'vault', 'prism', 'sector', 'cluster'
];

/**
 * Generates a clean, readable, collision-resistant room identifier.
 * Format: forge-[adj]-[noun]-[4-digit hex]
 * Example: forge-quantum-pulse-9a4f
 */
export function generateRoomId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return `forge-${adj}-${noun}-${suffix}`;
}

/**
 * Validates whether a room ID adheres to valid identifier format.
 * Allows alphanumeric and hyphen strings between 3 and 64 characters.
 */
export function isValidRoomId(roomId: string): boolean {
  if (!roomId || typeof roomId !== 'string') return false;
  const trimmed = roomId.trim();
  if (trimmed.length < 3 || trimmed.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Extracts a room ID from the current browser URL (hash or query param).
 * Priority: #room=xxx > ?room=xxx > #xxx (if valid)
 */
export function parseRoomFromUrl(urlOrHash: string): string | null {
  if (!urlOrHash) return null;

  try {
    const raw = urlOrHash.trim();
    // 1. Try URLSearchParams if full URL or query string
    if (raw.includes('?')) {
      const queryString = raw.split('?')[1].split('#')[0];
      const params = new URLSearchParams(queryString);
      const room = params.get('room');
      if (room && isValidRoomId(room)) return room.trim().toLowerCase();
    }

    // 2. Try hash fragments (#room=xyz or #xyz)
    if (raw.includes('#')) {
      const hashContent = raw.split('#')[1];
      if (hashContent.startsWith('room=')) {
        const room = hashContent.substring(5).split('&')[0];
        if (room && isValidRoomId(room)) return room.trim().toLowerCase();
      } else if (isValidRoomId(hashContent)) {
        return hashContent.trim().toLowerCase();
      }
    }

    // 3. Direct identifier
    if (isValidRoomId(raw)) {
      return raw.toLowerCase();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Formats a shareable workspace URL with a room ID hash fragment.
 */
export function formatRoomUrl(roomId: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');
  return `${base}#room=${encodeURIComponent(roomId)}`;
}

