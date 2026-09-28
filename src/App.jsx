import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import SinglePhoneView from './components/SinglePhoneView';
import TimerControlModal from './components/TimerControlModal';
import OnboardingModal from './components/OnboardingModal';
import ChangeIdModal from './components/ChangeIdModal';
import { peerService } from './services/peerService';
import { AudioDSPPipeline, soundEffects } from './utils/audioDSP';
import { clockSync } from './utils/clockSync';
import { Users, Smartphone, AlertCircle } from 'lucide-react';

export default function App() {
  // Navigation & Mode
  const [isDualMode, setIsDualMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showChangeIdModal, setShowChangeIdModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Peer A State
  const [peerIdA, setPeerIdA] = useState('');
  const [callStateA, setCallStateA] = useState('IDLE'); // IDLE | CALLING | RINGING | CONNECTED | ENDED
  const [incomingCallerA, setIncomingCallerA] = useState('');
  const [activeTargetA, setActiveTargetA] = useState('');
  const [isMutedA, setIsMutedA] = useState(false);
  const [isSpeakerA, setIsSpeakerA] = useState(true);
  const [isNsActiveA, setIsNsActiveA] = useState(true);
  const [dspPipelineA, setDspPipelineA] = useState(null);

  // Peer B State (for Dual Simulator Mode)
  const [peerIdB, setPeerIdB] = useState('');
  const [callStateB, setCallStateB] = useState('IDLE');
  const [incomingCallerB, setIncomingCallerB] = useState('');
  const [activeTargetB, setActiveTargetB] = useState('');
  const [isMutedB, setIsMutedB] = useState(false);
  const [isSpeakerB, setIsSpeakerB] = useState(true);
  const [isNsActiveB, setIsNsActiveB] = useState(true);
  const [dspPipelineB, setDspPipelineB] = useState(null);

  // Synchronized Timer State (Shared P2P over DataChannel)
  const [timerState, setTimerState] = useState({
    endAtMs: null,
    version: 0,
    updatedBy: null
  });

  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [callHistory, setCallHistory] = useState([]);

  // Audio HTML elements refs
  const remoteAudioRefA = useRef(null);
  const remoteAudioRefB = useRef(null);

  // Intervals & Timers refs
  const callTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const localStreamRefA = useRef(null);
  const localStreamRefB = useRef(null);
  const warningPlayedRef = useRef(false);

  // Show toast notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initialize Peer A
  useEffect(() => {
    const id = peerService.init();
    setPeerIdA(id);

    peerService.onPeerReady = (assignedId) => {
      setPeerIdA(assignedId);
    };

    peerService.onCallIncoming = (callerId) => {
      setIncomingCallerA(callerId);
      setActiveTargetA(callerId);
      setCallStateA('RINGING');
      soundEffects.startRingtone();
    };

    peerService.onCallConnected = (remoteStream, targetId) => {
      console.log('Call connected with peer:', targetId, remoteStream);
      soundEffects.stopRingtone();
      soundEffects.playConnectedChime();
      setCallStateA('CONNECTED');
      setActiveTargetA(targetId);

      playRemoteAudio(remoteStream);
      startCallTimers();
    };

    peerService.onError = (err) => {
      console.error('Peer error in App:', err);
      if (err.type === 'peer-unavailable') {
        showToast('ID lawan bicara tidak ditemukan atau sedang offline.');
      } else {
        showToast(`Kendala jaringan/P2P: ${err.type || 'Gagal terhubung'}`);
      }
      soundEffects.stopRingtone();
      if (callStateA === 'CALLING') {
        setCallStateA('IDLE');
      }
    };

    peerService.onCallEnded = (reason) => {
      soundEffects.stopRingtone();
      if (reason === 'timer') {
        soundEffects.playHangupChime();
        showToast('Panggilan berakhir sesuai jadwal timer!');
      } else {
        soundEffects.playHangupChime();
      }
      stopCallTimers();
      setCallStateA('ENDED');

      setCallHistory((prev) => [
        {
          id: Date.now(),
          peerId: activeTargetA || incomingCallerA || 'Lawan Bicara',
          direction: activeTargetA ? 'outgoing' : 'incoming',
          durationSec: callDurationSec,
          timestamp: Date.now(),
          reason: reason
        },
        ...prev
      ]);
    };

    peerService.onDataReceived = (data) => {
      handleP2PData(data);
    };

    return () => {
      peerService.destroy();
      stopCallTimers();
    };
  }, []);

  // Handle incoming P2P DataChannel events (Timer Sync, End Call Sync, Clock Sync)
  const handleP2PData = (data) => {
    if (!data) return;

    switch (data.type) {
      case 'TIMER_SET':
        // BR-04: Conflict handling - optimistic versioning
        if (data.version >= timerState.version) {
          setTimerState({
            endAtMs: data.endAtMs,
            version: data.version,
            updatedBy: data.updatedBy
          });
          warningPlayedRef.current = false;
          showToast(`Lawan bicara memperbarui timer auto-hangup`);
        }
        break;

      case 'TIMER_CANCEL':
        setTimerState({
          endAtMs: null,
          version: timerState.version + 1,
          updatedBy: data.updatedBy
        });
        showToast('Lawan bicara membatalkan timer panggilan');
        break;

      case 'CALL_END_SYNC':
        peerService.handleCallEnded(data.reason || 'user_hangup');
        break;

      case 'TIME_PING':
        peerService.sendData(clockSync.handlePing(data));
        break;

      case 'TIME_PONG':
        clockSync.handlePong(data);
        break;

      default:
        break;
    }
  };

  // Start active call duration & auto-hangup countdown timers
  const startCallTimers = () => {
    setCallDurationSec(0);
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    callTimerRef.current = setInterval(() => {
      setCallDurationSec((prev) => prev + 1);
    }, 1000);
  };

  const stopCallTimers = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  // Synchronized Timer Countdown Effect (BR-07, BR-09)
  useEffect(() => {
    if (!timerState.endAtMs || callStateA !== 'CONNECTED') {
      setRemainingSeconds(null);
      return;
    }

    const checkTimer = () => {
      const now = clockSync.getSyncedNowMs();
      const diffSec = Math.max(0, Math.round((timerState.endAtMs - now) / 1000));
      setRemainingSeconds(diffSec);

      // BR-07: Warning trigger at T-60s
      if (diffSec <= 60 && diffSec > 0 && !warningPlayedRef.current) {
        warningPlayedRef.current = true;
        soundEffects.playTimerWarningSound();
      }

      // BR-09: Auto-Hangup Execution at time expiration
      if (diffSec <= 0) {
        stopCallTimers();
        peerService.endCall('timer');
      }
    };

    checkTimer();
    countdownTimerRef.current = setInterval(checkTimer, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [timerState.endAtMs, callStateA]);

  // Play remote WebRTC audio stream reliably without Echo (Single Dedicated Sink)
  const playRemoteAudio = (remoteStream) => {
    if (!remoteStream) return;

    // 1. Ensure all remote audio tracks are unmuted and enabled
    try {
      remoteStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    } catch (e) {}

    // 2. Play via Single HTML5 Audio element tied to Android OS Acoustic Echo Cancellation (AEC)
    // NOTE: Do NOT duplicate with Web Audio sink to prevent comb-filter reverb / echo loop
    if (remoteAudioRefA.current) {
      remoteAudioRefA.current.srcObject = remoteStream;
      remoteAudioRefA.current.volume = 1.0;
      remoteAudioRefA.current.muted = false;

      const playPromise = remoteAudioRefA.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay waiting for touch unlock:', err);
          const resumeAudio = () => {
            if (remoteAudioRefA.current) {
              remoteAudioRefA.current.play().catch(() => {});
            }
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('touchstart', resumeAudio);
          };
          window.addEventListener('click', resumeAudio);
          window.addEventListener('touchstart', resumeAudio);
        });
      }
    }
  };

  // Audio DSP setup for Peer A
  const setupAudioStreamA = async () => {
    try {
      // Hardware-accelerated mic stream with strict Acoustic Echo Cancellation (AEC)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: isNsActiveA,
          autoGainControl: true,
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true
        },
        video: false
      });
      localStreamRefA.current = stream;

      // Connect to Voice Separation DSP pipeline (Cascade Highpass 180Hz + Lowpass 3.4kHz + VAD Noise Gate)
      const dsp = new AudioDSPPipeline();
      const processedStream = await dsp.setup(stream);
      setDspPipelineA(dsp);

      // Return processed stream with filters and VAD noise gate active
      return processedStream;
    } catch (e) {
      console.error('Failed to get mic audio stream A:', e);
      alert('Gagal mengakses mikrofon! Harap berikan izin mikrofon.');
      return null;
    }
  };

  // Peer A Call Actions
  const handleStartCallA = async (targetId) => {
    // Unlock audio context on user gesture
    soundEffects.init();
    if (remoteAudioRefA.current) {
      remoteAudioRefA.current.play().catch(() => {});
    }

    setActiveTargetA(targetId);
    setCallStateA('CALLING');
    soundEffects.startRingtone();

    const stream = await setupAudioStreamA();
    if (stream) {
      peerService.startCall(targetId, stream);
    } else {
      setCallStateA('IDLE');
      soundEffects.stopRingtone();
    }
  };

  const handleAnswerCallA = async () => {
    // Unlock audio context on user gesture
    soundEffects.init();
    if (remoteAudioRefA.current) {
      remoteAudioRefA.current.play().catch(() => {});
    }

    soundEffects.stopRingtone();
    const stream = await setupAudioStreamA();
    if (stream) {
      peerService.answerCall(stream);
      setCallStateA('CONNECTED');
    }
  };

  const handleRejectCallA = () => {
    soundEffects.stopRingtone();
    peerService.endCall('rejected');
    setCallStateA('IDLE');
  };

  const handleEndCallA = () => {
    soundEffects.stopRingtone();
    if (callStateA === 'CONNECTED') {
      peerService.endCall('user_hangup');
    }
    setCallStateA('IDLE');
  };

  const handleToggleMuteA = () => {
    const nextMute = !isMutedA;
    setIsMutedA(nextMute);
    if (localStreamRefA.current) {
      localStreamRefA.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
    }
    if (dspPipelineA) {
      dspPipelineA.setMute(nextMute);
    }
    showToast(nextMute ? 'Mikrofon DIMATIKAN (Mute)' : 'Mikrofon AKTIF (Unmute)');
  };

  const handleToggleSpeakerA = () => {
    setIsSpeakerA(!isSpeakerA);
  };

  const handleToggleNsA = () => {
    const nextNs = !isNsActiveA;
    setIsNsActiveA(nextNs);
    if (localStreamRefA.current) {
      localStreamRefA.current.getAudioTracks().forEach((track) => {
        try {
          track.applyConstraints({ noiseSuppression: nextNs });
        } catch (e) {}
      });
    }
    if (dspPipelineA) {
      dspPipelineA.setNoiseSuppression(nextNs);
    }
    showToast(nextNs ? 'Voice Isolation & Noise Canceling AKTIF' : 'Noise Canceling DIMATIKAN (Raw Mic)');
  };

  const handleUpdateId = (newId) => {
    const cleanId = peerService.changeCustomId(newId);
    if (cleanId) {
      setPeerIdA(cleanId);
      showToast(`ID berhasil diubah menjadi: ${cleanId}`);
    }
  };

  // Timer Control Handlers (BR-01 to BR-08)
  const handleSetTimer = ({ mode, durationMinutes, clockTime, extensionMinutes }) => {
    const now = clockSync.getSyncedNowMs();
    let targetEndMs = null;

    if (mode === 'duration') {
      targetEndMs = now + (durationMinutes * 60 * 1000);
    } else if (mode === 'extend') {
      const currentEnd = timerState.endAtMs || now;
      targetEndMs = currentEnd + (extensionMinutes * 60 * 1000);
    } else if (mode === 'clock' && clockTime) {
      const [hours, minutes] = clockTime.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);

      // BR-05: If time has passed today, schedule for tomorrow
      if (targetDate.getTime() <= Date.now()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      targetEndMs = targetDate.getTime();
    }

    if (targetEndMs) {
      const newVersion = timerState.version + 1;
      const newTimerState = {
        endAtMs: targetEndMs,
        version: newVersion,
        updatedBy: peerIdA
      };

      setTimerState(newTimerState);
      warningPlayedRef.current = false;

      // Broadcast new timer state over P2P DataChannel to Peer B
      peerService.sendData({
        type: 'TIMER_SET',
        endAtMs: targetEndMs,
        version: newVersion,
        updatedBy: peerIdA
      });

      showToast('Timer auto-hangup tersinkronisasi ke lawan bicara!');
    }
  };

  const handleCancelTimer = () => {
    setTimerState({
      endAtMs: null,
      version: timerState.version + 1,
      updatedBy: peerIdA
    });

    peerService.sendData({
      type: 'TIMER_CANCEL',
      updatedBy: peerIdA
    });

    showToast('Timer dibatalkan.');
  };

  const handleUpdateServer = (serverHost) => {
    peerService.setServerHost(serverHost);
    showToast(serverHost ? `Server signaling: ${serverHost}` : 'Server signaling di-reset ke default');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-300">
          <div className="bg-cyan-950/90 text-cyan-200 border border-cyan-500/50 px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        peerId={peerIdA}
        onShowOnboarding={() => setShowOnboarding(true)}
        isDualMode={isDualMode}
        onToggleDualMode={() => setIsDualMode(!isDualMode)}
        isConnected={callStateA === 'CONNECTED'}
        onCopyNotification={(msg) => showToast(msg)}
        onOpenChangeId={() => setShowChangeIdModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col items-center justify-center">
        
        {/* Mode Switcher Banner (Mobile Notice) */}
        <div className="w-full max-w-md mb-4 sm:hidden flex justify-center">
          <button
            onClick={() => setIsDualMode(!isDualMode)}
            className="text-xs text-cyan-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-1.5"
          >
            {isDualMode ? <Users className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isDualMode ? 'Tampilan 1 HP (Mobile)' : 'Uji Simulasi 2 HP'}</span>
          </button>
        </div>

        {/* Dynamic Layout: Single PWA Phone View vs Dual Phone Simulator View */}
        <div className={`w-full grid gap-6 items-start ${isDualMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
          
          {/* Phone A View */}
          <SinglePhoneView
            phoneLabel={isDualMode ? "HP Penelepon (Pengguna A)" : "Panggilan VoIP Callan"}
            peerId={peerIdA}
            callState={callStateA}
            incomingCallerId={incomingCallerA}
            activeTargetId={activeTargetA}
            isMuted={isMutedA}
            isSpeaker={isSpeakerA}
            isNsActive={isNsActiveA}
            dspPipeline={dspPipelineA}
            remoteAudioRef={remoteAudioRefA}
            timerState={timerState}
            remainingSeconds={remainingSeconds}
            callDurationSec={callDurationSec}
            callHistory={callHistory}
            onStartCall={handleStartCallA}
            onAnswerCall={handleAnswerCallA}
            onRejectCall={handleRejectCallA}
            onEndCall={handleEndCallA}
            onToggleMute={handleToggleMuteA}
            onToggleSpeaker={handleToggleSpeakerA}
            onToggleNs={handleToggleNsA}
            onOpenTimerModal={() => setShowTimerModal(true)}
            onExtendTimer={(mins) => handleSetTimer({ mode: 'extend', extensionMinutes: mins })}
            onCancelTimer={handleCancelTimer}
            onOpenChangeId={() => setShowChangeIdModal(true)}
          />

          {/* Phone B View (Only visible in Dual Simulator Mode) */}
          {isDualMode && (
            <div className="animate-in fade-in zoom-in duration-200">
              <SinglePhoneView
                phoneLabel="HP Penerima (Simulasi Pengguna B)"
                peerId="peer-b-simulator"
                callState={callStateA}
                incomingCallerId={peerIdA}
                activeTargetId={peerIdA}
                isMuted={isMutedB}
                isSpeaker={isSpeakerB}
                isNsActive={isNsActiveB}
                dspPipeline={dspPipelineA}
                remoteAudioRef={remoteAudioRefB}
                timerState={timerState}
                remainingSeconds={remainingSeconds}
                callDurationSec={callDurationSec}
                callHistory={callHistory}
                onStartCall={() => handleStartCallA('peer-b-simulator')}
                onAnswerCall={handleAnswerCallA}
                onRejectCall={handleRejectCallA}
                onEndCall={handleEndCallA}
                onToggleMute={() => setIsMutedB(!isMutedB)}
                onToggleSpeaker={() => setIsSpeakerB(!isSpeakerB)}
                onToggleNs={() => setIsNsActiveB(!isNsActiveB)}
                onOpenTimerModal={() => setShowTimerModal(true)}
                onExtendTimer={(mins) => handleSetTimer({ mode: 'extend', extensionMinutes: mins })}
                onCancelTimer={handleCancelTimer}
                onOpenChangeId={() => setShowChangeIdModal(true)}
              />
            </div>
          )}

        </div>
      </main>

      {/* Modals */}
      <TimerControlModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        onSetTimer={handleSetTimer}
        onCancelTimer={handleCancelTimer}
        currentEndAtMs={timerState.endAtMs}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      <ChangeIdModal
        isOpen={showChangeIdModal}
        onClose={() => setShowChangeIdModal(false)}
        currentId={peerIdA}
        onUpdateId={handleUpdateId}
        onUpdateServer={handleUpdateServer}
      />

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900 mt-6">
        Callan PWA • P2P WebRTC Voice & Synced Timer • Target SDK 36 Compliant
      </footer>
    </div>
  );
}
