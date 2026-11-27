// Job: Kestrel Run config: runway geometry, flight/fuel/stall constants, golden-hour palette, and math helpers.
// Exports: KR.Config
(function () {
  'use strict';
  window.KR = window.KR || {};
  THREE.ColorManagement.legacyMode = false;
  KR.Config = {
    title: 'KESTREL RUN',
    seed: 7,
    seaSize: 4000,
    waterLevel: 0,
    groundClearance: 2.25,
    runway: { x: -310, z: 100, width: 32, length: 600, height: 6.2, heading: 0 },
    flight: { stallSpeed: 26, maxSpeed: 86, takeoffSpeed: 30, fuelRate: 0.0042, idleFuel: 0.032, gravity: 9.81, step: 1 / 60 },
    palette: { horizon: 0xe9b882, sea: 0x216c77, seaDeep: 0x164b59, sand: 0xc9a77c, grass: 0x5c7042, forest: 0x384d34, rock: 0x6d5849, cream: 0xeae2d3, red: 0xd96432, navy: 0x1e3a4c, ink: 0x1a2026, gold: 0xff9f1c, mint: 0x79c9b7 },
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    damp: (v, t, r, dt) => THREE.MathUtils.lerp(v, t, 1 - Math.exp(-r * dt)),
    radians: (d) => d * Math.PI / 180,
    degrees: (r) => r * 180 / Math.PI,
    heading: (r) => (r * 180 / Math.PI % 360 + 360) % 360
  };
})();
