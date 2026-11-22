#!/usr/bin/env node
const http = require('http');
const https = require('https');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');

const port = Number(process.env.PORT) || 4444;
const host = process.env.HOST || '0.0.0.0';

// Configurable TURN relay secrets (RFC 5766 REST API)
const turnSharedSecret = process.env.TURN_SHARED_SECRET || '';
const turnRealm = process.env.TURN_REALM || process.env.TURN_DOMAIN || '';
const turnUrlsRaw = process.env.TURN_URLS || '';
const turnStaticUser = process.env.TURN_USERNAME || '';
const turnStaticCred = process.env.TURN_CREDENTIAL || process.env.TURN_PASSWORD || '';
const xirsysIdent = process.env.XIRSYS_IDENT || '';
const xirsysSecret = process.env.XIRSYS_SECRET || '';
const xirsysChannel = process.env.XIRSYS_CHANNEL || 'default';

let cachedXirsys = null;

async function fetchXirsysIceServers() {
  if (!xirsysIdent || !xirsysSecret) return null;
  if (cachedXirsys && Date.now() < cachedXirsys.expiresAt) {
    return cachedXirsys.iceServers;
  }

  try {
    const auth = Buffer.from(`${xirsysIdent}:${xirsysSecret}`).toString('base64');
    const postData = JSON.stringify({ format: 'urls' });

    return await new Promise((resolve, reject) => {
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
                const result = [
                  {
                    urls: xIce.urls,
                    username: xIce.username,
                    credential: xIce.credential,
                  },
                ];
                cachedXirsys = {
                  iceServers: result,
                  expiresAt: Date.now() + 30 * 60 * 1000,
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
        reject(new Error('Xirsys timeout'));
      });
      xReq.write(postData);
      xReq.end();
    });
  } catch (err) {
    console.error('[FORGE Signaling] Xirsys fetch error:', err);
    return cachedXirsys ? cachedXirsys.iceServers : null;
  }
}

const topics = new Map();
const clientTopics = new Map();

function getLanIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

/**
 * Standard public STUN servers always provided
 */
const DEFAULT_STUN_LIST = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:global.stun.twilio.com:3478',
  'stun:stun.cloudflare.com:3478',
];

/**
 * Generates dynamic time-limited TURN credentials if secret is configured,
 * or returns static TURN / STUN fallbacks.
 */
async function generateIceServers() {
  const iceServers = [{ urls: DEFAULT_STUN_LIST }];

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
    const ttl = 86400; // 24 hours
    const expiry = Math.floor(Date.now() / 1000) + ttl;
    const username = `${expiry}:forge-peer-${crypto.randomBytes(4).toString('hex')}`;
    const hmac = crypto.createHmac('sha1', turnSharedSecret);
    hmac.update(username);
    const credential = hmac.digest('base64');

    let urls = [];
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

  // 4. Fallback: STUN only
  return {
    iceServers,
    hasTurn: false,
    warning: 'No TURN relay configured on signaling server. Devices behind strict symmetric NATs or restrictive firewalls may fail to connect.',
  };
}

const server = http.createServer((req, res) => {
  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health check endpoint
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
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

  // Ephemeral TURN credentials endpoint
  if (req.method === 'GET' && (url.pathname === '/api/turn-credentials' || url.pathname === '/turn-credentials')) {
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

// Keep-alive heartbeat: ping every 25 seconds to keep Render / Cloudflare / Nginx proxy connections open
const HEARTBEAT_INTERVAL_MS = 25000;
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
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

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  clientTopics.set(ws, new Set());

  ws.on('message', (message) => {
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
                topics.get(topic).add(ws);
                clientTopics.get(ws).add(topic);
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
                  topics.get(topic).delete(ws);
                  clientTopics.get(ws)?.delete(topic);
                  if (topics.get(topic).size === 0) {
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
              const subscribers = topics.get(topic);
              data.clients = subscribers.size;
              const payload = JSON.stringify(data);
              for (const receiver of subscribers) {
                // Do not echo back to the sender
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
    } catch (err) {
      console.warn('[Signaling] Malformed message received:', err);
    }
  });

  ws.on('close', () => {
    const subs = clientTopics.get(ws);
    if (subs) {
      for (const topic of subs) {
        if (topics.has(topic)) {
          topics.get(topic).delete(ws);
          if (topics.get(topic).size === 0) {
            topics.delete(topic);
          }
        }
      }
    }
    clientTopics.delete(ws);
  });

  ws.on('error', (err) => {
    console.warn('[Signaling] WebSocket client error:', err.message);
  });
});

server.listen(port, host, () => {
  console.log(`====================================================`);
  console.log(`  FORGE WebRTC Signaling Server (v2.0 Production)`);
  console.log(`  Listening on ws://${host}:${port}`);
  console.log(`  Health Check: http://${host}:${port}/health`);
  console.log(`  TURN Credentials: http://${host}:${port}/api/turn-credentials`);
  console.log(`====================================================`);
});

// Graceful shutdown
function shutdown() {
  console.log('\n[Signaling] Shutting down gracefully...');
  clearInterval(heartbeat);
  wss.clients.forEach((ws) => ws.terminate());
  server.close(() => {
    console.log('[Signaling] Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
