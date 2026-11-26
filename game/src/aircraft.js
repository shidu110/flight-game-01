// Job: Build and animate the Kestrel exterior, propeller and smoke.
// Exports: KR.Aircraft, KR.createPropellerTexture.
(function () {
  'use strict';
  KR.createPropellerTexture = function createPropellerBlurTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d');
    const radial = context.createRadialGradient(64, 64, 5, 64, 64, 62);
    radial.addColorStop(0, 'rgba(234,226,211,0.02)');
    radial.addColorStop(0.45, 'rgba(160,175,175,0.09)');
    radial.addColorStop(0.88, 'rgba(234,226,211,0.22)');
    radial.addColorStop(1, 'rgba(234,226,211,0)');
    context.fillStyle = radial;
    context.beginPath(); context.arc(64, 64, 63, 0, Math.PI * 2); context.fill();
    context.shadowBlur = 5; context.shadowColor = '#eae2d3';
    for (let sweep = 0; sweep < 8; sweep++) {
      context.strokeStyle = sweep % 2 ? 'rgba(26,32,38,0.20)' : 'rgba(234,226,211,0.25)';
      context.lineWidth = 4 + sweep % 3;
      context.beginPath(); context.arc(64, 64, 18 + sweep * 5.4, sweep * 1.7, sweep * 1.7 + 2.0); context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
  };
  KR.Aircraft = class KestrelK1 {
    constructor(scene) {
      const P = KR.Config.palette;
      this.group = new THREE.Group();
      this.exterior = new THREE.Group();
      this.group.add(this.exterior);
      scene.add(this.group);
      this.cream = new THREE.MeshStandardMaterial({ color: P.cream, flatShading: true, roughness: 0.58 });
      this.red = new THREE.MeshStandardMaterial({ color: P.red, flatShading: true, roughness: 0.56 });
      this.navy = new THREE.MeshStandardMaterial({ color: P.navy, flatShading: true, roughness: 0.64 });
      this.dark = new THREE.MeshStandardMaterial({ color: 0x1a2026, flatShading: true, roughness: 0.85 });
      this.metal = new THREE.MeshStandardMaterial({ color: 0xa5a897, metalness: 0.45, roughness: 0.5, flatShading: true });
      this.glass = new THREE.MeshStandardMaterial({ color: 0x16343f, roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
      this.buildFuselage();
      this.buildWings();
      this.buildLandingGear();
      this.buildPropeller();
      this.buildEngineSmoke(scene);
      this.exterior.traverse((object) => {
        if (object.isMesh) { object.castShadow = !object.material.transparent; object.receiveShadow = true; }
      });
      this.wheelSpin = 0;
      this.wheelSpeed = 0;
      this.smokeOrigin = new THREE.Vector3();
      this.smokeTrail = new THREE.Vector3();
    }
    mesh(geometry, material, position, rotation) {
      const object = new THREE.Mesh(geometry, material);
      if (position) object.position.set(position[0], position[1], position[2]);
      if (rotation) object.rotation.set(rotation[0], rotation[1], rotation[2]);
      this.exterior.add(object);
      return object;
    }
    buildFuselage() {
      const body = new THREE.CylinderGeometry(1.02, 1.18, 5.8, 10, 1);
      body.rotateX(Math.PI / 2);
      this.mesh(body, this.cream, [0, 0, 0.3]);
      const nose = new THREE.CylinderGeometry(0.88, 1.08, 1.25, 10);
      nose.rotateX(Math.PI / 2);
      this.mesh(nose, this.cream, [0, -0.03, -3.15]);
      const cowl = new THREE.CylinderGeometry(0.7, 0.86, 0.55, 10);
      cowl.rotateX(Math.PI / 2);
      this.mesh(cowl, this.navy, [0, -0.03, -3.88]);
      const tail = new THREE.CylinderGeometry(0.28, 1.02, 3.5, 8);
      tail.rotateX(Math.PI / 2);
      this.mesh(tail, this.cream, [0, 0.12, 4.75]);
      for (const side of [-1, 1]) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 4.4), this.navy);
        stripe.position.set(side * 1.14, 0.08, 0.2);
        stripe.rotation.z = side * 0.08;
        this.exterior.add(stripe);
      }
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.84, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), this.glass);
      canopy.scale.set(0.96, 1.0, 1.85);
      canopy.position.set(0, 0.72, -0.58);
      canopy.castShadow = false;
      this.exterior.add(canopy);
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.055, 4, 12, Math.PI), this.dark);
      frame.rotation.set(0, 0, Math.PI / 2);
      frame.position.set(0, 0.72, -0.58);
      this.exterior.add(frame);
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 8), this.red);
      spinner.rotation.x = -Math.PI / 2;
      spinner.position.set(0, -0.03, -4.25);
      this.exterior.add(spinner);
      const tailWheelStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.65, 4), this.metal);
      tailWheelStrut.position.set(0, -0.8, 5.5);
      this.exterior.add(tailWheelStrut);
      const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.16, 8), this.dark);
      tailWheel.rotation.z = Math.PI / 2;
      tailWheel.position.set(0, -1.1, 5.5);
      this.exterior.add(tailWheel);
    }
    buildWings() {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.24, 1.95), this.cream);
      wing.position.set(0, 1.18, -0.2);
      wing.rotation.z = 0.025;
      this.exterior.add(wing);
      for (const side of [-1, 1]) {
        const tip = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.26, 1.96), this.red);
        tip.position.set(side * 5.12, 1.2, -0.2);
        tip.rotation.z = 0.025;
        this.exterior.add(tip);
        const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: side < 0 ? 0xf34244 : 0x54e99b, toneMapped: false }));
        navLight.position.set(side * 5.78, 1.23, -0.6);
        this.exterior.add(navLight);
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.9, 5), this.metal);
        strut.position.set(side * 2.5, 0.2, -0.12);
        strut.rotation.z = side * 1.02;
        this.exterior.add(strut);
        const rearStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.7, 5), this.metal);
        rearStrut.position.set(side * 2.45, 0.2, 0.3);
        rearStrut.rotation.set(0.3, 0, side * 1.05);
        this.exterior.add(rearStrut);
      }
      const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.16, 1.15), this.red);
      stabilizer.position.set(0, 0.42, 5.65);
      this.exterior.add(stabilizer);
      for (const side of [-1, 1]) {
        const elevator = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.15, 0.62), this.red);
        elevator.position.set(side * 1.58, 0.42, 6.05);
        this.exterior.add(elevator);
      }
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.75, 1.25), this.red);
      fin.position.set(0, 1.15, 5.82);
      fin.rotation.x = -0.18;
      this.exterior.add(fin);
      const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, 0.55), this.cream);
      rudder.position.set(0, 1.18, 6.47);
      this.exterior.add(rudder);
    }
    buildLandingGear() {
      this.wheels = [];
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.55, 5), this.metal);
        leg.position.set(side * 1.55, -0.76, -1.55);
        leg.rotation.z = side * 0.22;
        this.exterior.add(leg);
        const fork = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), this.dark);
        fork.position.set(side * 1.72, -1.32, -1.55);
        this.exterior.add(fork);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.28, 10), this.dark);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 1.72, -1.52, -1.55);
        this.exterior.add(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.31, 8), this.red);
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(wheel.position);
        this.exterior.add(hub);
        this.wheels.push(wheel);
      }
    }
    buildPropeller() {
      this.propeller = new THREE.Group();
      this.propeller.position.set(0, -0.03, -4.22);
      const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x2b3535, flatShading: true, side: THREE.DoubleSide });
      this.propellerBlades = [];
      for (const angle of [0, Math.PI / 2]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.17, 2.7, 0.08), bladeMaterial);
        blade.rotation.z = angle;
        this.propeller.add(blade);
        this.propellerBlades.push(blade);
        for (const side of [-1, 1]) {
          const tip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.28, 0.09), this.red);
          tip.position.y = side * 1.22;
          blade.add(tip);
        }
      }
      this.blur = new THREE.Mesh(new THREE.CircleGeometry(1.42, 48),
        new THREE.MeshBasicMaterial({ map: KR.createPropellerTexture(), transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      this.blur.position.z = 0.03;
      this.blur.castShadow = false;
      this.propeller.add(this.blur);
      this.exterior.add(this.propeller);
    }
    buildEngineSmoke(scene) {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const context = canvas.getContext('2d');
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(132,137,139,0.65)');
      gradient.addColorStop(0.45, 'rgba(132,137,139,0.3)');
      gradient.addColorStop(1, 'rgba(132,137,139,0)');
      context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.encoding = THREE.sRGBEncoding;
      this.smoke = new THREE.Group();
      this.smokeTime = 0;
      for (let index = 0; index < 12; index++) {
        const particle = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }));
        this.smoke.add(particle);
      }
      scene.add(this.smoke);
    }
    setVisible(visible) {
      this.exterior.visible = visible;
      this.smoke.visible = visible && this.smokeActive;
    }
    update(delta, state) {
      this.group.position.set(state.position.x, state.position.y, state.position.z);
      this.group.rotation.set(state.pitch, -state.heading, -state.roll, 'YXZ');
      const tau = Math.PI * 2;
      this.propeller.rotation.z = ((this.propeller.rotation.z - delta * state.rpm * 0.1) % tau + tau) % tau;
      this.blur.material.opacity = Math.min(0.86, state.rpm / 2200 * 0.86);
      for (const blade of this.propellerBlades) blade.visible = state.rpm < 1100;
      this.smokeTime += delta;
      this.smokeActive = state.hull < 80 && state.rpm > 200;
      this.smoke.visible = this.smokeActive && this.exterior.visible;
      if (this.smokeActive) {
        this.smokeOrigin.set(0.75, -0.35, -3.6).applyEuler(this.group.rotation).add(state.position);
        this.smokeTrail.set(-Math.sin(state.heading), 0.035, Math.cos(state.heading));
        this.smoke.children.forEach((particle, index) => {
          const age = (index / 12 + this.smokeTime * 0.22) % 1;
          particle.position.copy(this.smokeOrigin).addScaledVector(this.smokeTrail, age * (12 + state.speed * 0.22));
          particle.position.x += Math.sin(index * 2.3 + age * 6) * age * 0.7;
          particle.position.y += age * 0.6 + Math.sin(index * 1.7) * age * 0.35;
          particle.scale.setScalar(0.65 + age * 2.7);
          particle.material.opacity = 0.35 - age * 0.1;
        });
      }
      this.wheelSpeed = state.onGround ? state.speed / 0.49 : KR.Config.damp(this.wheelSpeed, 0, 1.8, delta);
      this.wheelSpin = (this.wheelSpin + delta * this.wheelSpeed) % tau;
      for (const wheel of this.wheels) wheel.rotation.x = -this.wheelSpin;
    }
  };
})();
