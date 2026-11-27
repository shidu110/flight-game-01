// Job: Kestrel K-1 airframe: fuselage, strutted high wing with aileron/flap panels, landing gear, exhausts, spinning prop disc, wingtip trails, and damage smoke.
// Exports: KR.Aircraft, KR.createPropellerTexture
(function () {
  'use strict';
  KR.createPropellerTexture = function () {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 6, 64, 64, 62);
    rg.addColorStop(0, 'rgba(22,28,34,0.06)');
    rg.addColorStop(0.42, 'rgba(42,50,58,0.16)');
    rg.addColorStop(0.84, 'rgba(234,224,205,0.34)');
    rg.addColorStop(0.95, 'rgba(255,196,120,0.42)');
    rg.addColorStop(1, 'rgba(234,224,205,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(64, 64, 63, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 2; k++) {
      g.save(); g.translate(64, 64); g.rotate(k * Math.PI + 0.35);
      const bg = g.createLinearGradient(0, 0, 56, 18);
      bg.addColorStop(0, 'rgba(20,26,32,0.34)'); bg.addColorStop(1, 'rgba(20,26,32,0)');
      g.fillStyle = bg; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 60, -0.34, 0.34); g.closePath(); g.fill();
      g.restore();
    }
    for (let s = 0; s < 6; s++) {
      g.strokeStyle = s % 2 ? 'rgba(24,30,36,0.22)' : 'rgba(244,235,218,0.3)';
      g.lineWidth = 3 + s % 2;
      g.beginPath(); g.arc(64, 64, 20 + s * 7, s * 1.9, s * 1.9 + 1.8); g.stroke();
    }
    const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; return tx;
  };
  KR.Aircraft = class KestrelK1 {
    constructor(scene) {
      const P = KR.Config.palette;
      this.group = new THREE.Group();
      this.exterior = new THREE.Group();
      this.group.add(this.exterior);
      scene.add(this.group);
      const std = (c, r, m) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: r, metalness: m || 0 });
      this.cream = std(P.cream, 0.58); this.red = std(P.red, 0.56); this.navy = std(P.navy, 0.64);
      this.dark = std(0x1a2026, 0.85); this.metal = std(0xa5a897, 0.48, 0.48);
      this.panel = std(0xd2c9b7, 0.62);
      this.glass = new THREE.MeshStandardMaterial({ color: 0x16343f, roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
      this.buildFuselage(); this.buildWings(); this.buildLandingGear(); this.buildPropeller();
      this.buildEngineSmoke(scene); this.buildWingTrails();
      this.exterior.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
      this.wheelSpin = this.wheelSpeed = 0;
      this.smokeOrigin = new THREE.Vector3(); this.smokeTrail = new THREE.Vector3();
    }
    mesh(geo, mat, pos, rot) {
      const o = new THREE.Mesh(geo, mat);
      if (pos) o.position.set(pos[0], pos[1], pos[2]);
      if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
      this.exterior.add(o); return o;
    }
    buildFuselage() {
      const cyl = (rt, rb, h, s, mat, pos) => { const g = new THREE.CylinderGeometry(rt, rb, h, s, 1); g.rotateX(Math.PI / 2); return this.mesh(g, mat, pos); };
      cyl(1.02, 1.18, 5.8, 10, this.cream, [0, 0, 0.3]);
      cyl(0.88, 1.08, 1.25, 10, this.cream, [0, -0.03, -3.15]);
      cyl(0.7, 0.86, 0.55, 10, this.navy, [0, -0.03, -3.88]);
      cyl(0.28, 1.02, 3.5, 8, this.cream, [0, 0.12, 4.75]);
      // Anti-glare dorsal nose strip, intake grille, and twin exhaust pipes
      this.mesh(new THREE.BoxGeometry(0.68, 0.08, 1.85), this.dark, [0, 0.89, -2.95], [0.1, 0, 0]);
      this.mesh(new THREE.BoxGeometry(0.66, 0.34, 0.12), this.dark, [0, -0.44, -4.12]);
      for (const s of [-1, 1]) {
        this.mesh(new THREE.BoxGeometry(0.07, 0.26, 4.4), this.navy, [s * 1.14, 0.08, 0.2], [0, 0, s * 0.08]);
        this.mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.95, 6), this.dark, [s * 0.72, -0.56, -3.18], [1.28, 0, s * 0.25]);
      }
      const canopy = this.mesh(new THREE.SphereGeometry(0.84, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), this.glass, [0, 0.72, -0.58]);
      canopy.scale.set(0.96, 1, 1.85); canopy.castShadow = false;
      this.mesh(new THREE.TorusGeometry(0.79, 0.055, 4, 12, Math.PI), this.dark, [0, 0.72, -0.58], [0, 0, Math.PI / 2]);
      this.mesh(new THREE.ConeGeometry(0.34, 0.7, 8), this.red, [0, -0.03, -4.25], [-Math.PI / 2, 0, 0]);
      this.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.65, 4), this.metal, [0, -0.8, 5.5]);
      this.mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.16, 8), this.dark, [0, -1.1, 5.5], [0, 0, Math.PI / 2]);
    }
    buildWings() {
      this.mesh(new THREE.BoxGeometry(11.4, 0.24, 1.95), this.cream, [0, 1.18, -0.2], [0, 0, 0.025]);
      // Wing trailing-edge flap/aileron bands & seam lines
      this.mesh(new THREE.BoxGeometry(10.2, 0.26, 0.05), this.dark, [0, 1.18, 0.34], [0, 0, 0.025]);
      for (const s of [-1, 1]) {
        this.mesh(new THREE.BoxGeometry(2.15, 0.25, 0.42), this.panel, [s * 2.1, 1.175, 0.57], [0, 0, 0.025]);
        this.mesh(new THREE.BoxGeometry(1.75, 0.25, 0.38), this.navy, [s * 3.72, 1.19, 0.58], [0, 0, 0.025]);
        this.mesh(new THREE.BoxGeometry(1.35, 0.26, 1.96), this.red, [s * 5.12, 1.2, -0.2], [0, 0, 0.025]);
        this.mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: s < 0 ? 0xf34244 : 0x54e99b, toneMapped: false }), [s * 5.78, 1.23, -0.6]);
        this.mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.9, 5), this.metal, [s * 2.5, 0.2, -0.12], [0, 0, s * 1.02]);
        this.mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.7, 5), this.metal, [s * 2.45, 0.2, 0.3], [0.3, 0, s * 1.05]);
      }
      this.mesh(new THREE.BoxGeometry(4.35, 0.16, 1.15), this.red, [0, 0.42, 5.65]);
      for (const s of [-1, 1]) this.mesh(new THREE.BoxGeometry(1.45, 0.15, 0.62), this.red, [s * 1.58, 0.42, 6.05]);
      this.mesh(new THREE.BoxGeometry(0.18, 1.75, 1.25), this.red, [0, 1.15, 5.82], [-0.18, 0, 0]);
      this.mesh(new THREE.BoxGeometry(0.16, 1.15, 0.55), this.cream, [0, 1.18, 6.47]);
    }
    buildLandingGear() {
      this.wheels = [];
      for (const s of [-1, 1]) {
        this.mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.55, 5), this.metal, [s * 1.55, -0.76, -1.55], [0, 0, s * 0.22]);
        // Diagonal cross-brace gear strut
        this.mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.78, 5), this.metal, [s * 0.88, -1.04, -1.55], [0, 0, -s * 1.05]);
        this.mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), this.dark, [s * 1.72, -1.32, -1.55]);
        const w = this.mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.28, 10), this.dark, [s * 1.72, -1.52, -1.55], [0, 0, Math.PI / 2]);
        this.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.31, 8), this.red, [s * 1.72, -1.52, -1.55], [0, 0, Math.PI / 2]);
        this.wheels.push(w);
      }
    }
    buildPropeller() {
      this.propeller = new THREE.Group();
      this.propeller.position.set(0, -0.03, -4.22);
      const bm = new THREE.MeshStandardMaterial({ color: 0x2b3535, flatShading: true, side: THREE.DoubleSide });
      this.propellerBlades = [];
      for (const a of [0, Math.PI / 2]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 2.7, 0.08), bm);
        b.rotation.z = a; this.propeller.add(b); this.propellerBlades.push(b);
        for (const s of [-1, 1]) {
          const tip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.28, 0.09), this.red);
          tip.position.y = s * 1.22; b.add(tip);
        }
      }
      this.blur = new THREE.Mesh(new THREE.CircleGeometry(1.42, 48), new THREE.MeshBasicMaterial({ map: KR.createPropellerTexture(), transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      this.blur.position.z = 0.03; this.blur.castShadow = false;
      this.propeller.add(this.blur); this.exterior.add(this.propeller);
    }
    buildEngineSmoke(scene) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(218,222,226,0.82)');
      gr.addColorStop(0.45, 'rgba(186,192,196,0.44)');
      gr.addColorStop(1, 'rgba(170,176,180,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
      this.smoke = new THREE.Group(); this.smokeTime = 0;
      for (let i = 0; i < 14; i++) {
        this.smoke.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false })));
      }
      scene.add(this.smoke);
    }
    buildWingTrails() {
      const cv = document.createElement('canvas'); cv.width = 16; cv.height = 128;
      const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,248,236,0.65)'); gr.addColorStop(0.4, 'rgba(244,238,226,0.28)'); gr.addColorStop(1, 'rgba(244,238,226,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 16, 128);
      const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
      this.trailMat = new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
      this.trails = new THREE.Group();
      for (const s of [-1, 1]) {
        const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 9.5), this.trailMat);
        ribbon.rotation.x = Math.PI / 2;
        ribbon.position.set(s * 5.72, 1.21, 4.95);
        this.trails.add(ribbon);
      }
      this.exterior.add(this.trails);
    }
    setVisible(v) { this.exterior.visible = v; this.smoke.visible = v && this.smokeActive; }
    update(dt, s) {
      this.group.position.set(s.position.x, s.position.y, s.position.z);
      this.group.rotation.set(s.pitch, -s.heading, -s.roll, 'YXZ');
      const tau = Math.PI * 2;
      this.propeller.rotation.z = ((this.propeller.rotation.z - dt * s.rpm * 0.1) % tau + tau) % tau;
      this.blur.material.opacity = Math.min(0.86, s.rpm / 2200 * 0.86);
      for (const b of this.propellerBlades) b.visible = s.rpm < 1100;
      this.trails.visible = !s.onGround && s.speed > 34;
      this.trailMat.opacity = Math.min(0.22, Math.max(0, (s.speed - 34) / 50) * 0.16 + Math.abs(s.roll) * 0.12);
      this.smokeTime += dt;
      this.smokeActive = s.hull < 80 && s.rpm > 200;
      this.smoke.visible = this.smokeActive && this.exterior.visible;
      if (this.smokeActive) {
        this.smokeOrigin.set(0.68, -0.45, -3.1).applyEuler(this.group.rotation).add(s.position);
        this.smokeTrail.set(-Math.sin(s.heading), 0.055, Math.cos(s.heading));
        this.smoke.children.forEach((p, i) => {
          const age = (i / 14 + this.smokeTime * 0.24) % 1;
          p.position.copy(this.smokeOrigin).addScaledVector(this.smokeTrail, age * (13 + s.speed * 0.25));
          p.position.x += Math.sin(i * 2.1 + age * 5) * age * 0.75;
          p.position.y += age * 0.85 + Math.sin(i * 1.6) * age * 0.3;
          p.scale.setScalar(0.8 + age * 3.1);
          p.material.opacity = 0.44 * (1 - age * 0.55);
        });
      }
      this.wheelSpeed = s.onGround ? s.speed / 0.49 : KR.Config.damp(this.wheelSpeed, 0, 1.8, dt);
      this.wheelSpin = (this.wheelSpin + dt * this.wheelSpeed) % tau;
      for (const w of this.wheels) w.rotation.x = -this.wheelSpin;
    }
  };
})();
