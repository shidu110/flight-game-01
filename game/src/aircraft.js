(function () {
  'use strict';
  KR.Aircraft = class KestrelK1 {
    constructor(scene) {
      const P = KR.Config.palette;
      this.group = new THREE.Group();
      this.exterior = new THREE.Group();
      this.group.add(this.exterior);
      scene.add(this.group);
      this.cream = new THREE.MeshStandardMaterial({ color: P.cream, flatShading: true, roughness: 0.58 });
      this.red = new THREE.MeshStandardMaterial({ color: P.red, flatShading: true, roughness: 0.56 });
      this.dark = new THREE.MeshStandardMaterial({ color: 0x293c3d, flatShading: true, roughness: 0.85 });
      this.metal = new THREE.MeshStandardMaterial({ color: 0xa5a897, metalness: 0.45, roughness: 0.5, flatShading: true });
      this.glass = new THREE.MeshStandardMaterial({ color: 0x7fbbbc, roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
      this.buildFuselage();
      this.buildWings();
      this.buildLandingGear();
      this.buildPropeller();
      this.exterior.traverse((object) => {
        if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
      });
      this.wheelSpin = 0;
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
      this.mesh(nose, this.red, [0, -0.03, -3.15]);
      const cowl = new THREE.CylinderGeometry(0.7, 0.86, 0.55, 10);
      cowl.rotateX(Math.PI / 2);
      this.mesh(cowl, this.dark, [0, -0.03, -3.88]);
      const tail = new THREE.CylinderGeometry(0.28, 1.02, 3.5, 8);
      tail.rotateX(Math.PI / 2);
      this.mesh(tail, this.cream, [0, 0.12, 4.75]);
      for (const side of [-1, 1]) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 4.4), this.red);
        stripe.position.set(side * 1.14, 0.08, 0.2);
        stripe.rotation.z = side * 0.08;
        this.exterior.add(stripe);
      }
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.84, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), this.glass);
      canopy.scale.set(0.96, 1.0, 1.85);
      canopy.position.set(0, 0.72, -0.58);
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
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.9, 5), this.metal);
        strut.position.set(side * 2.5, 0.2, -0.12);
        strut.rotation.z = side * 1.02;
        this.exterior.add(strut);
        const rearStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.7, 5), this.metal);
        rearStrut.position.set(side * 2.45, 0.2, 0.3);
        rearStrut.rotation.set(0.3, 0, side * 1.05);
        this.exterior.add(rearStrut);
      }
      const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.16, 1.15), this.cream);
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
      for (const angle of [0, Math.PI / 2]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.17, 2.7, 0.08), bladeMaterial);
        blade.rotation.z = angle;
        this.propeller.add(blade);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.28, 0.09), this.red);
        tip.position.y = 1.22;
        tip.rotation.z = angle;
        this.propeller.add(tip);
      }
      this.blur = new THREE.Mesh(new THREE.CircleGeometry(1.42, 28),
        new THREE.MeshBasicMaterial({ color: 0xd8c8a7, transparent: true, opacity: 0.17, side: THREE.DoubleSide, depthWrite: false }));
      this.blur.position.z = 0.03;
      this.propeller.add(this.blur);
      this.exterior.add(this.propeller);
    }
    setVisible(visible) { this.exterior.visible = visible; }
    update(delta, state) {
      this.group.position.set(state.position.x, state.position.y, state.position.z);
      this.group.rotation.set(state.pitch, -state.heading, -state.roll, 'YXZ');
      this.propeller.rotation.z -= delta * state.rpm * 0.1;
      this.blur.material.opacity = Math.min(0.3, state.rpm / 3100 * 0.3);
      this.wheelSpin += delta * state.speed / 0.49;
      for (const wheel of this.wheels) wheel.rotation.x = this.wheelSpin;
    }
  };
})();
