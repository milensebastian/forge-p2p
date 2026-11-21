# FORGE Production Deployment & Infrastructure Guide

This guide details the deployment, configuration, and operation of FORGE's P2P collaborative engine across Vercel (Frontend), Render / Ubuntu VPS (Signaling Server), and STUN/TURN relays for cross-network connectivity.

---

## 1. Architecture Overview

FORGE uses a hybrid architecture designed for zero data lock-in and high-performance real-time collaboration:
- **Frontend (Vercel):** Single-page React application delivering the editor, CRDT document engine (Yjs), and WebRTC mesh manager.
- **Signaling Server (Render or Ubuntu VPS):** Lightweight Node.js WebSocket service for room presence, SDP offer/answer exchanges, ICE candidate forwarding, and ephemeral TURN credential vending via RFC 5766 REST API.
- **NAT Traversal (STUN/TURN):**
  - **STUN (Google, Twilio, Cloudflare):** Facilitates direct P2P connections across standard NATs.
  - **TURN Relay (Coturn or Managed TURN):** Guarantees connectivity when one or both peers are behind symmetric NATs or restrictive firewalls (such as university or corporate Wi-Fi and mobile cellular CGNAT).

---

## 2. Frontend Deployment (Vercel)

The repository includes `vercel.json` configured with Vite SPA routing rules.

### Environment Variables
Configure the following in the **Vercel Project Settings > Environment Variables**:

| Variable | Description | Example Value |
|---|---|---|
| `VITE_SIGNALING_SERVERS` | Comma-delimited list of secure WebSocket signaling servers | `wss://forge-signaling.onrender.com` |
| `VITE_ICE_SERVERS` | *(Optional)* Custom JSON or comma-separated STUN/TURN servers | `stun:stun.l.google.com:19302,turn:turn.example.com:3478` |

*(Note: When `VITE_SIGNALING_SERVERS` is set, FORGE automatically fetches ephemeral TURN credentials from the signaling server's `/api/turn-credentials` endpoint without needing static TURN credentials in the frontend bundle).*

---

## 3. Signaling Server Deployment (Render)

FORGE is pre-configured to run seamlessly on Render's Web Service (Node.js runtime).

### Render Service Settings:
- **Environment:** `Node`
- **Build Command:** `npm install --omit=dev`
- **Start Command:** `node packages/collaboration/bin/signaling-server.cjs`
- **Health Check Path:** `/health`

### Environment Variables on Render:
| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Service port assigned by Render | Automatically assigned (e.g. `10000`) |
| `HOST` | Bind host | `0.0.0.0` |
| `ALLOWED_ORIGINS` | Permitted origins for CORS and WebSocket handshake | `*` or `https://forge-p2p.vercel.app` |
| `TURN_URLS` | Comma-delimited TURN server URLs | `turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:5349` |
| `TURN_SHARED_SECRET` | Secret token used to generate short-lived RFC 5766 credentials | *(Random secure 32+ char string)* |
| `TURN_REALM` | Realm configured on your TURN server | `forge-turn` |
| `TURN_TTL_SECONDS` | Lifetime of vended ephemeral credentials | `86400` (24 hours) |

---

## 4. Signaling Server Deployment (Ubuntu VPS)

For independent hosting without Render's free-tier sleep limits:

### Server Setup (Ubuntu 22.04 / 24.04):
```bash
# Update and install Node.js 20 & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get update && sudo apt-get install -y nodejs git
sudo npm install -g pm2

# Prepare app directory
sudo mkdir -p /opt/forge && sudo chown -R $USER:$USER /opt/forge
git clone https://github.com/milensebastian/forge-p2p.git /opt/forge
cd /opt/forge
npm ci --omit=dev

# Start with PM2
pm2 start deploy/ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

### Reverse Proxy & SSL (Caddy or Nginx):
Configurations are provided in `deploy/caddy/Caddyfile` and `deploy/nginx/forge-signaling.conf`.

#### Using Caddy (Automatic HTTPS):
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Copy Caddyfile and reload
sudo cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
# Edit your domain in /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## 5. GitHub Actions CI/CD Deployment

Whenever changes are pushed to `main` under `packages/collaboration/**` or `deploy/**`, `.github/workflows/deploy-signaling.yml` runs tests and updates the VPS.

### Configure GitHub Repository Secrets:
Go to **GitHub Repo > Settings > Secrets and variables > Actions > New repository secret**:
- `VPS_HOST`: Public IP address or domain of the VPS.
- `VPS_USERNAME`: SSH username (e.g. `ubuntu` or `root`).
- `VPS_SSH_KEY`: Private SSH Key (ensure public key is in `~/.ssh/authorized_keys` on VPS).
- `VPS_PORT`: *(Optional)* SSH port (defaults to 22).

---

## 6. Configuring TURN Relay (Coturn or Free Managed Providers)

STUN alone is insufficient when one or both peers are behind symmetric NAT (common on college Wi-Fi, eduroam, enterprise firewalls, and 4G/5G mobile CGNAT). A TURN relay server is required.

### Option A: Free Hosted TURN (Metered.ca or OpenRelay)
1. Sign up for a free account at [Metered.ca](https://www.metered.ca/tools/openrelay/) (provides 50 GB free TURN relay traffic monthly).
2. Metered generates an API key or static TURN credentials.
3. Configure the TURN credentials:
   - In Render environment: Set `TURN_STATIC_USERNAME` and `TURN_STATIC_CREDENTIAL` and `TURN_URLS`.
   - Or directly in Vercel: Set `VITE_ICE_SERVERS` with the JSON array provided by Metered.

### Option B: Self-Hosted Coturn on Ubuntu VPS
A full Coturn configuration is provided at `deploy/turn/turnserver.conf`.
```bash
# Install Coturn
sudo apt update && sudo apt install -y coturn

# Enable Coturn service
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Copy configuration
sudo cp deploy/turn/turnserver.conf /etc/turnserver.conf

# Edit /etc/turnserver.conf with your server IP and shared secret:
# static-auth-secret=YOUR_STRONG_RANDOM_SECRET
# realm=forge-turn
# listening-ip=0.0.0.0
# external-ip=YOUR_SERVER_PUBLIC_IP

sudo systemctl restart coturn
sudo systemctl enable coturn
```
Then configure `TURN_SHARED_SECRET`, `TURN_REALM`, and `TURN_URLS` in your signaling server's environment variables.

---

## 7. Cross-Network Testing Procedure

To verify cross-network connectivity between a laptop on Wi-Fi and a phone on mobile data:
1. **Disable Wi-Fi on Phone:** Switch phone to cellular data (LTE / 5G).
2. **Open Room on Laptop:**
   - Go to `https://forge-p2p.vercel.app/`
   - Click **Create New Workspace**
   - Click **Connect Phone** in header (or copy the room link)
3. **Open Link on Phone:**
   - Scan the QR code or paste the link in the phone browser.
4. **Inspect Connection Badge:**
   - Both devices will transition from `Connecting...` to either:
     - `Connected (Direct P2P)`: If NAT traversal succeeded via STUN (`srflx` candidate).
     - `Connected (TURN Relay)`: If traffic is relayed via TURN (`relay` candidate).
5. **Verify Diagnostics Panel:**
   - Click the participants avatar badge (`2/5`) to open the **WebRTC Mesh Diagnostics** panel.
   - Inspect the **Selected Candidate Pair**, candidate types (`Host`, `STUN srflx`, `TURN Relay`), latency RTT, and signaling status.
6. **Verify Real-Time Sync:**
   - Type Markdown or code on one device and verify instant synchronization on the other.
