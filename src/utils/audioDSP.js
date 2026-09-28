/**
 * Callan Audio DSP & Synthesizer Engine
 * Implements real-time Web Audio API Noise Suppression (High-pass filter + Speech EQ + Noise Gate)
 * and audio feedback tones (ringtone, timer warning, hangup).
 */

class AudioDSPPipeline {
  constructor() {
    this.ctx = null;
    this.sourceNode = null;
    this.highpassFilter1 = null;
    this.highpassFilter2 = null;
    this.lowpassFilter = null;
    this.eqFilter = null;
    this.noiseGateGain = null;
    this.analyser = null;
    this.keepAliveGain = null;
    this.outputDestination = null;
    this.isNsActive = true;
    this.isMuted = false;
    
    // VAD (Voice Activity Detection) Noise Gate State
    this.vadInterval = null;
    this.gateState = 'open'; // 'open' | 'closing' | 'closed'
    this.lastVoiceTime = 0;
    this.vadThreshold = 18; // RMS threshold for vocal presence (0-100 scale)
    this.holdTimeMs = 300;  // Hang time to avoid cutting off word endings
  }

  async setup(stream) {
    if (!stream) return null;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.sourceNode = this.ctx.createMediaStreamSource(stream);
    
    // 1. Stage 1 High-Pass Filter (180 Hz) - Cuts deep engine exhaust & pavement rumble
    this.highpassFilter1 = this.ctx.createBiquadFilter();
    this.highpassFilter1.type = 'highpass';
    this.highpassFilter1.frequency.setValueAtTime(180, this.ctx.currentTime);
    this.highpassFilter1.Q.setValueAtTime(0.8, this.ctx.currentTime);

    // 2. Stage 2 High-Pass Filter (180 Hz) - Cascaded for steep 24dB/octave slope (eliminates wind buffeting)
    this.highpassFilter2 = this.ctx.createBiquadFilter();
    this.highpassFilter2.type = 'highpass';
    this.highpassFilter2.frequency.setValueAtTime(180, this.ctx.currentTime);
    this.highpassFilter2.Q.setValueAtTime(0.8, this.ctx.currentTime);

    // 3. Speech Presence Boost EQ (2200 Hz, +4dB) - Enhances human vocal articulation
    this.eqFilter = this.ctx.createBiquadFilter();
    this.eqFilter.type = 'peaking';
    this.eqFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
    this.eqFilter.gain.setValueAtTime(4.0, this.ctx.currentTime);
    this.eqFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    // 4. Low-Pass Filter (3400 Hz) - Telecom speech bandwidth limit (cuts car horns, sirens & tyre screech)
    this.lowpassFilter = this.ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.setValueAtTime(3400, this.ctx.currentTime);
    this.lowpassFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    // 5. Dynamic VAD Noise Gate Gain Node
    this.noiseGateGain = this.ctx.createGain();
    this.noiseGateGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 6. Analyser for waveform visualization & VAD speech energy detection
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.5;

    // 7. Silent keep-alive gain connected to hardware destination to keep buffers pumping
    this.keepAliveGain = this.ctx.createGain();
    this.keepAliveGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.keepAliveGain.connect(this.ctx.destination);

    // 8. Output Destination for WebRTC stream
    this.outputDestination = this.ctx.createMediaStreamDestination();

    // Connect Pipeline
    this.reconnectPipeline();

    // Start Real-Time VAD Noise Gate Loop
    this.startVadLoop();

    return this.outputDestination.stream;
  }

