import http from 'http';
import https from 'https';
import os from 'os';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';

export interface SignalingServerOptions {
  port?: number;
  host?: string;
  turnSharedSecret?: string;
  turnRealm?: string;
  turnUrlsRaw?: string;
  turnStaticUser?: string;
  turnStaticCred?: string;
  xirsysIdent?: string;
  xirsysSecret?: string;
  xirsysChannel?: string;
}

export function getLanIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const DEFAULT_STUN_LIST = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:global.stun.twilio.com:3478',
  'stun:stun.cloudflare.com:3478',
];

export function startSignalingServer(options: SignalingServerOptions = {}) {
  const port = options.port || Number(process.env.PORT) || 4444;
  const host = options.host || '0.0.0.0';

  const turnSharedSecret = options.turnSharedSecret || process.env.TURN_SHARED_SECRET || '';
  const turnRealm = options.turnRealm || process.env.TURN_REALM || process.env.TURN_DOMAIN || '';
  const turnUrlsRaw = options.turnUrlsRaw || process.env.TURN_URLS || '';
  const turnStaticUser = options.turnStaticUser || process.env.TURN_USERNAME || '';
  const turnStaticCred = options.turnStaticCred || process.env.TURN_CREDENTIAL || process.env.TURN_PASSWORD || '';
  const xirsysIdent = options.xirsysIdent || process.env.XIRSYS_IDENT || '';
  const xirsysSecret = options.xirsysSecret || process.env.XIRSYS_SECRET || '';
  const xirsysChannel = options.xirsysChannel || process.env.XIRSYS_CHANNEL || 'default';

  let cachedXirsys: { iceServers: RTCIceServer[]; expiresAt: number } | null = null;

  async function fetchXirsysIceServers(): Promise<RTCIceServer[] | null> {
    if (!xirsysIdent || !xirsysSecret) return null;
    if (cachedXirsys && Date.now() < cachedXirsys.expiresAt) {
      return cachedXirsys.iceServers;
    }

    try {
      const auth = Buffer.from(`${xirsysIdent}:${xirsysSecret}`).toString('base64');
      const postData = JSON.stringify({ format: 'urls' });

      return await new Promise<RTCIceServer[]>((resolve, reject) => {
        const xReq = https.request(
          {
            hostname: 'global.xirsys.net',
            path: `/_turn/${encodeURIComponent(xirsysChannel)}`,
            method: 'PUT',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
            },
            timeout: 5000,
          },
          (xRes) => {
            let data = '';
            xRes.on('data', (chunk) => (data += chunk));
            xRes.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                if (parsed.s === 'ok' && parsed.v && parsed.v.iceServers) {
                  const xIce = parsed.v.iceServers;
                  const result: RTCIceServer[] = [
                    {
                      urls: xIce.urls,
                      username: xIce.username,
                      credential: xIce.credential,
                    },
                  ];
                  cachedXirsys = {
                    iceServers: result,
                    expiresAt: Date.now() + 30 * 60 * 1000, // cache for 30 minutes
                  };
                  resolve(result);
                } else {
                  reject(new Error(`Xirsys API response: ${data}`));
                }
              } catch (e) {
                reject(e);
              }
            });
          }
        );
        xReq.on('error', reject);
        xReq.on('timeout', () => {
          xReq.destroy();
          reject(new Error('Xirsys request timed out'));
        });
        xReq.write(postData);
        xReq.end();
      });
    } catch (err) {
      console.error('[FORGE Signaling] Xirsys fetch error:', err);
      return cachedXirsys ? cachedXirsys.iceServers : null;
    }
  }

  const topics = new Map<string, Set<WebSocket>>();
  const clientTopics = new Map<WebSocket, Set<string>>();

  async function generateIceServers() {
    const iceServers: RTCIceServer[] = [{ urls: DEFAULT_STUN_LIST }];

    // 1. Dynamic Xirsys API integration
    if (xirsysIdent && xirsysSecret) {
      const xirsysServers = await fetchXirsysIceServers();
      if (xirsysServers && xirsysServers.length > 0) {
        return {
          iceServers: [{ urls: DEFAULT_STUN_LIST }, ...xirsysServers],
          hasTurn: true,
          type: 'xirsys-dynamic',
        };
      }
    }

    // 2. Dynamic HMAC-SHA1 short-lived credentials (Coturn / RFC 5766)
    if (turnSharedSecret && (turnRealm || turnUrlsRaw)) {
      const ttl = 86400;
      const expiry = Math.floor(Date.now() / 1000) + ttl;
      const username = `${expiry}:forge-peer-${crypto.randomBytes(4).toString('hex')}`;
      const hmac = crypto.createHmac('sha1', turnSharedSecret);
      hmac.update(username);
      const credential = hmac.digest('base64');

      let urls: string[] = [];
      if (turnUrlsRaw) {
        urls = turnUrlsRaw.split(',').map((u) => u.trim()).filter(Boolean);
      } else if (turnRealm) {
        urls = [
          `turn:${turnRealm}:3478?transport=udp`,
          `turn:${turnRealm}:3478?transport=tcp`,
          `turns:${turnRealm}:5349?transport=tcp`,
          `turns:${turnRealm}:443?transport=tcp`,
        ];
      }

      iceServers.push({
        urls,
        username,
        credential,
      });

      return {
        iceServers,
        hasTurn: true,
        ttl,
        type: 'ephemeral-hmac',
      };
    }

    // 3. Static TURN credentials from environment
    if (turnUrlsRaw && turnStaticUser && turnStaticCred) {
      const urls = turnUrlsRaw.split(',').map((u) => u.trim()).filter(Boolean);
      iceServers.push({
        urls,
        username: turnStaticUser,
        credential: turnStaticCred,
      });
      return {
        iceServers,
        hasTurn: true,
        type: 'static',
      };
    }

    return {
      iceServers,
      hasTurn: false,
      warning: 'No TURN relay configured on signaling server. Strict symmetric NATs may fail.',
    };
  }

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          service: 'FORGE WebRTC Signaling Server',
          uptime: process.uptime(),
          activeConnections: wss.clients.size,
          activeRooms: topics.size,
          rooms: Array.from(topics.keys()),
          hasTurnConfigured: Boolean(turnSharedSecret || (turnUrlsRaw && turnStaticUser) || (xirsysIdent && xirsysSecret)),
          lanIps: getLanIps(),
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    if (req.method === 'GET' && (parsedUrl.pathname === '/api/turn-credentials' || parsedUrl.pathname === '/turn-credentials')) {
      generateIceServers()
        .then((result) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        })
        .catch((err) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              iceServers: [{ urls: DEFAULT_STUN_LIST }],
              hasTurn: false,
              warning: err.message,
            })
          );
        });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  const wss = new WebSocketServer({ server });

  const HEARTBEAT_INTERVAL_MS = 25000;
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  wss.on('connection', (ws: any) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    clientTopics.set(ws, new Set());

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
          case 'subscribe': {
            if (Array.isArray(data.topics)) {
              for (let topic of data.topics) {
                if (typeof topic === 'string') {
                  topic = topic.toLowerCase();
                  if (!topics.has(topic)) {
                    topics.set(topic, new Set());
                  }
                  topics.get(topic)!.add(ws);
                  clientTopics.get(ws)!.add(topic);
                }
              }
            }
            break;
          }

          case 'unsubscribe': {
            if (Array.isArray(data.topics)) {
              for (let topic of data.topics) {
                if (typeof topic === 'string') {
                  topic = topic.toLowerCase();
                  if (topics.has(topic)) {
                    topics.get(topic)!.delete(ws);
                    clientTopics.get(ws)?.delete(topic);
                    if (topics.get(topic)!.size === 0) {
                      topics.delete(topic);
                    }
                  }
                }
              }
            }
            break;
          }

          case 'publish': {
            let topic = data.topic;
            if (typeof topic === 'string') {
              topic = topic.toLowerCase();
              data.topic = topic;
              if (topics.has(topic)) {
                const subscribers = topics.get(topic)!;
                data.clients = subscribers.size;
                const payload = JSON.stringify(data);
                for (const receiver of subscribers) {
                  if (receiver !== ws && receiver.readyState === WebSocket.OPEN) {
                    receiver.send(payload);
                  }
                }
              }
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }
        }
      } catch (err: any) {
        console.warn('[Signaling] Malformed message received:', err?.message || err);
      }
    });

    ws.on('close', () => {
      const subs = clientTopics.get(ws);
      if (subs) {
        for (const topic of subs) {
          if (topics.has(topic)) {
            topics.get(topic)!.delete(ws);
            if (topics.get(topic)!.size === 0) {
              topics.delete(topic);
            }
          }
        }
      }
      clientTopics.delete(ws);
    });

    ws.on('error', (err: Error) => {
      console.warn('[Signaling] WebSocket client error:', err.message);
    });
  });

  server.listen(port, host, () => {
    console.log(`[FORGE Signaling] Running on ws://${host}:${port} (HTTP /health and /api/turn-credentials available)`);
  });

  return {
    server,
    wss,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(heartbeat);
        wss.clients.forEach((ws) => ws.terminate());
        wss.close(() => {
          server.close(() => resolve());
        });
      }),
  };
}
