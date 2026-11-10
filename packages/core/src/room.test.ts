import { describe, it, expect } from 'vitest';
import { generateRoomId, isValidRoomId, parseRoomFromUrl, formatRoomUrl } from './room';
import { calculateMeshChannels, getRandomColor, getRandomName, PARTICIPANT_COLORS } from './templates';

describe('Room Utilities', () => {
  it('generates a valid formatted room ID', () => {
    const id = generateRoomId();
    expect(id).toMatch(/^forge-[a-z]+-[a-z]+-[0-9a-f]{4}$/);
    expect(isValidRoomId(id)).toBe(true);
  });

  it('validates room IDs correctly', () => {
    expect(isValidRoomId('forge-dev-room-1234')).toBe(true);
    expect(isValidRoomId('project_alpha')).toBe(true);
    expect(isValidRoomId('ab')).toBe(false); // too short
    expect(isValidRoomId('')).toBe(false);
    expect(isValidRoomId('bad room with spaces!')).toBe(false);
  });

  it('parses room ID from hash or query params', () => {
    expect(parseRoomFromUrl('https://forge.dev/#room=alpha-mesh-1234')).toBe('alpha-mesh-1234');
    expect(parseRoomFromUrl('https://forge.dev/?room=alpha-mesh-1234')).toBe('alpha-mesh-1234');
    expect(parseRoomFromUrl('#room=direct-room-99')).toBe('direct-room-99');
    expect(parseRoomFromUrl('plain-room-id')).toBe('plain-room-id');
    expect(parseRoomFromUrl('')).toBe(null);
  });

  it('formats room URLs properly', () => {
    const url = formatRoomUrl('room-xyz', 'https://forge.workspace');
    expect(url).toBe('https://forge.workspace#room=room-xyz');
  });
});

describe('Templates & Mesh calculations', () => {
  it('calculates full mesh channels accurately', () => {
    expect(calculateMeshChannels(1)).toBe(0);
    expect(calculateMeshChannels(2)).toBe(1);
    expect(calculateMeshChannels(3)).toBe(3);
    expect(calculateMeshChannels(4)).toBe(6);
    expect(calculateMeshChannels(5)).toBe(10);
  });

  it('provides random colors from the defined palette', () => {
    const color = getRandomColor();
    expect(PARTICIPANT_COLORS).toContain(color);
  });

  it('generates non-empty engineer names', () => {
    const name = getRandomName();
    expect(name.length).toBeGreaterThan(3);
  });
});

