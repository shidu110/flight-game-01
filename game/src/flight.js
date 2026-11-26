(function () {
  'use strict';
  const C = KR.Config;
  const TAU = Math.PI * 2;
  KR.Flight = class KestrelFlight {
    constructor(world) {
      this.world = world;
      this.position = new THREE.Vector3();
      this.velocity = new THREE.Vector3();
      this.heading = 0;
      this.pitch = 0;
      this.roll = 0;
      this.throttle = 0;
      this.speed = 0;
      this.verticalSpeed = 0;
      this.altitude = 0;
      this.rpm = 0;
      this.fuel = 100;
      this.hull = 100;
      this.onGround = true;
      this.airborne = false;
      this.crashed = false;
      this.landed = false;
      this.shake = 0;
      this.touchdownMessage = '';
      this.resetToRunway();
    }
    resetToRunway() {
      const rw = C.runway;
      this.position.set(rw.x, rw.height + C.groundClearance, rw.z + rw.length / 2 - 48);
      this.heading = 0;
      this.pitch = 0; this.roll = 0; this.throttle = 0; this.speed = 0;
      this.verticalSpeed = 0; this.altitude = this.position.y; this.rpm = 0;
      this.fuel = 100; this.hull = 100;
      this.velocity.set(0, 0, 0);
      this.onGround = true; this.airborne = false; this.crashed = false; this.landed = false;
    }
    setState(state) {
      this.position.set(state.x, state.y, state.z);
      this.heading = state.heading;
      this.pitch = state.pitch || 0;
      this.roll = state.roll || 0;
      this.speed = state.speed;
      this.throttle = state.throttle === undefined ? 70 : state.throttle;
      this.rpm = state.rpm === undefined ? 2250 : state.rpm;
      this.fuel = state.fuel === undefined ? 78 : state.fuel;
      this.hull = state.hull === undefined ? 92 : state.hull;
      this.verticalSpeed = state.verticalSpeed || 0;
      this.altitude = state.y;
      this.onGround = !!state.onGround;
      this.airborne = !this.onGround;
      this.crashed = false;
      this.velocity.set(Math.sin(this.heading) * this.speed, this.verticalSpeed, -Math.cos(this.heading) * this.speed);
    }
    update(delta, input, active) {
      if (this.crashed) return;
      this.landed = false;
      if (active) {
        if (input.throttleUp) this.throttle += 32 * delta;
        if (input.throttleDown) this.throttle -= 32 * delta;
        this.throttle = C.clamp(this.throttle, 0, 100);
        const elevator = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
        const aileron = (input.rollRight ? 1 : 0) - (input.rollLeft ? 1 : 0);
        const rudder = (input.rudderRight ? 1 : 0) - (input.rudderLeft ? 1 : 0);
        const authority = C.clamp(this.speed / 38, 0.1, 1.3);
        this.pitch += elevator * delta * 0.68 * authority;
        this.roll += aileron * delta * 1.34 * authority;
        this.heading += rudder * delta * 0.36 * authority;
        this.roll = C.clamp(this.roll, -1.28, 1.28);
        this.pitch = C.clamp(this.pitch, -0.72, 0.72);
        const stall = this.speed < C.flight.stallSpeed && !this.onGround;
        if (stall) {
          this.pitch -= delta * 0.72;
          this.roll += Math.sin(performance.now() * 0.018) * delta * 0.5;
          this.shake = Math.max(this.shake, 0.36);
        }
        if (!this.onGround) this.heading += Math.tan(this.roll) * 0.33 * delta * C.clamp(this.speed / 34, 0, 1.2);
        this.heading = (this.heading + TAU) % TAU;
        const thrust = this.fuel > 0 ? this.throttle / 100 * 6.2 : 0;
        this.speed += (thrust - (this.onGround ? 0 : Math.sin(this.pitch) * 4.8) - this.speed * 0.074) * delta;
        if (this.onGround) this.speed -= 2.4 * delta;
        this.speed = C.clamp(this.speed, 0, C.flight.maxSpeed);
        const rpmTarget = this.fuel > 0 ? 600 + this.throttle * 24 + Math.max(0, this.speed - 30) * 6 : this.speed * 9;
        this.rpm = C.damp(this.rpm, rpmTarget, 2.5, delta);
        this.fuel = Math.max(0, this.fuel - (C.flight.idleFuel + this.throttle * C.flight.fuelRate) * delta);
        if (this.fuel <= 0) this.throttle = Math.max(0, this.throttle - 10 * delta);
      }
      const liftFactor = C.clamp((this.speed - 20) / 24, 0, 1);
      this.verticalSpeed = Math.sin(this.pitch) * this.speed * 0.78 * liftFactor + (this.speed < C.flight.stallSpeed && !this.onGround ? -8.5 : 0);
      if (!this.onGround) this.verticalSpeed -= Math.abs(Math.sin(this.roll)) * 1.8;
      this.verticalSpeed = C.damp(this.verticalSpeed, liftFactor > 0 ? this.verticalSpeed : -12, 1.8, delta);
      this.position.x += Math.sin(this.heading) * this.speed * Math.cos(this.pitch) * delta;
      this.position.z -= Math.cos(this.heading) * this.speed * Math.cos(this.pitch) * delta;
      if (this.onGround) this.verticalSpeed = 0;
      this.position.y += this.verticalSpeed * delta;
      const ground = this.world.heightAt(this.position.x, this.position.z);
      const water = this.world.waterLevel;
      this.altitude = this.position.y;
      if (this.onGround && this.speed > C.flight.takeoffSpeed && this.pitch > 0.06) {
        this.onGround = false;
        this.airborne = true;
        this.verticalSpeed = Math.max(this.verticalSpeed, 1.8);
        this.position.y = ground + C.groundClearance + 0.08;
      }
      if (this.onGround) {
        this.position.y = ground + C.groundClearance;
        if (!this.world.isRunway(this.position.x, this.position.z)) this.crash(ground <= 0 ? 'RUNWAY OVERRUN · WATER' : 'LEFT THE STRIP');
      }
      if (this.position.y < Math.max(ground, water) + C.groundClearance) {
        const runway = this.world.isRunway(this.position.x, this.position.z);
        if (!this.onGround) {
          const impact = Math.max(0, -this.verticalSpeed);
          if (runway && Math.abs(this.roll) < 0.42 && Math.abs(this.pitch) < 0.34 && Math.abs(Math.sin(this.heading)) < 0.4) {
            this.position.y = C.runway.height + C.groundClearance;
            this.verticalSpeed = 0;
            this.pitch *= 0.4; this.roll *= 0.3;
            this.onGround = true;
            this.airborne = false;
            if (impact < 4.5 && this.speed < 50) {
              this.landed = true;
              this.speed *= 0.86;
              this.touchdownMessage = impact > 3 ? 'FIRM TOUCHDOWN · HULL SCRAPED' : 'GREASER · NICE ARRIVAL';
              if (impact > 3) this.hull = Math.max(0, this.hull - 10);
            } else {
              this.hull = Math.max(0, this.hull - (impact > 12 || this.speed > 65 ? 100 : 38));
              this.speed *= 0.55;
              this.touchdownMessage = 'HARD LANDING · HULL DAMAGED';
              this.landed = true;
              if (this.hull <= 0) this.crash('HARD CONTACT');
            }
          } else {
            const overWater = water >= ground;
            this.crash(overWater ? 'DITCHED IN THE SEA' : 'TERRAIN IMPACT');
          }
        } else {
          this.position.y = ground + C.groundClearance;
          this.verticalSpeed = 0;
          this.roll *= 0.8;
        }
      }
      if (this.onGround) {
        this.pitch = C.damp(this.pitch, 0, 0.8, delta);
        this.roll = C.damp(this.roll, 0, 3.2, delta);
        this.roll = C.clamp(this.roll, -0.08, 0.08);
        this.pitch = C.clamp(this.pitch, -0.1, 0.24);
        if (this.speed > C.flight.takeoffSpeed && this.throttle > 45) this.pitch += delta * 0.09;
        this.speed = Math.max(0, this.speed - (this.throttle < 10 ? 5.5 : 0.7) * delta);
      }
      this.position.y = Math.min(this.position.y, 1600);
      this.altitude = this.position.y;
      this.shake = C.damp(this.shake, 0, 4.2, delta);
    }
    crash(reason) {
      this.crashed = true;
      this.crashReason = reason;
      this.hull = 0;
      this.speed = 0;
      this.verticalSpeed = -20;
      this.throttle = 0;
      this.rpm = 0;
      this.shake = 1;
    }
    applyLandingService() {
      this.fuel = 100;
      this.hull = 100;
    }
    snapshot() {
      return {
        position: this.position, heading: this.heading, pitch: this.pitch, roll: this.roll,
        speed: this.speed, altitude: this.altitude, verticalSpeed: this.verticalSpeed,
        rpm: this.rpm, throttle: this.throttle, fuel: this.fuel, hull: this.hull,
        onGround: this.onGround, crashed: this.crashed, landed: this.landed
      };
    }
  };
})();
