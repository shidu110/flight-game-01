// Job: 3D cockpit: anti-glare cowling, prop disc, slim canopy struts, animated yoke, and 6 canvas dials (ASI, ALT, AI, HDG, VSI, RPM) plus fuel lamp.
// Exports: KR.Cockpit
(function () {
  'use strict';
  const C = KR.Config;
  KR.Cockpit = class KestrelCockpit {
    constructor(camera) {
      this.group = new THREE.Group();
      this.group.visible = false;
      this.group.position.set(0, -0.02, 0);
      camera.add(this.group);
      this.buildShell();
      this.buildCowlAndPropeller();
      this.buildPanel();
      this.buildYoke();
      this.gaugeCanvases = {};
      this.buildGauges();
      this.pitch = this.roll = this.gaugeElapsed = this.animationTime = 0;
      this.gaugesReady = false;
    }
    mat(c, r, m) { return new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.82 : r, metalness: m || 0, flatShading: true }); }
    box(w, h, d, c, x, y, z, r, m) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(c, r, m));
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      return mesh;
    }
    buildShell() {
      const fm = 0x1b232b;
      // Slim metallic top & side canopy frame kept inside outer 8% sides and top 5%
      this.box(2.6, 0.048, 0.09, fm, 0, 0.72, -1.04, 0.48, 0.45);
      for (const s of [-1, 1]) {
        const pillar = this.box(0.032, 1.56, 0.05, fm, s * 1.06, 0.16, -1.04, 0.48, 0.45);
        pillar.rotation.z = s * 0.07;
        const corner = this.box(0.024, 0.42, 0.04, fm, s * 1.03, 0.62, -1.06, 0.48, 0.45);
        corner.rotation.z = s * 0.78;
        const st = new THREE.Vector3(s * 1.24, -0.44, -1.62), en = new THREE.Vector3(s * 2.52, 0.88, -2.14);
        const dir = en.clone().sub(st);
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.021, dir.length(), 5), this.mat(0x1b252c, 0.5, 0.35));
        strut.position.copy(st).add(en).multiplyScalar(0.5);
        strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        this.group.add(strut);
      }
      const shade = this.box(1.58, 0.048, 0.28, 0x181f26, 0, -0.295, -1.36, 0.94);
      shade.rotation.x = -0.18;
      this.box(1.56, 0.62, 0.09, 0x262f38, 0, -0.57, -1.25, 0.78);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.008, 0.036), new THREE.MeshBasicMaterial({ color: 0x566470 }));
      lip.position.set(0, -0.268, -1.21);
      this.group.add(lip);
      this.lamp = new THREE.PointLight(0xffb870, 0.72, 3);
      this.lamp.position.set(0, 0.2, -0.5);
      this.group.add(this.lamp);
    }
    buildCowlAndPropeller() {
      // Lowered, slimmer cream cowling with matte dark-gray anti-glare top & panel vents
      const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), this.mat(0xe5dccb, 0.58));
      cowl.position.set(0, -0.46, -2.55); cowl.scale.set(0.84, 0.21, 1.56);
      this.group.add(cowl);
      const antiGlare = new THREE.Mesh(new THREE.SphereGeometry(0.625, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.34), this.mat(0x252c33, 0.96));
      antiGlare.position.set(0, -0.456, -2.54); antiGlare.scale.set(0.66, 0.214, 1.48);
      this.group.add(antiGlare);
      const seam = this.box(0.016, 0.006, 1.18, 0x141a20, 0, -0.321, -2.48, 0.9);
      seam.rotation.x = -0.05;
      for (const s of [-1, 1]) {
        const line = this.box(0.01, 0.006, 1.05, 0x182129, s * 0.28, -0.348, -2.46, 0.85);
        line.rotation.set(-0.05, s * 0.06, -s * 0.26);
        for (let v = 0; v < 3; v++) {
          const vent = this.box(0.055, 0.007, 0.018, 0x12171d, s * 0.16, -0.332 + v * 0.005, -2.18 - v * 0.14, 0.9);
          vent.rotation.z = -s * 0.12;
        }
      }
      this.cockpitPropeller = new THREE.Mesh(new THREE.CircleGeometry(0.84, 48), new THREE.MeshBasicMaterial({ map: KR.createPropellerTexture(), transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      this.cockpitPropeller.position.set(0, -0.33, -3.48);
      this.group.add(this.cockpitPropeller);
      const hub = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.22, 10), this.mat(0xc95a2c, 0.42, 0.25));
      hub.rotation.x = -Math.PI / 2; hub.position.set(0, -0.33, -3.55);
      this.group.add(hub);
      this.compass = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: 0x12181e }));
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.006, 6, 18), this.mat(0x5a6874, 0.4, 0.55));
      this.compass.add(ball, bezel);
      this.compass.position.set(0, -0.195, -1.48);
      this.box(0.018, 0.055, 0.018, 0x1a2026, 0, -0.242, -1.48, 0.8);
      this.group.add(this.compass);
      this.compassMark = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.02, 0.006), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      this.compassMark.position.set(0, 0.008, 0.039);
      this.compass.add(this.compassMark);
    }
    buildPanel() {
      const placard = document.createElement('canvas'); placard.width = 512; placard.height = 64;
      const g = placard.getContext('2d');
      g.fillStyle = '#eae4d7'; g.font = 'bold 28px monospace'; g.textAlign = 'center';
      g.fillText('KESTREL K-1 · G-AWK', 256, 42);
      const lt = new THREE.CanvasTexture(placard); lt.encoding = THREE.sRGBEncoding;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.072), new THREE.MeshBasicMaterial({ map: lt, transparent: true, toneMapped: false }));
      label.position.set(0, -0.80, -1.19);
      this.group.add(label);
      const bm = this.mat(0x88939a, 0.36, 0.72);
      for (let i = 0; i < 4; i++) {
        const base = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.005, 5, 12), bm);
        base.position.set(0.61, -0.43 - i * 0.066, -1.19);
        const tog = this.box(0.011, 0.036, 0.013, 0xd6d4c8, 0.61, -0.422 - i * 0.066, -1.174, 0.5);
        tog.rotation.x = i % 2 ? -0.45 : 0.45;
        this.group.add(base);
      }
      this.fuelWarning = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), new THREE.MeshBasicMaterial({ color: 0x493320, toneMapped: false }));
      this.fuelWarning.position.set(0.61, -0.32, -1.188);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.005, 6, 18), bm);
      ring.position.set(0.61, -0.32, -1.19);
      this.group.add(this.fuelWarning, ring);
      const wl = document.createElement('canvas'); wl.width = 128; wl.height = 32;
      const wc = wl.getContext('2d'); wc.fillStyle = '#eae4d7'; wc.font = 'bold 22px monospace'; wc.textAlign = 'center'; wc.fillText('FUEL', 64, 24);
      const wt = new THREE.CanvasTexture(wl); wt.encoding = THREE.sRGBEncoding;
      const wText = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.028), new THREE.MeshBasicMaterial({ map: wt, transparent: true, toneMapped: false }));
      wText.position.set(0.61, -0.368, -1.186); this.group.add(wText);
    }
    buildYoke() {
      const yk = new THREE.Group(), m = this.mat(0x1b262a, 0.78);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.029, 0.24, 6), m);
      shaft.rotation.x = 0.3; shaft.position.set(0, -0.12, 0.12);
      const hub = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.08), m);
      hub.position.set(0, -0.02, 0.02);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.023, 5, 16, Math.PI), m);
      rim.position.set(0, 0.03, 0.02); rim.rotation.z = Math.PI;
      yk.add(shaft, hub, rim);
      for (const s of [-1, 1]) {
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.033, 0.2, 6), m);
        grip.position.set(s * 0.19, 0.03, 0.02); yk.add(grip);
      }
      yk.scale.setScalar(0.58); yk.position.set(-0.62, -0.50, -1.23);
      this.yoke = yk; this.group.add(yk);
    }
    buildGauges() {
      const specs = [
        ['speed', 'AIRSPEED', 'KT'], ['alt', 'ALTITUDE', 'FT'], ['att', 'ATTITUDE', ''],
        ['hdg', 'HEADING', 'DEG'], ['vsi', 'VERT SPD', 'FPM'], ['rpm', 'TACH', 'RPM']
      ];
      const bezelMat = this.mat(0x697682, 0.32, 0.72), innerMat = new THREE.MeshBasicMaterial({ color: 0xd99242, toneMapped: false });
      specs.forEach((sp, i) => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 256;
        const tx = new THREE.CanvasTexture(cv); tx.minFilter = THREE.LinearFilter; tx.encoding = THREE.sRGBEncoding;
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.111, 40), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }));
        const col = i % 3, row = Math.floor(i / 3);
        face.position.set((col - 1) * 0.295 - 0.03, -0.342 - row * 0.232, -1.188);
        this.group.add(face);
        const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.01, 8, 36), bezelMat);
        bezel.position.copy(face.position); bezel.position.z -= 0.004;
        const amber = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.003, 6, 36), innerMat);
        amber.position.copy(face.position); amber.position.z += 0.002;
        this.group.add(bezel, amber);
        const base = document.createElement('canvas'); base.width = base.height = 256;
        this.gaugeCanvases[sp[0]] = { canvas: cv, base, context: cv.getContext('2d'), texture: tx, label: sp[1], unit: sp[2] };
        this.buildGaugeBase(sp[0]);
      });
    }
    buildGaugeBase(name) {
      const ga = this.gaugeCanvases[name], g = ga.base.getContext('2d');
      if (name === 'att') {
        // High-contrast bright aviation yellow wing marker + top bank scale arc
        g.strokeStyle = '#ffd23f'; g.lineWidth = 7; g.lineCap = 'round';
        g.beginPath(); g.moveTo(64, 128); g.lineTo(106, 128); g.lineTo(118, 141); g.lineTo(128, 128); g.lineTo(138, 141); g.lineTo(150, 128); g.lineTo(192, 128); g.stroke();
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(128, 128, 5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,184,96,0.55)'; g.lineWidth = 4;
        g.beginPath(); g.arc(128, 128, 114, 0, Math.PI * 2); g.stroke();
        g.save(); g.translate(128, 128);
        for (const deg of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
          const a = -Math.PI / 2 + deg * Math.PI / 180;
          g.strokeStyle = deg === 0 ? '#ffd23f' : '#f2ece0'; g.lineWidth = deg % 30 === 0 ? 4 : 2.5;
          g.beginPath(); g.moveTo(Math.cos(a) * 98, Math.sin(a) * 98); g.lineTo(Math.cos(a) * 112, Math.sin(a) * 112); g.stroke();
        }
        g.restore();
      } else {
        const gr = g.createRadialGradient(128, 120, 14, 128, 128, 124);
        gr.addColorStop(0, '#1e2833'); gr.addColorStop(0.75, '#10161d'); gr.addColorStop(1, '#080c11');
        g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,176,84,0.42)'; g.lineWidth = 5; g.stroke();
        g.strokeStyle = 'rgba(255,196,120,0.22)'; g.lineWidth = 2;
        g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke();
        if (name === 'speed') this.dialTicks(g, Math.PI * 0.78, Math.PI * 2.22, 10, 103, 13, 2, (i) => String(i * 20));
        if (name === 'alt') this.dialTicks(g, Math.PI * 0.75, Math.PI * 2.25, 10, 103, 13, 1, (i) => String(i));
        if (name === 'hdg') this.dialTicks(g, -Math.PI / 2, Math.PI * 1.5, 12, 103, 13, 1, (i) => ['N', '3', '6', '9', '12', '15', '18', '21', '24', '27', '30', '33', 'N'][i]);
        if (name === 'vsi') this.dialTicks(g, Math.PI * 0.65, Math.PI * 2.35, 8, 103, 13, 2, (i) => String((i - 4) / 2));
        if (name === 'rpm') this.dialTicks(g, Math.PI * 0.8, Math.PI * 2.2, 10, 103, 13, 2, (i) => String(i * 3));
      }
      g.fillStyle = '#f3ece0'; g.textAlign = 'center';
      g.font = 'bold 15px monospace'; g.fillText(ga.label, 128, 204);
      g.font = 'bold 13px monospace'; g.fillStyle = '#b4c5ce'; g.fillText(ga.unit, 128, 222);
    }
    drawDial(name, text, angle, len, sec) {
      const ga = this.gaugeCanvases[name], g = ga.context;
      g.clearRect(0, 0, 256, 256); g.drawImage(ga.base, 0, 0);
      this.needle(g, angle, len, '#ff7b24', 7);
      if (sec !== undefined) this.needle(g, sec, 46, '#f4efe6', 4);
      g.font = 'bold 25px monospace'; g.fillStyle = '#fff5e4'; g.textAlign = 'center';
      g.fillText(text, 128, 179);
      ga.texture.needsUpdate = true;
    }
    dialTicks(g, start, end, count, r, len, step, fmt) {
      g.save(); g.translate(128, 128);
      for (let i = 0; i <= count; i++) {
        const a = start + (end - start) * i / count, maj = i % step === 0;
        g.strokeStyle = maj ? '#f7f1e3' : '#94a2ab'; g.lineWidth = maj ? 5 : 2.5;
        g.beginPath(); g.moveTo(Math.cos(a) * (r - len), Math.sin(a) * (r - len)); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
        if (maj) {
          g.fillStyle = '#f7f1e3'; g.font = 'bold 15px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(fmt ? fmt(i) : String(i), Math.cos(a) * (r - 24), Math.sin(a) * (r - 24));
        }
      }
      g.restore();
    }
    needle(g, angle, len, color, w) {
      g.save(); g.translate(128, 128); g.rotate(angle + Math.PI / 2);
      g.strokeStyle = color; g.lineCap = 'round';
      g.globalAlpha = 0.28; g.lineWidth = (w || 7) + 8;
      g.beginPath(); g.moveTo(0, 12); g.lineTo(0, -len); g.stroke();
      g.globalAlpha = 1; g.lineWidth = w || 7; g.stroke();
      g.fillStyle = '#f5efe3'; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    updateGauges(s) {
      const spd = s.speed * 1.94384;
      this.drawDial('speed', String(Math.round(spd)).padStart(3, '0'), Math.PI * 0.78 + Math.PI * 1.44 * Math.min(1, spd / 200), 86);
      const ft = Math.max(0, s.altitude * 3.28084);
      this.drawDial('alt', String(Math.round(ft)), Math.PI * 0.75 + Math.PI * 1.5 * ((ft % 1000) / 1000), 74, Math.PI * 0.75 + Math.PI * 1.5 * ((ft % 10000) / 10000));
      this.renderAttitudeIndicator(s.pitch, s.roll);
      const hdg = C.heading(s.heading);
      this.drawDial('hdg', String(Math.round(hdg) % 360).padStart(3, '0'), -Math.PI / 2 + Math.PI * 2 * (hdg / 360), 84);
      const vsi = Math.round(s.verticalSpeed * 196.85 / 50) * 50;
      this.drawDial('vsi', (vsi >= 0 ? '+' : '') + vsi, Math.PI * 0.65 + Math.PI * 1.7 * C.clamp((vsi + 2000) / 4000, 0, 1), 84);
      const rpm = Math.round(s.rpm / 10) * 10;
      this.drawDial('rpm', String(rpm), Math.PI * 0.8 + Math.PI * 1.4 * C.clamp(rpm / 3000, 0, 1), 82);
    }
    update(dt, s, ctrl) {
      if (!this.group.visible) return;
      this.gaugeElapsed += dt;
      if (!this.gaugesReady || this.gaugeElapsed >= 0.05) {
        this.updateGauges(s); this.gaugeElapsed %= 0.05; this.gaugesReady = true;
      }
      this.pitch = C.damp(this.pitch, ctrl.pitch, 8, dt);
      this.roll = C.damp(this.roll, ctrl.roll, 8, dt);
      this.yoke.rotation.x = this.pitch * 0.45; this.yoke.rotation.z = -this.roll * 0.55;
      this.animationTime += dt;
      this.lamp.intensity = 0.65 + Math.sin(this.animationTime * 2) * 0.05;
      this.fuelWarning.material.color.setHex(s.fuel < 25 ? 0xff4d28 : s.fuel < 50 ? 0xffaa2b : 0x493320);
      const tau = Math.PI * 2;
      this.cockpitPropeller.rotation.z = ((this.cockpitPropeller.rotation.z - dt * s.rpm * 0.08) % tau + tau) % tau;
      this.cockpitPropeller.visible = s.rpm > 100;
      this.compassMark.position.x = Math.sin(-s.heading) * 0.025;
    }
    renderAttitudeIndicator(pitch, roll) {
      const ga = this.gaugeCanvases.att, g = ga.context;
      g.clearRect(0, 0, 256, 256);
      g.save();
      g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.clip();
      g.translate(128, 128); g.rotate(-roll);
      const off = C.clamp(pitch * 260, -90, 90);
      const sky = g.createLinearGradient(0, -160 + off, 0, off);
      sky.addColorStop(0, '#164d78'); sky.addColorStop(1, '#2d8ac4');
      g.fillStyle = sky; g.fillRect(-180, -300 + off, 360, 300);
      const gnd = g.createLinearGradient(0, off, 0, 160 + off);
      gnd.addColorStop(0, '#96592d'); gnd.addColorStop(1, '#583116');
      g.fillStyle = gnd; g.fillRect(-180, off, 360, 300);
      g.strokeStyle = '#fff9ee'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(-180, off); g.lineTo(180, off); g.stroke();
      g.strokeStyle = 'rgba(255,248,230,0.88)'; g.lineWidth = 3;
      for (const m of [-44, -22, 22, 44]) {
        const hw = Math.abs(m) === 22 ? 22 : 38;
        g.beginPath(); g.moveTo(-hw, off + m); g.lineTo(hw, off + m); g.stroke();
      }
      g.restore();
      g.drawImage(ga.base, 0, 0);
      g.textAlign = 'center';
      g.fillStyle = '#fff7e8'; g.font = 'bold 21px monospace';
      g.fillText((pitch >= 0 ? '+' : '') + Math.round(C.degrees(pitch)) + '°', 128, 180);
      g.font = 'bold 15px monospace'; g.fillStyle = '#ffd23f';
      g.fillText(Math.round(Math.abs(C.degrees(roll))) + '° ' + (roll >= 0 ? 'R' : 'L'), 128, 222);
      ga.texture.needsUpdate = true;
    }
    setVisible(v) {
      if (v && !this.group.visible) { this.gaugesReady = false; this.gaugeElapsed = 0; }
      this.group.visible = v;
    }
  };
})();
