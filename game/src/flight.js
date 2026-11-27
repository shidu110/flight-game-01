// Job: 60 Hz flight model: pitch/roll/rudder authority, crosswind drift, stall buffet, fuel burn, touchdown impact/hull damage, and runway refuel/repair service.
// Exports: KR.Flight
(function () {
  'use strict';
  const C = KR.Config, TAU = Math.PI * 2;
  KR.Flight = class KestrelFlight {
    constructor(world) {
      this.world = world;
      this.position = new THREE.Vector3();
      this.crosswind = new THREE.Vector3();
      this.resetToRunway();
    }
    resetToRunway() {
      const rw = C.runway;
      this.position.set(rw.x, rw.height + C.groundClearance, rw.z + rw.length / 2 - 48);
      this.heading = this.pitch = this.roll = this.throttle = this.speed = this.verticalSpeed = this.rpm = this.simTime = this.shake = 0;
      this.altitude = this.position.y;
      this.fuel = this.hull = 100;
      this.crosswind.set(0, 0, 0);
      this.onGround = true;
      this.airborne = this.crashed = this.landed = false;
      this.touchdownMessage = '';
    }
    setState(s) {
      this.position.set(s.x, s.y, s.z);
      this.heading = s.heading;
      this.pitch = s.pitch || 0;
      this.roll = s.roll || 0;
      this.speed = s.speed;
      this.throttle = s.throttle === undefined ? 70 : s.throttle;
      this.rpm = s.rpm === undefined ? 2250 : s.rpm;
      this.fuel = s.fuel === undefined ? 78 : s.fuel;
      this.hull = s.hull === undefined ? 92 : s.hull;
      this.verticalSpeed = s.verticalSpeed || 0;
      this.altitude = s.y;
      this.onGround = !!s.onGround;
      this.airborne = !this.onGround;
      this.crashed = this.landed = false;
      this.simTime = 0;
    }
    update(dt, input, active) {
      if (this.crashed) return;
      this.simTime += dt;
      this.landed = false;
      if (active) {
        if (input.throttleUp) this.throttle += 32 * dt;
        if (input.throttleDown) this.throttle -= 32 * dt;
        this.throttle = C.clamp(this.throttle, 0, 100);
        const el = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
        const ai = (input.rollRight ? 1 : 0) - (input.rollLeft ? 1 : 0);
        const ru = (input.rudderRight ? 1 : 0) - (input.rudderLeft ? 1 : 0);
        const auth = C.clamp(this.speed / 38, 0.1, 1.3);
        this.pitch = C.clamp(this.pitch + el * dt * 0.68 * auth, -0.72, 0.72);
        this.roll = C.clamp(this.roll + ai * dt * 1.34 * auth, -1.28, 1.28);
        this.heading += ru * dt * 0.36 * auth;
        if (this.speed < C.flight.stallSpeed && !this.onGround) {
          this.pitch -= dt * 0.72;
          this.roll += Math.sin(this.simTime * 18) * dt * 0.5;
          this.shake = Math.max(this.shake, 0.36);
        }
        if (!this.onGround) this.heading += Math.tan(this.roll) * 0.33 * dt * C.clamp(this.speed / 34, 0, 1.2);
        this.heading = (this.heading + TAU) % TAU;
        const thrust = this.fuel > 0 ? this.throttle / 100 * 6.2 : 0;
        this.speed += (thrust - (this.onGround ? 0 : Math.sin(this.pitch) * 4.8) - this.speed * 0.074) * dt;
        if (this.onGround) this.speed -= 2.4 * dt;
        this.speed = C.clamp(this.speed, 0, C.flight.maxSpeed);
        const rpmT = this.fuel > 0 ? 600 + this.throttle * 24 + Math.max(0, this.speed - 30) * 6 : this.speed * 9;
        this.rpm = C.damp(this.rpm, rpmT, 2.5, dt);
        this.updateFuelAndHullState(dt);
      }
      const lift = C.clamp((this.speed - 20) / 24, 0, 1);
      let tVS = Math.sin(this.pitch) * this.speed * 0.78 * lift;
      if (!this.onGround) {
        if (this.speed < C.flight.stallSpeed) tVS -= 8.5;
        tVS -= Math.abs(Math.sin(this.roll)) * 1.8;
      }
      this.verticalSpeed = C.damp(this.verticalSpeed, tVS, 4, dt);
      const cp = Math.cos(this.pitch);
      this.position.x += Math.sin(this.heading) * this.speed * cp * dt;
      this.position.z -= Math.cos(this.heading) * this.speed * cp * dt;
      if (!this.onGround) this.position.addScaledVector(this.crosswind, dt);
      if (this.onGround) this.verticalSpeed = 0;
      this.position.y += this.verticalSpeed * dt;
      const gnd = this.world.heightAt(this.position.x, this.position.z), wat = this.world.waterLevel;
      this.altitude = this.position.y;
      if (this.onGround && this.speed > C.flight.takeoffSpeed && this.pitch > 0.06) {
        this.onGround = false; this.airborne = true;
        this.verticalSpeed = Math.max(this.verticalSpeed, 1.8);
        this.position.y = gnd + C.groundClearance + 0.08;
      }
      if (this.onGround) {
        this.position.y = gnd + C.groundClearance;
        if (!this.world.isRunway(this.position.x, this.position.z)) {
          this.crash(gnd <= 0 ? 'RUNWAY OVERRUN · WATER' : 'LEFT THE STRIP');
          return;
        }
      }
      if (this.position.y < Math.max(gnd, wat) + C.groundClearance) {
        const onRw = this.world.isRunway(this.position.x, this.position.z);
        if (!this.onGround) {
          const imp = Math.max(0, -this.verticalSpeed);
          if (onRw && Math.abs(this.roll) < 0.42 && Math.abs(this.pitch) < 0.34 && Math.abs(Math.sin(this.heading)) < 0.4) {
            this.position.y = C.runway.height + C.groundClearance;
            this.verticalSpeed = 0; this.pitch *= 0.4; this.roll *= 0.3;
            this.onGround = true; this.airborne = false;
            this.evaluateTouchdownImpact(imp);
          } else {
            this.crash(wat >= gnd ? 'DITCHED IN THE SEA' : 'TERRAIN IMPACT');
          }
        } else {
          this.position.y = gnd + C.groundClearance;
          this.verticalSpeed = 0; this.roll *= 0.8;
        }
      }
      if (this.onGround) {
        this.pitch = C.clamp(C.damp(this.pitch, 0, 0.8, dt), -0.1, 0.24);
        this.roll = C.clamp(C.damp(this.roll, 0, 3.2, dt), -0.08, 0.08);
        if (this.speed > C.flight.takeoffSpeed && this.throttle > 45) this.pitch += dt * 0.09;
        this.speed = Math.max(0, this.speed - (this.throttle < 10 ? 5.5 : 0.7) * dt);
      }
      this.position.y = Math.min(this.position.y, 1600);
      this.altitude = this.position.y;
      this.shake = C.damp(this.shake, 0, 4.2, dt);
    }
    applySortieParameters(sortie) { this.fuel = sortie.fuel; this.crosswind.set(sortie.crosswind, 0, 0); }
    updateFuelAndHullState(dt) {
      this.fuel = Math.max(0, this.fuel - (C.flight.idleFuel + this.throttle * C.flight.fuelRate) * dt);
      this.hull = C.clamp(this.hull, 0, 100);
      if (this.fuel <= 0) this.throttle = Math.max(0, this.throttle - 10 * dt);
    }
    evaluateTouchdownImpact(imp) {
      this.landed = true;
      if (imp < 4.5 && this.speed < 50) {
        this.speed *= 0.86;
        this.touchdownMessage = imp > 3 ? 'FIRM TOUCHDOWN · HULL SCRAPED' : 'GREASER · NICE ARRIVAL';
        if (imp > 3) this.hull = Math.max(0, this.hull - 10);
      } else {
        this.hull = Math.max(0, this.hull - (imp > 12 || this.speed > 65 ? 100 : 38));
        this.speed *= 0.55;
        this.touchdownMessage = 'HARD LANDING · HULL DAMAGED';
      }
      if (this.hull <= 0) { this.landed = false; this.crash('HARD CONTACT'); }
    }
    crash(reason) {
      this.crashed = true; this.landed = false; this.crashReason = reason;
      this.hull = this.speed = this.throttle = this.rpm = 0;
      this.verticalSpeed = -20; this.shake = 1;
    }
    applyLandingService() { this.fuel = this.hull = 100; }
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
