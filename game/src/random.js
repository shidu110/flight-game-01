// Job: Seeded Mulberry32 PRNG for deterministic island terrain, cloud decks, and vegetation placement.
// Exports: KR.createRandom
(function () {
  'use strict';
  KR.createRandom = function mulberry32(seed) {
    let s = seed >>> 0;
    function next() {
      s += 0x6D2B79F5;
      let v = Math.imul(s ^ s >>> 15, 1 | s);
      v ^= v + Math.imul(v ^ v >>> 7, 61 | v);
      return ((v ^ v >>> 14) >>> 0) / 4294967296;
    }
    next.range = (lo, hi) => lo + next() * (hi - lo);
    return next;
  };
})();
