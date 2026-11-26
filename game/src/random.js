// Job: Provide deterministic seeded scenery randomness.
// Exports: KR.createRandom.
(function () {
  'use strict';
  KR.createRandom = function mulberry32(seed) {
    let state = seed >>> 0;
    function next() {
      state += 0x6D2B79F5;
      let value = Math.imul(state ^ state >>> 15, 1 | state);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }
    next.range = function (low, high) { return low + next() * (high - low); };
    return next;
  };
})();
