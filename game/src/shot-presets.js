// Job: Parse the shared seed and stage deterministic camera presets.
// Exports: KR.ShotPresets, KR.Shots (compatibility alias).
(function () {
  'use strict';
  KR.ShotPresets = class KestrelShotPresets {
    constructor() {
      const params = new URLSearchParams(location.search);
      this.name = ['cover', 'chase', 'approach', 'briefing'].includes(params.get('shot')) ? params.get('shot') : null;
      const rawSeed = params.get('seed');
      const seed = rawSeed === null || rawSeed.trim() === '' ? KR.Config.seed : Number(rawSeed);
      this.seed = Number.isFinite(seed) ? seed : KR.Config.seed;
    }
    get active() { return !!this.name; }
    apply(flight, missions, cameraRig) {
      missions.frozen = this.active;
      if (this.name === 'cover') {
        flight.setState({ x: -58, y: 120, z: 1000, heading: 0, pitch: KR.Config.radians(-2), roll: KR.Config.radians(14), speed: 45, throttle: 68, fuel: 74, hull: 96, rpm: 2320 });
        missions.next = 2;
        missions.state = 'flying';
        missions.elapsed = 78;
        cameraRig.mode = 'cockpit';
      } else if (this.name === 'chase') {
        flight.setState({ x: -1030, y: 70, z: 390, heading: KR.Config.radians(352.55), pitch: KR.Config.radians(1.5), roll: KR.Config.radians(27), speed: 52, throttle: 76, fuel: 63, hull: 88, rpm: 2470 });
        missions.next = 7;
        missions.state = 'flying';
        missions.elapsed = 121;
        cameraRig.mode = 'chase';
        cameraRig.chaseDistance = 24;
        cameraRig.chaseHeight = 5.5;
        cameraRig.chaseSide = 2.5;
      } else if (this.name === 'approach') {
        flight.setState({ x: -310, y: 15.26, z: 430, heading: 0, pitch: KR.Config.radians(2.5), roll: 0, speed: 32, throttle: 25, fuel: 19, hull: 71, rpm: 1780 });
        missions.next = 10;
        missions.state = 'flying';
        missions.elapsed = 214;
        cameraRig.mode = 'chase';
        cameraRig.chaseDistance = 26;
        cameraRig.chaseHeight = 4;
        cameraRig.chaseSide = 5;
      } else if (this.name === 'briefing') {
        flight.setState({ x: -310, y: KR.Config.runway.height + KR.Config.groundClearance, z: 130, heading: 0, speed: 0, throttle: 8, fuel: 100, hull: 100, rpm: 680, onGround: true });
        missions.state = 'briefing';
        cameraRig.mode = 'briefing';
      }
      if (this.active) {
        missions.frozen = true;
        missions.setRingVisibility(true);
      }
    }
  };
  KR.Shots = KR.ShotPresets;
})();
