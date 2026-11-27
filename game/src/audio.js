// Job: Web Audio synthesizer: RPM-linked sawtooth engine, bandpass airspeed wind, ring chime, touchdown thud, and tab-focus suspend.
// Exports: KR.Audio
(function () {
  'use strict';
  KR.Audio = class KestrelAudio {
    constructor() { this.context = null; this.muted = false; this.engine = null; this.wind = null; }
    start() {
      if (this.context) { this.resume(); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const c = this.context = new Ctx();
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : 0.2;
      this.master.connect(c.destination);
      this.engine = c.createOscillator();
      this.engine.type = 'sawtooth';
      this.engineFilter = c.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 320;
      this.engineGain = c.createGain();
      this.engineGain.gain.value = 0;
      this.engine.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
      this.engine.start();
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.wind = c.createBufferSource();
      this.wind.buffer = buf;
      this.wind.loop = true;
      this.windFilter = c.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 800;
      this.windGain = c.createGain();
      this.windGain.gain.value = 0;
      this.wind.connect(this.windFilter).connect(this.windGain).connect(this.master);
      this.wind.start();
    }
    suspend() { if (this.context && this.context.state === 'running') this.context.suspend().catch(() => {}); }
    resume() { if (this.context && !document.hidden && this.context.state === 'suspended') this.context.resume().catch(() => {}); }
    update(s) {
      if (!this.context) return;
      const t = this.context.currentTime;
      this.engine.frequency.setTargetAtTime(52 + s.rpm * 0.036, t, 0.08);
      this.engineGain.gain.setTargetAtTime(s.rpm > 20 ? 0.035 + s.throttle * 0.00045 : 0, t, 0.08);
      this.engineFilter.frequency.setTargetAtTime(220 + s.rpm * 0.18, t, 0.1);
      this.windGain.gain.setTargetAtTime(Math.min(0.12, s.speed / 900), t, 0.12);
      this.windFilter.frequency.setTargetAtTime(500 + s.speed * 8, t, 0.1);
    }
    chime() {
      if (!this.context || this.muted) return;
      const t = this.context.currentTime;
      for (const [f, d] of [[880, 0], [1320, 0.08]]) {
        const o = this.context.createOscillator(), g = this.context.createGain();
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5);
        o.connect(g).connect(this.master); o.start(t + d); o.stop(t + d + 0.55);
      }
    }
    thud() {
      if (!this.context || this.muted) return;
      const t = this.context.currentTime, o = this.context.createOscillator(), g = this.context.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(32, t + 0.22);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.32);
    }
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.2;
      return this.muted;
    }
  };
})();
