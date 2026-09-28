const express = require('express');
const http = require('http');
const cors = require('cors');
const { ExpressPeerServer } = require('peer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 9000;
const server = http.createServer(app);

// 1. Health check & status endpoint (Render.com uses this for health verification)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    app: 'Callan WebRTC Signaling Server',
    time: new Date().toISOString(),
    endpoints: {
      signaling: '/callan',
      health: '/'
    }
  });
});

// 2. Attach ExpressPeerServer
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
  allow_discovery: true,
  alive_timeout: 60000,
  key: 'peerjs'
});

app.use('/callan', peerServer);

// 3. Connection & Disconnection Event Listeners
peerServer.on('connection', (client) => {
  console.log(`[ONLINE] Client connected: ${client.getId()} at ${new Date().toLocaleTimeString()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`[OFFLINE] Client disconnected: ${client.getId()} at ${new Date().toLocaleTimeString()}`);
});

peerServer.on('error', (err) => {
  console.error('[PEER SERVER ERROR]', err);
});

// 4. Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 Callan Signaling Server is running on port ${PORT}`);
  console.log(`🌐 Signaling endpoint: http://localhost:${PORT}/callan`);
  console.log('====================================================');
});
