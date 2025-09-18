// A simple sound manager using the Web Audio API to avoid needing asset files.

let audioContext: AudioContext;
let masterGainNode: GainNode;
let currentVolume = 0.5;
let isGloballyMuted = false;

// We need to initialize the AudioContext after a user interaction.
const initializeAudio = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainNode = audioContext.createGain();
      masterGainNode.gain.setValueAtTime(isGloballyMuted ? 0 : currentVolume, audioContext.currentTime);
      masterGainNode.connect(audioContext.destination);
    } catch (e) {
      console.error("Web Audio API is not supported in this browser", e);
    }
  }
};

// Call this on the first user click/interaction in the app.
export const ensureAudioInitialized = () => {
    if (!audioContext || audioContext.state === 'suspended') {
        initializeAudio();
        audioContext?.resume();
    }
};

export const setVolume = (volume: number) => {
    currentVolume = Math.max(0, Math.min(1, volume));
    if (masterGainNode && !isGloballyMuted) {
        masterGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
    }
};

export const setMuted = (muted: boolean) => {
    isGloballyMuted = muted;
    if (masterGainNode) {
        masterGainNode.gain.setValueAtTime(isGloballyMuted ? 0 : currentVolume, audioContext.currentTime);
    }
};

type SoundType = 'move' | 'attack' | 'build' | 'endTurn' | 'upgrade' | 'error' | 'heal' | 'levelUp' | 'research';

export const playSound = (type: SoundType) => {
    if (!audioContext || audioContext.state !== 'running') {
        return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode);

    const now = audioContext.currentTime;

    switch (type) {
        case 'move':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(200, now);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
        case 'attack':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            gainNode.gain.setValueAtTime(0.4, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;
        case 'build':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.4);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            oscillator.start(now);
            oscillator.stop(now + 0.4);
            break;
        case 'endTurn':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, now);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
        case 'upgrade':
             oscillator.type = 'sine';
             oscillator.frequency.setValueAtTime(523.25, now); // C5
             oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
             gainNode.gain.setValueAtTime(0.5, now);
             gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
             oscillator.start(now);
             oscillator.stop(now + 0.2);
             break;
        case 'levelUp':
             oscillator.type = 'sawtooth';
             oscillator.frequency.setValueAtTime(200, now);
             oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.5);
             gainNode.gain.setValueAtTime(0.4, now);
             gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
             oscillator.start(now);
             oscillator.stop(now + 0.5);
             break;
        case 'heal':
             oscillator.type = 'sine';
             oscillator.frequency.setValueAtTime(400, now);
             oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.3);
             gainNode.gain.setValueAtTime(0.4, now);
             gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
             oscillator.start(now);
             oscillator.stop(now + 0.3);
             break;
        case 'error':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, now);
            gainNode.gain.setValueAtTime(0.4, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;
        case 'research':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
            gainNode.gain.setValueAtTime(0.4, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            break;
    }
};
