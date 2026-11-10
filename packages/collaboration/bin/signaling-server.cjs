#!/usr/bin/env node
const http = require('http');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

const port = Number(process.env.PORT) || 4444;
const host = process.env.HOST || '0.0.0.0';

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
                if (receiver.readyState === WebSocket.OPEN) {
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
  console.log(`  FORGE WebRTC Signaling Server`);
  console.log(`  Listening on ws://${host}:${port}`);
  console.log(`  Health Check: http://${host}:${port}/health`);
  console.log(`====================================================`);
});

