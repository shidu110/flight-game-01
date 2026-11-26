(function () {
  'use strict';
  KR.Audio = class KestrelAudio {
    constructor() {
      this.context = null; this.muted = false;
      this.engine = null; this.wind = null;
    }
    start() {
      if (this.context) { this.context.resume(); return; }
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.2;
      this.master.connect(this.context.destination);
      this.engine = this.context.createOscillator();
      this.engine.type = 'sawtooth'; this.engineFilter = this.context.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 320;
      this.engineGain = this.context.createGain();
      this.engineGain.gain.value = 0.055;
      this.engine.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
      this.engine.start();
      const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
      this.wind = this.context.createBufferSource();
      this.wind.buffer = buffer;
      this.wind.loop = true;
      this.windFilter = this.context.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 800;
      this.windGain = this.context.createGain();
      this.windGain.gain.value = 0.0;
      this.wind.connect(this.windFilter).connect(this.windGain).connect(this.master);
      this.wind.start();
    }
    update(state) {
      if (!this.context) return;
      const now = this.context.currentTime;
      this.engine.frequency.setTargetAtTime(52 + state.rpm * 0.036, now, 0.08);
      this.engineGain.gain.setTargetAtTime(state.rpm > 20 ? 0.035 + state.throttle * 0.00045 : 0, now, 0.08);
      this.engineFilter.frequency.setTargetAtTime(220 + state.rpm * 0.18, now, 0.1);
      this.windGain.gain.setTargetAtTime(Math.min(0.12, state.speed / 900), now, 0.12);
      this.windFilter.frequency.setTargetAtTime(500 + state.speed * 8, now, 0.1);
    }
    chime() {
      if (!this.context || this.muted) return;
      const now = this.context.currentTime;
      for (const [frequency, delay] of [[880, 0], [1320, 0.08]]) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.frequency.value = frequency; oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.12, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.5);
        oscillator.connect(gain).connect(this.master); oscillator.start(now + delay); oscillator.stop(now + delay + 0.55);
      }
    }
    thud() {
      if (!this.context || this.muted) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(90, now);
      oscillator.frequency.exponentialRampToValueAtTime(32, now + 0.22);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(now); oscillator.stop(now + 0.32);
    }
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.2;
      return this.muted;
    }
  };
})();
