// Job: Position chase, cockpit, tower and dispatch cameras.
// Exports: KR.CameraRig.
(function () {
  'use strict';
  const C = KR.Config;
  KR.CameraRig = class KestrelCameraRig {
    constructor(camera, world) {
      this.camera = camera;
      this.world = world;
      this.mode = 'chase';
      this.modes = ['chase', 'cockpit', 'tower'];
      this.chaseDistance = 20;
      this.chaseHeight = 6;
      this.chaseSide = 3.5;
      this.position = new THREE.Vector3();
      this.look = new THREE.Vector3();
      this.seat = new THREE.Vector3();
      this.behind = new THREE.Vector3();
      this.desired = new THREE.Vector3();
      this.lead = new THREE.Vector3();
      this.orientation = new THREE.Euler(0, 0, 0, 'YXZ');
      this.initialised = false;
      this.lookYaw = 0;
      this.lookPitch = 0;
      this.tower = new THREE.Vector3(C.runway.x + 62, C.runway.height + 27, C.runway.z - 190);
    }
    cycle() {
      const index = this.modes.indexOf(this.mode);
      this.mode = this.modes[(index + 1) % this.modes.length];
      this.initialised = false;
      return this.mode;
    }
    update(delta, state, shots, time, input) {
      const heading = state.heading;
      const wantedFov = this.mode === 'cockpit' ? 68 : this.mode === 'briefing' ? 50 : 58;
      if (Math.abs(this.camera.fov - wantedFov) > 0.01) {
        this.camera.fov = wantedFov;
        this.camera.updateProjectionMatrix();
      }
      if (this.mode === 'cockpit') {
        this.orientation.set(state.pitch, -heading, -state.roll, 'YXZ');
        this.seat.set(0, 0.58, -0.15).applyEuler(this.orientation);
        this.camera.position.copy(state.position).add(this.seat);
        if (input && !shots.active) {
          this.lookYaw = C.clamp(this.lookYaw - input.mouse.dx * 0.003, -0.95, 0.95);
          this.lookPitch = C.clamp(this.lookPitch - input.mouse.dy * 0.0025, -0.45, 0.5);
          if (!input.mouse.down) {
            this.lookYaw = C.damp(this.lookYaw, 0, 4, delta);
            this.lookPitch = C.damp(this.lookPitch, 0, 4, delta);
          }
        }
        this.camera.rotation.set(state.pitch + this.lookPitch, -heading + this.lookYaw, -state.roll, 'YXZ');
        this.camera.position.y += Math.sin(time * 31) * state.shake * 0.05;
        this.camera.position.x += Math.cos(time * 37) * state.shake * 0.07;
        this.initialised = false;
        return;
      }
      if (this.mode === 'tower') {
        this.camera.position.copy(this.tower);
        this.look.lerp(state.position, this.initialised ? 1 - Math.exp(-5 * delta) : 1);
        this.camera.lookAt(this.look);
        this.initialised = true;
        return;
      }
      if (this.mode === 'briefing') {
        this.desired.set(
          state.position.x - 22 + (shots.active ? 0 : Math.sin(time * 0.12) * 0.8),
          state.position.y + 6.2,
          state.position.z + 17
        );
        this.camera.position.lerp(this.desired, this.initialised ? 1 - Math.exp(-1.6 * delta) : 1);
        this.look.set(state.position.x - 6, state.position.y - 0.7, state.position.z - 6);
        this.camera.lookAt(this.look);
        this.initialised = true;
        return;
      }
      this.behind.set(
        -Math.sin(heading) * this.chaseDistance + Math.cos(heading) * this.chaseSide,
        this.chaseHeight,
        Math.cos(heading) * this.chaseDistance + Math.sin(heading) * this.chaseSide
      );
      this.desired.copy(state.position).add(this.behind);
      const ground = this.world.heightAt(this.desired.x, this.desired.z) + 2.5;
      this.desired.y = Math.max(this.desired.y, ground);
      this.position.lerp(this.desired, this.initialised ? 1 - Math.exp(-4.6 * delta) : 1);
      this.camera.position.copy(this.position);
      this.lead.set(
        state.position.x + Math.sin(heading) * 18,
        state.position.y + 1.4,
        state.position.z - Math.cos(heading) * 18
      );
      this.look.lerp(this.lead, this.initialised ? 1 - Math.exp(-5.5 * delta) : 1);
      this.camera.lookAt(this.look);
      this.camera.rotation.z += -state.roll * 0.18;
      this.initialised = true;
    }
    reset() { this.initialised = false; }
  };
})();
