import Peer from 'peerjs';

/**
 * Callan PeerJS WebRTC P2P Engine
 * Manages 1-on-1 audio call streams & real-time DataChannel synchronization.
 */
class PeerService {
  constructor() {
    this.peer = null;
    this.currentCall = null;
    this.dataConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.peerId = null;
    this.pendingDataQueue = [];
    
    // Callbacks
    this.onCallIncoming = null;
    this.onCallConnected = null;
    this.onCallEnded = null;
    this.onDataReceived = null;
    this.onPeerReady = null;
    this.onError = null;
  }

  // Persistent ID per device / phone using localStorage
  getPersistentId() {
    try {
      const saved = localStorage.getItem('callan_saved_peer_id');
      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch (e) {}

    const newId = this.generateRandomId();
    try {
      localStorage.setItem('callan_saved_peer_id', newId);
    } catch (e) {}
    return newId;
  }

  // Allow user to set custom ID
  changeCustomId(newId) {
    if (!newId || !newId.trim()) return null;
    const cleanId = newId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    try {
      localStorage.setItem('callan_saved_peer_id', cleanId);
    } catch (e) {}
    this.init(cleanId);
    return cleanId;
  }

  // Dedicated Signaling Server Host (Azure App Service in Jakarta)
  getServerHost() {
    try {
      const savedHost = localStorage.getItem('callan_server_host');
      if (savedHost && savedHost.trim()) {
        return savedHost.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      }
    } catch (e) {}
    // Default to dedicated private Azure Signaling Server in Jakarta (low latency <10ms)
    return 'callan-server-jkt.azurewebsites.net';
  }

  setServerHost(newHost) {
    try {
      if (newHost && newHost.trim()) {
        const cleanHost = newHost.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        localStorage.setItem('callan_server_host', cleanHost);
        this.init();
        return cleanHost;
      } else {
        localStorage.removeItem('callan_server_host');
        this.init();
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  // Generate clean readable ID or use custom user nickname ID
  generateRandomId() {
    const animals = ['rider', 'biker', 'callan', 'echo', 'alpha', 'hero', 'vibe'];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${animals[Math.floor(Math.random() * animals.length)]}-${num}`;
  }

  init(customId = null) {
    if (this.peer) {
      this.destroy();
    }

    const id = customId || this.getPersistentId();

    try {
      // Robust WebRTC ICE Servers with verified public STUN + OpenRelay TURN servers
      // Essential for cross-network (CGNAT 4G/5G mobile data / separate WiFi routers) NAT traversal
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:openrelay.metered.ca:80' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ];

      const serverHost = this.getServerHost();
      const peerOptions = {
        debug: 1,
        config: {
          iceServers: iceServers,
          iceTransportPolicy: 'all',
          sdpSemantics: 'unified-plan'
        }
      };

      if (serverHost) {
        console.log(`Connecting to private Render Signaling Server: ${serverHost}/callan`);
        peerOptions.host = serverHost;
        peerOptions.port = 443;
        peerOptions.path = '/callan';
        peerOptions.secure = true;
      }

      this.peer = new Peer(id, peerOptions);

      this.peer.on('open', (assignedId) => {
        console.log('PeerJS connected with ID:', assignedId);
        this.peerId = assignedId;
        if (this.onPeerReady) this.onPeerReady(assignedId);
      });

      this.peer.on('disconnected', () => {
        console.warn('PeerJS disconnected from signaling server. Reconnecting...');
        if (this.peer && !this.peer.destroyed) {
          try {
            this.peer.reconnect();
          } catch (e) {
            console.warn('Reconnect error:', e);
          }
        }
      });

      // Keep signaling alive when app returns to foreground on Android
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
              console.log('App in foreground, reconnecting PeerJS socket...');
              try { this.peer.reconnect(); } catch (e) {}
            }
          }
        });
      }

      // Handle Incoming Call
      this.peer.on('call', (incomingCall) => {
        console.log('Incoming call from peer:', incomingCall.peer);
        this.currentCall = incomingCall;
        if (this.onCallIncoming) {
          this.onCallIncoming(incomingCall.peer);
        }
      });

      // Handle Incoming Data Connection (DataChannel)
      this.peer.on('connection', (conn) => {
        console.log('Incoming P2P DataChannel connection from:', conn.peer);
        this.setupDataConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'unavailable-id') {
          console.warn('ID masih aktif di server signaling (efek reconnect cepat), mencoba menyambung ulang dengan ID yang sama...');
          // JANGAN menimpa localStorage agar ID user tetap melekat permanen
          setTimeout(() => {
            const persistentId = this.getPersistentId();
            this.init(persistentId);
          }, 2000);
          return;
        }
        if (this.onError) this.onError(err);
      });

      return id;
    } catch (e) {
      console.error('Failed to init PeerJS:', e);
      if (this.onError) this.onError(e);
      return null;
    }
  }

  // Connect DataChannel to Target Peer
  connectDataChannel(targetPeerId) {
    if (!this.peer) return;
    if (this.dataConnection && this.dataConnection.peer === targetPeerId && this.dataConnection.open) {
      return;
    }
    const conn = this.peer.connect(targetPeerId, { reliable: true });
    this.setupDataConnection(conn);
  }

  setupDataConnection(conn) {
    this.dataConnection = conn;

    this.dataConnection.on('open', () => {
      console.log('P2P DataChannel open with:', conn.peer);
      // Flush pending queued data messages
      while (this.pendingDataQueue.length > 0) {
        const payload = this.pendingDataQueue.shift();
        try {
          this.dataConnection.send(payload);
        } catch (err) {
          console.error('Failed to send queued data:', err);
        }
      }
    });

    this.dataConnection.on('data', (data) => {
      if (this.onDataReceived) {
        this.onDataReceived(data, conn.peer);
      }
    });

    this.dataConnection.on('close', () => {
      console.log('P2P DataChannel closed');
    });

    this.dataConnection.on('error', (err) => {
      console.error('P2P DataChannel error:', err);
    });
  }

  // Send JSON Payload over DataChannel with Queueing
  sendData(payload) {
    if (this.dataConnection && this.dataConnection.open) {
      try {
        this.dataConnection.send(payload);
        return true;
      } catch (e) {
        console.error('Error sending data over channel:', e);
      }
    }
    // Queue payload if connection is opening
    this.pendingDataQueue.push(payload);
    return false;
  }

  // Place Audio Call
  startCall(targetPeerId, processedStream) {
    if (!this.peer) return false;
    this.localStream = processedStream;

    // Ensure audio tracks enabled
    if (processedStream) {
      try {
        processedStream.getAudioTracks().forEach(track => { track.enabled = true; });
      } catch (e) {}
    }

    // Connect DataChannel
    this.connectDataChannel(targetPeerId);

    // Call media
    const call = this.peer.call(targetPeerId, processedStream);
    this.currentCall = call;
    this.bindCallEvents(call);
    return true;
  }

  // Answer Incoming Call
  answerCall(processedStream) {
    if (!this.currentCall) return false;
    this.localStream = processedStream;

    // Ensure audio tracks enabled
    if (processedStream) {
      try {
        processedStream.getAudioTracks().forEach(track => { track.enabled = true; });
      } catch (e) {}
    }

    // Make sure DataChannel is established with caller if not yet connected
    if (!this.dataConnection) {
      this.connectDataChannel(this.currentCall.peer);
    }

    this.currentCall.answer(processedStream);
    this.bindCallEvents(this.currentCall);
    return true;
  }

  bindCallEvents(call) {
    call.on('stream', (remoteStream) => {
      console.log('Received remote audio stream from peer:', call.peer);
      try {
        remoteStream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
      } catch (e) {}
      this.remoteStream = remoteStream;
      if (this.onCallConnected) {
        this.onCallConnected(remoteStream, call.peer);
      }
    });

    call.on('close', () => {
      console.log('Call stream closed');
      this.handleCallEnded('normal');
    });

    call.on('error', (err) => {
      console.error('Call stream error:', err);
      this.handleCallEnded('error');
    });
  }

  handleCallEnded(reason = 'normal') {
    if (this.currentCall) {
      try { this.currentCall.close(); } catch(e) {}
      this.currentCall = null;
    }
    if (this.dataConnection) {
      try { this.dataConnection.close(); } catch(e) {}
      this.dataConnection = null;
    }
    this.pendingDataQueue = [];
    if (this.onCallEnded) {
      this.onCallEnded(reason);
    }
  }

  endCall(reason = 'user_hangup') {
    this.sendData({ type: 'CALL_END_SYNC', reason });
    this.handleCallEnded(reason);
  }

  destroy() {
    this.endCall('destroyed');
    if (this.peer) {
      try { this.peer.destroy(); } catch(e) {}
      this.peer = null;
    }
  }
}

export const peerService = new PeerService();

