// Job: Track held controls, one-shot actions and cockpit mouse look.
// Exports: KR.Input.
(function () {
  'use strict';
  KR.Input = class KestrelInput {
    constructor() {
      this.keys = {};
      this.mouse = { down: false, x: 0, y: 0, dx: 0, dy: 0 };
      this.listeners = [];
      this.controls = { pitch: 0, roll: 0 };
      addEventListener('keydown', (event) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
        if (event.repeat) return;
        this.keys[event.code] = true;
        for (const listener of this.listeners) listener(event);
      });
      addEventListener('keyup', (event) => { this.keys[event.code] = false; });
      addEventListener('mousedown', (event) => {
        this.mouse.down = true;
        this.mouse.x = event.clientX; this.mouse.y = event.clientY;
      });
      addEventListener('mouseup', () => { this.mouse.down = false; });
      addEventListener('mousemove', (event) => {
        if (!this.mouse.down) return;
        this.mouse.dx += event.clientX - this.mouse.x;
        this.mouse.dy += event.clientY - this.mouse.y;
        this.mouse.x = event.clientX; this.mouse.y = event.clientY;
      });
      addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; });
    }
    onKey(listener) { this.listeners.push(listener); }
    endFrame() {
      this.mouse.dx = 0; this.mouse.dy = 0;
    }
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
