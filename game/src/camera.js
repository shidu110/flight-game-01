// Job: Camera rig (chase, cockpit, tower, dispatch briefing) and deterministic URL seed/view staging.
// Exports: KR.CameraRig, KR.ShotPresets, KR.Shots (compatibility alias)
(function () {
  'use strict';
  const C = KR.Config;
  KR.CameraRig = class KestrelCameraRig {
    constructor(camera, world) {
      this.camera = camera; this.world = world;
      this.mode = 'chase'; this.modes = ['chase', 'cockpit', 'tower'];
      this.chaseDistance = 18; this.chaseHeight = 5.2; this.chaseSide = 3;
      this.position = new THREE.Vector3(); this.look = new THREE.Vector3();
      this.seat = new THREE.Vector3(); this.behind = new THREE.Vector3();
      this.desired = new THREE.Vector3(); this.lead = new THREE.Vector3();
      this.orientation = new THREE.Euler(0, 0, 0, 'YXZ');
      this.initialised = false; this.lookYaw = 0; this.lookPitch = 0;
      this.tower = new THREE.Vector3(C.runway.x + 62, C.runway.height + 27, C.runway.z - 190);
    }
    cycle() {
      this.mode = this.modes[(this.modes.indexOf(this.mode) + 1) % this.modes.length];
      this.initialised = false;
      return this.mode;
    }
    update(dt, s, shots, time, input) {
      const hdg = s.heading, fov = this.mode === 'cockpit' ? 68 : this.mode === 'briefing' ? 50 : 58;
      if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
      if (this.mode === 'cockpit') {
        this.orientation.set(s.pitch, -hdg, -s.roll, 'YXZ');
        this.seat.set(0, 0.58, -0.15).applyEuler(this.orientation);
        this.camera.position.copy(s.position).add(this.seat);
        if (input && !shots.active) {
          this.lookYaw = C.clamp(this.lookYaw - input.mouse.dx * 0.003, -0.95, 0.95);
          this.lookPitch = C.clamp(this.lookPitch - input.mouse.dy * 0.0025, -0.45, 0.5);
          if (!input.mouse.down) { this.lookYaw = C.damp(this.lookYaw, 0, 4, dt); this.lookPitch = C.damp(this.lookPitch, 0, 4, dt); }
        }
        this.camera.rotation.set(s.pitch + this.lookPitch, -hdg + this.lookYaw, -s.roll, 'YXZ');
        this.camera.position.y += Math.sin(time * 31) * s.shake * 0.05;
        this.camera.position.x += Math.cos(time * 37) * s.shake * 0.07;
        this.initialised = false;
        return;
      }
      if (this.mode === 'tower') {
        this.camera.position.copy(this.tower);
        this.look.lerp(s.position, this.initialised ? 1 - Math.exp(-5 * dt) : 1);
        this.camera.lookAt(this.look);
        this.initialised = true;
        return;
      }
      if (this.mode === 'briefing') {
        this.desired.set(s.position.x - 22 + (shots.active ? 0 : Math.sin(time * 0.12) * 0.8), s.position.y + 6.2, s.position.z + 17);
        this.camera.position.lerp(this.desired, this.initialised ? 1 - Math.exp(-1.6 * dt) : 1);
        this.look.set(s.position.x - 6, s.position.y - 0.7, s.position.z - 6);
        this.camera.lookAt(this.look);
        this.initialised = true;
        return;
      }
      this.behind.set(-Math.sin(hdg) * this.chaseDistance + Math.cos(hdg) * this.chaseSide, this.chaseHeight, Math.cos(hdg) * this.chaseDistance + Math.sin(hdg) * this.chaseSide);
      this.desired.copy(s.position).add(this.behind);
      this.desired.y = Math.max(this.desired.y, this.world.heightAt(this.desired.x, this.desired.z) + 2.5);
      this.position.lerp(this.desired, this.initialised ? 1 - Math.exp(-4.6 * dt) : 1);
      this.camera.position.copy(this.position);
      this.lead.set(s.position.x + Math.sin(hdg) * 18, s.position.y + 1.4, s.position.z - Math.cos(hdg) * 18);
      this.look.lerp(this.lead, this.initialised ? 1 - Math.exp(-5.5 * dt) : 1);
      this.camera.lookAt(this.look);
      this.camera.rotation.z += -s.roll * 0.18;
      this.initialised = true;
    }
    reset() { this.initialised = false; }
  };
  KR.ShotPresets = class KestrelShotPresets {
    constructor() {
      const p = new URLSearchParams(location.search);
      this.name = ['cover', 'chase', 'approach', 'briefing'].includes(p.get('shot')) ? p.get('shot') : null;
      const raw = p.get('seed'), seed = raw === null || raw.trim() === '' ? C.seed : Number(raw);
      this.seed = Number.isFinite(seed) ? seed : C.seed;
    }
    get active() { return !!this.name; }
    apply(flight, missions, rig) {
      missions.frozen = this.active;
      if (this.name === 'cover') {
        flight.setState({ x: 142, y: 111, z: 569, heading: C.radians(247), pitch: C.radians(-1.5), roll: C.radians(16), speed: 46, throttle: 72, fuel: 44, hull: 94, rpm: 2380 });
        missions.next = 2; missions.state = 'flying'; missions.elapsed = 78; rig.mode = 'cockpit';
        const r = missions.rings[2];
        r.scale.setScalar(1.65);
        r.lookAt(142, 111, 569);
      } else if (this.name === 'chase') {
        flight.setState({ x: -1020, y: 72, z: 365, heading: C.radians(352.55), pitch: C.radians(1.5), roll: C.radians(33), speed: 54, throttle: 78, fuel: 63, hull: 88, rpm: 2490 });
        missions.next = 7; missions.state = 'flying'; missions.elapsed = 121;
        rig.mode = 'chase'; rig.chaseDistance = 17.5; rig.chaseHeight = 4.4; rig.chaseSide = 2.8;
      } else if (this.name === 'approach') {
        flight.setState({ x: -310, y: 15.26, z: 430, heading: 0, pitch: C.radians(2.5), roll: 0, speed: 32, throttle: 25, fuel: 19, hull: 71, rpm: 1780 });
        missions.next = 10; missions.state = 'flying'; missions.elapsed = 214;
        rig.mode = 'chase'; rig.chaseDistance = 24; rig.chaseHeight = 4.1; rig.chaseSide = 4.8;
      } else if (this.name === 'briefing') {
        flight.setState({ x: -310, y: C.runway.height + C.groundClearance, z: 130, heading: 0, speed: 0, throttle: 8, fuel: 100, hull: 100, rpm: 680, onGround: true });
        missions.state = 'briefing'; rig.mode = 'briefing';
      }
      if (this.active) { missions.frozen = true; missions.setRingVisibility(true); }
    }
  };
  KR.Shots = KR.ShotPresets;
})();
