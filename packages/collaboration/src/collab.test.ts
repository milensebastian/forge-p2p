import { describe, it, expect, afterEach } from 'vitest';
import { resolveSignalingServers, DEFAULT_SIGNALING_SERVERS } from './signaling';
import { CollabManager } from './collab-manager';
import { startSignalingServer } from './signaling-server';
import http from 'http';

describe('Signaling Server Resolution', () => {
  it('returns default signaling servers when none provided', () => {
    const servers = resolveSignalingServers();
    expect(servers).toEqual(DEFAULT_SIGNALING_SERVERS);
  });

  it('parses comma-separated environment strings properly', () => {
    const custom = resolveSignalingServers('ws://127.0.0.1:4444, wss://signaling.example.com');
    expect(custom).toEqual(['ws://127.0.0.1:4444', 'wss://signaling.example.com']);
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

