// Web Audio API Emergency Siren & Beep Tone Generator for MineGuard Control Rooms

class SirenAudioService {
  constructor() {
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.intervalId = null;
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  async enableAudio() {
    this.initAudio();
    if (this.audioCtx?.state === 'suspended') await this.audioCtx.resume();
    this.playBeep();
    return Boolean(this.audioCtx?.state === 'running');
  }

  startSiren() {
    if (this.isPlaying) return;
    this.initAudio();
    if (!this.audioCtx) return;

    this.isPlaying = true;
    let high = false;

    // Siren modulating tone between 600Hz and 900Hz
    this.intervalId = setInterval(() => {
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(high ? 900 : 600, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.25);

        high = !high;
      } catch (e) {
        console.warn('Audio siren play error:', e);
      }
    }, 300);
  }

  stopSiren() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  speakEmergencyAlert(incident) {
    if (!('speechSynthesis' in window)) return false;
    try {
      window.speechSynthesis.cancel();
      const where=incident?.mineLocation||'the mine';
      const utterance=new SpeechSynthesisUtterance(`Emergency. SOS alert at ${where}. Follow emergency procedure and respond now.`);
      utterance.rate=0.92;
      utterance.pitch=0.82;
      utterance.volume=1;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.warn('Emergency voice alert could not start:',error.name);
      return false;
    }
  }

  stopVoice() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  playBeep() {
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('Beep audio error:', e);
    }
  }
}

export const sirenAudioService = new SirenAudioService();
