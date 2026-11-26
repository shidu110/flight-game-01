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
      const wantedFov = this.mode === 'cockpit' ? 68 : 58;
      if (Math.abs(this.camera.fov - wantedFov) > 0.01) {
        this.camera.fov = wantedFov;
        this.camera.updateProjectionMatrix();
      }
      if (this.mode === 'cockpit') {
        const seat = new THREE.Vector3(0, 0.58, -0.15);
        seat.applyEuler(new THREE.Euler(state.pitch, -heading, -state.roll, 'YXZ'));
        this.camera.position.copy(state.position).add(seat);
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
        const angle = time * 0.075 + 2.2;
        const radius = 100;
        const desired = new THREE.Vector3(
          state.position.x + Math.cos(angle) * radius,
          state.position.y + 50 + Math.sin(angle * 0.79) * 7,
          state.position.z + Math.sin(angle) * radius
        );
        this.camera.position.lerp(desired, this.initialised ? 1 - Math.exp(-1.6 * delta) : 1);
        this.look.set(state.position.x - Math.sin(angle) * 24, state.position.y - 0.5, state.position.z + Math.cos(angle) * 24);
        this.camera.lookAt(this.look);
        this.initialised = true;
        return;
      }
      const behind = new THREE.Vector3(
        -Math.sin(heading) * this.chaseDistance + Math.cos(heading) * this.chaseSide,
        this.chaseHeight,
        Math.cos(heading) * this.chaseDistance + Math.sin(heading) * this.chaseSide
      );
      const desired = new THREE.Vector3().copy(state.position).add(behind);
      const ground = this.world.heightAt(desired.x, desired.z) + 2.5;
      desired.y = Math.max(desired.y, ground);
      this.position.lerp(desired, this.initialised ? 1 - Math.exp(-4.6 * delta) : 1);
      this.camera.position.copy(this.position);
      const lead = new THREE.Vector3(
        state.position.x + Math.sin(heading) * 18,
        state.position.y + 1.4,
        state.position.z - Math.cos(heading) * 18
      );
      this.look.lerp(lead, this.initialised ? 1 - Math.exp(-5.5 * delta) : 1);
      this.camera.lookAt(this.look);
      this.camera.rotation.z += -state.roll * 0.18;
      this.initialised = true;
    }
    reset() { this.initialised = false; }
  };
})();
