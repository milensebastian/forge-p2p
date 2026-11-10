import http from 'http';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';

export interface SignalingServerOptions {
  port?: number;
  host?: string;
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

export function startSignalingServer(options: SignalingServerOptions = {}) {
  const port = options.port || Number(process.env.PORT) || 4444;
  const host = options.host || '0.0.0.0';

  // Map of topic -> Set of client WebSockets
  const topics = new Map<string, Set<WebSocket>>();
  // Map of client WebSocket -> Set of topics
  const clientTopics = new Map<WebSocket, Set<string>>();

  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(
        JSON.stringify({
          status: 'healthy',
          service: 'FORGE WebRTC Signaling Server',
          uptime: process.uptime(),
          activeConnections: wss.clients.size,
          activeRooms: topics.size,
          rooms: Array.from(topics.keys()),
          lanIps: getLanIps(),
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    clientTopics.set(ws, new Set());

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
          case 'subscribe': {
            if (Array.isArray(data.topics)) {
              for (const topic of data.topics) {
                if (typeof topic === 'string') {
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
              for (const topic of data.topics) {
                if (typeof topic === 'string' && topics.has(topic)) {
                  topics.get(topic)!.delete(ws);
                  clientTopics.get(ws)?.delete(topic);
                  if (topics.get(topic)!.size === 0) {
                    topics.delete(topic);
                  }
                }
              }
            }
            break;
          }

          case 'publish': {
            const topic = data.topic;
            if (typeof topic === 'string' && topics.has(topic)) {
              const subscribers = topics.get(topic)!;
              const payload = message.toString();
              for (const receiver of subscribers) {
                if (receiver !== ws && receiver.readyState === WebSocket.OPEN) {
                  receiver.send(payload);
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
            topics.get(topic)!.delete(ws);
            if (topics.get(topic)!.size === 0) {
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
    console.log(`[FORGE Signaling] Running on ws://${host}:${port} (HTTP /health available)`);
  });

  return {
    server,
    wss,
    close: () =>
      new Promise<void>((resolve) => {
        wss.close(() => {
          server.close(() => resolve());
        });
      }),
  };
}

