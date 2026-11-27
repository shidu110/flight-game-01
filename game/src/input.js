// Job: Keyboard hold/edge state and cockpit drag-to-look mouse input handler with blur reset.
// Exports: KR.Input
(function () {
  'use strict';
  KR.Input = class KestrelInput {
    constructor() {
      this.keys = {};
      this.mouse = { down: false, x: 0, y: 0, dx: 0, dy: 0 };
      this.listeners = [];
      this.controls = { pitch: 0, roll: 0 };
      const nav = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
      addEventListener('keydown', (e) => {
        if (nav.includes(e.code)) e.preventDefault();
        if (e.repeat) return;
        this.keys[e.code] = true;
        for (const fn of this.listeners) fn(e);
      });
      addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      addEventListener('mousedown', (e) => { this.mouse.down = true; this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
      addEventListener('mouseup', () => { this.mouse.down = false; });
      addEventListener('mousemove', (e) => {
        if (!this.mouse.down) return;
        this.mouse.dx += e.clientX - this.mouse.x;
        this.mouse.dy += e.clientY - this.mouse.y;
        this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      });
      addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; });
    }
    onKey(fn) { this.listeners.push(fn); }
    endFrame() { this.mouse.dx = 0; this.mouse.dy = 0; }
    get pitchUp() { return !!this.keys.ArrowUp; }
    get pitchDown() { return !!this.keys.ArrowDown; }
    get rollLeft() { return !!this.keys.ArrowLeft; }
    get rollRight() { return !!this.keys.ArrowRight; }
    get rudderLeft() { return !!this.keys.KeyA; }
    get rudderRight() { return !!this.keys.KeyD; }
    get throttleUp() { return !!(this.keys.ShiftLeft || this.keys.ShiftRight || this.keys.KeyW); }
    get throttleDown() { return !!(this.keys.ControlLeft || this.keys.ControlRight || this.keys.KeyS); }
    get controlState() {
      this.controls.pitch = (this.pitchDown ? 1 : 0) - (this.pitchUp ? 1 : 0);
      this.controls.roll = (this.rollRight ? 1 : 0) - (this.rollLeft ? 1 : 0);
      return this.controls;
    }
  };
})();