  // Connect or Bypass Filters based on isNsActive and isMuted toggles
  reconnectPipeline() {
    if (!this.sourceNode) return;

    this.sourceNode.disconnect();
    this.highpassFilter1?.disconnect();
    this.highpassFilter2?.disconnect();
    this.eqFilter?.disconnect();
    this.lowpassFilter?.disconnect();
    this.noiseGateGain?.disconnect();
    this.analyser?.disconnect();

    if (this.isMuted) {
      // Muted - do not connect to output
      return;
    }

    if (this.isNsActive) {
      // Active Voice Separation Pipeline:
      // Source -> Highpass1 -> Highpass2 -> EQ -> Lowpass -> NoiseGate -> Analyser -> Output
      this.sourceNode.connect(this.highpassFilter1);
      this.highpassFilter1.connect(this.highpassFilter2);
      this.highpassFilter2.connect(this.eqFilter);
      this.eqFilter.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.noiseGateGain);
      this.noiseGateGain.connect(this.analyser);
      this.analyser.connect(this.outputDestination);

      if (this.keepAliveGain) {
        this.analyser.connect(this.keepAliveGain);
      }
    } else {
      // Bypass NS (Raw Mic Audio): Source -> Analyser -> Output
      // Reset noise gate gain to 1.0 (unattenuated)
      if (this.noiseGateGain && this.ctx) {
        this.noiseGateGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.outputDestination);

      if (this.keepAliveGain) {
        this.analyser.connect(this.keepAliveGain);
      }
    }
  }

  // Real-Time Intelligent Voice Activity Detector (VAD) Noise Gate
  startVadLoop() {
    if (this.vadInterval) clearInterval(this.vadInterval);

    const buffer = new Uint8Array(this.analyser.frequencyBinCount);

    this.vadInterval = setInterval(() => {
      if (!this.ctx || this.ctx.state === 'closed' || !this.isNsActive || this.isMuted) {
        return;
      }

      this.analyser.getByteFrequencyData(buffer);
      
      // Calculate energy in human voice frequency range (300Hz - 3kHz bins)
      let voiceEnergySum = 0;
      let count = 0;
      const startBin = Math.floor((300 / (this.ctx.sampleRate / 2)) * buffer.length);
      const endBin = Math.min(buffer.length, Math.floor((3400 / (this.ctx.sampleRate / 2)) * buffer.length));

      for (let i = startBin; i < endBin; i++) {
        voiceEnergySum += buffer[i];
        count++;
      }

      const voiceLevel = count > 0 ? voiceEnergySum / count : 0;
      const now = performance.now();
      const currentTime = this.ctx.currentTime;

      if (voiceLevel > this.vadThreshold) {
        // Speech detected -> Open Gate immediately
        this.lastVoiceTime = now;
        if (this.gateState !== 'open') {
          this.gateState = 'open';
          // Fast attack: ramp to 1.0 in 10ms
          this.noiseGateGain.gain.cancelScheduledValues(currentTime);
          this.noiseGateGain.gain.setTargetAtTime(1.0, currentTime, 0.01);
        }
      } else {
        // No speech detected
        const silenceDuration = now - this.lastVoiceTime;
        if (silenceDuration > this.holdTimeMs && this.gateState === 'open') {
          this.gateState = 'closed';
          // Smooth release: attenuate background motorcycle/car noise down to -36dB (0.02)
          this.noiseGateGain.gain.cancelScheduledValues(currentTime);
          this.noiseGateGain.gain.setTargetAtTime(0.02, currentTime, 0.12);
        }
      }
    }, 25);
  }

  setNoiseSuppression(enabled) {
    this.isNsActive = enabled;
    this.reconnectPipeline();
  }

  setMute(muted) {
    this.isMuted = muted;
    this.reconnectPipeline();
  }

  getWaveformData() {
    if (!this.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getVolumeLevel() {
    const data = this.getWaveformData();
    if (data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return Math.min(100, Math.round((sum / data.length) / 2.55));
  }

  destroy() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
    this.sourceNode = null;
  }
}

// Web Audio API Sound Generator for Ringtones & Chimes
class AudioToneGenerator {
  constructor() {
    this.ctx = null;
    this.ringInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play outgoing/incoming ringtone
  startRingtone() {
    this.stopRingtone();
    this.init();

    const playTone = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now); // A4
      osc2.frequency.setValueAtTime(480, now); // B4 (Standard dual-tone call ring)

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.setValueAtTime(0.15, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    };

    playTone();
    this.ringInterval = setInterval(playTone, 3000);
  }

  stopRingtone() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  // Chime when call is answered
  playConnectedChime() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
    
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.45);
    });

    this.triggerVibration([100, 50, 100]);
  }

  // T-60s Timer Warning Alert Sound
  playTimerWarningSound() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Play double warning beep
    [0, 0.2].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now + offset); // A5 alert tone

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.3, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });

    this.triggerVibration([200, 100, 200, 100, 400]);
  }

  // Call End Chime
  playHangupChime() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [440, 349.23, 293.66]; // A4, F4, D4 descending
    
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.4);
    });

    this.triggerVibration([150, 100, 150]);
  }

  triggerVibration(pattern) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignored if vibration API restricted
      }
    }
  }
}

export const soundEffects = new AudioToneGenerator();
export { AudioDSPPipeline };
