/**
 * Callan Monotonic P2P Clock Sync (TDD Section 7.2)
 * Uses NTP-style RTT ping-pong over WebRTC DataChannel to align clock timestamps between Peer A & Peer B.
 */

export class ClockSyncP2P {
  constructor() {
    this.offsetMs = 0; // peerClockOffset = RemoteTime - LocalTime
    this.bestRttMs = Infinity;
    this.samples = [];
  }

  // Generate Ping payload
  createPingPayload() {
    return {
      type: 'TIME_PING',
      t0: performance.now()
    };
  }

  // Handle incoming Ping (Peer B receiving from Peer A)
  handlePing(pingMsg) {
    return {
      type: 'TIME_PONG',
      t0: pingMsg.t0,
      t1: Date.now() // Peer B absolute server-style epoch timestamp
    };
  }

  // Handle incoming Pong (Peer A receiving response from Peer B)
  handlePong(pongMsg) {
    const t3 = performance.now();
    const t0 = pongMsg.t0;
    const t1 = pongMsg.t1; // Remote peer timestamp
    
    const rtt = t3 - t0;
    
    // Estimate offset
    // offset = remoteTime - (localTime + rtt/2)
    const localNowApprox = Date.now();
    const offset = t1 - localNowApprox;

    if (rtt < this.bestRttMs) {
      this.bestRttMs = rtt;
      this.offsetMs = offset;
    }

    this.samples.push({ rtt, offset });
    if (this.samples.length > 5) {
      this.samples.shift();
    }

    return { rtt, offset: this.offsetMs };
  }

  // Get current synchronized network timestamp in epoch ms
  getSyncedNowMs() {
    return Date.now() + this.offsetMs;
  }

  reset() {
    this.offsetMs = 0;
    this.bestRttMs = Infinity;
    this.samples = [];
  }
}

export const clockSync = new ClockSyncP2P();
