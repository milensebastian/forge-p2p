import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveSignalingServers, resolveIceServers, fetchDynamicIceServers, DEFAULT_SIGNALING_SERVERS, DEFAULT_ICE_SERVERS } from './signaling';
import { CollabManager } from './collab-manager';
import { startSignalingServer } from './signaling-server';
import http from 'http';
import https from 'https';
import { EventEmitter } from 'node:events';

describe('Signaling and ICE Server Resolution', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns default signaling servers when none provided', () => {
    const servers = resolveSignalingServers();
    expect(servers).toEqual(DEFAULT_SIGNALING_SERVERS);
  });

  it('parses comma-separated environment strings properly', () => {
    const custom = resolveSignalingServers('ws://127.0.0.1:4444, wss://signaling.example.com');
    expect(custom).toEqual(['ws://127.0.0.1:4444', 'wss://signaling.example.com']);
  });

  it('resolves default ICE servers when none provided', () => {
    const ice = resolveIceServers();
    expect(ice).toEqual(DEFAULT_ICE_SERVERS);
  });

  it('parses JSON formatted ICE servers from environment', () => {
    const customJson = JSON.stringify([
      { urls: 'stun:stun.example.com:3478' },
      { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }
    ]);
    const ice = resolveIceServers(customJson);
    expect(ice.length).toBe(2);
    expect(ice[1].username).toBe('user');
  });

  it('parses comma-separated STUN/TURN URLs from environment', () => {
    const ice = resolveIceServers('stun:stun.custom.com:3478, turn:turn.custom.com:3478');
    expect(ice).toEqual([{ urls: ['stun:stun.custom.com:3478', 'turn:turn.custom.com:3478'] }]);
  });

  it('keeps authenticated TURN and discards credential-less TURN URLs', async () => {
    const relay = { urls: ['turns:relay.example.com:443?transport=tcp'], username: 'user', credential: 'pass' };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      iceServers: [relay, { urls: 'turn:missing-credentials.example.com' }],
    }))));

    const ice = await fetchDynamicIceServers('wss://signal.example.com', [
      { urls: ['stun:custom.example.com', 'turn:invalid.example.com'] },
    ]);
    expect(ice).toEqual({ iceServers: [relay, { urls: ['stun:custom.example.com'] }], hasTurn: true });
  });

  it('falls back to usable direct ICE routes when the relay endpoint is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
    const ice = await fetchDynamicIceServers('wss://signal.example.com');
    expect(ice).toEqual({ iceServers: DEFAULT_ICE_SERVERS, hasTurn: false });
  });
});

describe('CollabManager (CRDT State Machine)', () => {
  let manager: CollabManager | null = null;

  afterEach(() => {
    if (manager) {
      manager.destroy();
      manager = null;
    }
  });

  it('initializes default documents and Y.Doc correctly', () => {
    manager = new CollabManager({
      roomId: 'test-room-unit-1',
      disableIndexedDB: true,
      disableWebRTC: true,
      localUser: {
        name: 'Unit Tester',
        color: '#10b981',
      },
    });

    const files = manager.getFiles();
    expect(files.length).toBe(2);
    expect(files.map((f) => f.name)).toContain('README.md');
    expect(files.map((f) => f.name)).toContain('architecture.ts');

    const readmeText = manager.getText('doc-readme').toString();
    expect(readmeText).toContain('FORGE');
  });

  it('adds and updates files in the CRDT tree', () => {
    manager = new CollabManager({
      roomId: 'test-room-unit-2',
      disableIndexedDB: true,
      disableWebRTC: true,
      localUser: {
        name: 'File Manager',
        color: '#06b6d4',
      },
    });

    const newFile = manager.addFile('main.py', 'code', 'python', 'print("hello world")');
    expect(newFile.name).toBe('main.py');
    expect(newFile.language).toBe('python');

    const text = manager.getText(newFile.id).toString();
    expect(text).toBe('print("hello world")');

    const files = manager.getFiles();
    expect(files.some((f) => f.id === newFile.id)).toBe(true);

    manager.deleteFile(newFile.id);
    const filesAfterDelete = manager.getFiles();
    expect(filesAfterDelete.some((f) => f.id === newFile.id)).toBe(false);
  });
});

describe('Signaling Server', () => {
  it('refreshes Xirsys credentials and requests an explicit lifetime', async () => {
    const makeRelay = (username: string) => ({
      urls: ['turns:relay.example.com:443?transport=tcp'],
      username,
      credential: 'example-credential',
    });
    const clock = vi.spyOn(Date, 'now');
    let upstreamCalls = 0;
    const request = vi.spyOn(https, 'request').mockImplementation(((options: https.RequestOptions, callback: (response: http.IncomingMessage) => void) => {
      expect(options.path).toBe('/_turn/demo?webrtc=1&expire=21600');
      const client = new EventEmitter() as http.ClientRequest;
      client.write = (() => true) as typeof client.write;
      client.end = (() => {
        const response = new EventEmitter() as http.IncomingMessage;
        response.statusCode = 200;
        callback(response);
        response.emit('data', JSON.stringify({ s: 'ok', v: { iceServers: [makeRelay('user-' + ++upstreamCalls)] } }));
        response.emit('end');
        return client;
      }) as typeof client.end;
      return client;
    }) as typeof https.request);
    const signaling = startSignalingServer({
      port: 4500, host: '127.0.0.1', xirsysIdent: 'test', xirsysSecret: 'test', xirsysChannel: 'demo',
    });
    const getRelay = async () => {
      const response = await fetch('http://127.0.0.1:4500/api/turn-credentials');
      expect(response.headers.get('cache-control')).toBe('no-store');
      return response.json();
    };
    try {
      clock.mockReturnValue(1000);
      expect(await getRelay()).toMatchObject({ hasTurn: true, ttl: 21600, iceServers: [expect.anything(), makeRelay('user-1')] });
      clock.mockReturnValue(2000);
      expect(await getRelay()).toMatchObject({ iceServers: [expect.anything(), makeRelay('user-1')] });
      clock.mockReturnValue(48000);
      expect(await getRelay()).toMatchObject({ iceServers: [expect.anything(), makeRelay('user-2')] });
      expect(request).toHaveBeenCalledTimes(2);
    } finally {
      request.mockRestore();
      clock.mockRestore();
      await signaling.close();
    }
  });

  it('starts and responds to HTTP /health endpoint', async () => {
    const signaling = startSignalingServer({ port: 4499, host: '127.0.0.1' });

    try {
      const response = await new Promise<{ status: string; service: string }>((resolve, reject) => {
        http.get('http://127.0.0.1:4499/health', (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });

      expect(response.status).toBe('healthy');
      expect(response.service).toContain('FORGE');
    } finally {
      await signaling.close();
    }
  });
});

