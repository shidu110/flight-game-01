(function () {
  'use strict';
  KR.Input = class KestrelInput {
    constructor() {
      this.keys = {};
      this.pressed = {};
      this.mouse = { down: false, x: 0, y: 0, dx: 0, dy: 0, lookX: 0, lookY: 0 };
      this.listeners = [];
      addEventListener('keydown', (event) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
        if (!this.keys[event.code]) this.pressed[event.code] = true;
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
      this.pressed = {};
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
    wasPressed(code) { return !!this.pressed[code]; }
    get controlState() { return { pitch: (this.pitchDown ? 1 : 0) - (this.pitchUp ? 1 : 0), roll: (this.rollRight ? 1 : 0) - (this.rollLeft ? 1 : 0) }; }
  };
})();
