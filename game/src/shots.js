(function () {
  'use strict';
  KR.Shots = class KestrelShots {
    constructor() {
      const params = new URLSearchParams(location.search);
      this.name = ['cover', 'chase', 'approach', 'briefing'].includes(params.get('shot')) ? params.get('shot') : null;
      this.seed = Number(params.get('seed')) || KR.Config.seed;
    }
    get active() { return !!this.name; }
    apply(flight, missions, cameraRig) {
      missions.frozen = this.active;
      if (this.name === 'cover') {
        flight.setState({ x: -40, y: 120, z: 1000, heading: 0, pitch: -0.06, roll: -0.02, speed: 45, throttle: 68, fuel: 74, hull: 96, rpm: 2320 });
        missions.next = 2;
        missions.state = 'flying';
        missions.startedAt = performance.now() - 78000;
        missions.elapsed = 78;
        missions.banner = 'RING 3 / 10 · MAIN ISLAND';
        missions.bannerTime = 9;
        cameraRig.mode = 'cockpit';
      } else if (this.name === 'chase') {
        flight.setState({ x: 1050, y: 140, z: 1370, heading: 4.54, pitch: 0.02, roll: 0.4363, speed: 52, throttle: 76, fuel: 63, hull: 88, rpm: 2470 });
        missions.next = 5;
        missions.state = 'flying';
        missions.startedAt = performance.now() - 121000;
        missions.elapsed = 121;
        missions.banner = 'RING 6 / 10 · COASTLINE RUN';
        missions.bannerTime = 9;
        cameraRig.mode = 'chase';
      } else if (this.name === 'approach') {
        flight.setState({ x: -310, y: 22, z: 510, heading: 0, pitch: 0.045, roll: 0, speed: 32, throttle: 25, fuel: 19, hull: 71, rpm: 1780 });
        missions.next = 10;
        missions.state = 'flying';
        missions.startedAt = performance.now() - 214000;
        missions.elapsed = 214;
        missions.banner = 'FINAL · RUNWAY 36';
        missions.bannerTime = 9;
        cameraRig.mode = 'chase';
        cameraRig.chaseDistance = 24;
        cameraRig.chaseHeight = 3.8;
        cameraRig.chaseSide = 7;
      } else if (this.name === 'briefing') {
        flight.setState({ x: -310, y: KR.Config.runway.height + KR.Config.groundClearance, z: 40, heading: 0, speed: 0, throttle: 8, fuel: 100, hull: 100, rpm: 680, onGround: true });
        missions.state = 'briefing';
        cameraRig.mode = 'briefing';
      }
      if (this.active) {
        missions.frozen = true;
        missions.setRingVisibility(true);
      }
    }
  };
})();
