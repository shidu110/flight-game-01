(function () {
  'use strict';
  window.KR = window.KR || {};
  KR.Config = {
    title: 'KESTREL RUN',
    seed: 7,
    seaSize: 4000,
    waterLevel: 0,
    groundClearance: 2.25,
    runway: { x: -310, z: 100, width: 32, length: 600, height: 6.2, heading: 0 },
    flight: { stallSpeed: 26, maxSpeed: 86, takeoffSpeed: 30, fuelRate: 0.0042, idleFuel: 0.032, gravity: 9.81, step: 1 / 60 },
    palette: { sea: 0x247f87, seaDeep: 0x155967, sand: 0xc6b77b, grass: 0x6e9562, rock: 0x8d9383, cream: 0xeee4c7, red: 0xb6402d, ink: 0x142e35, gold: 0xffce76, mint: 0x79efbf },
    clamp: function (value, low, high) { return Math.max(low, Math.min(high, value)); },
    damp: function (value, target, rate, delta) { return THREE.MathUtils.lerp(value, target, 1 - Math.exp(-rate * delta)); },
    radians: function (degrees) { return degrees * Math.PI / 180; },
    degrees: function (radians) { return radians * 180 / Math.PI; },
    heading: function (radians) { return (radians * 180 / Math.PI % 360 + 360) % 360; }
  };
})();
