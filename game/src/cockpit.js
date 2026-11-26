// Job: Build the cockpit and refresh cached instruments only while visible.
// Exports: KR.Cockpit.
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
      this.pitch = 0;
      this.roll = 0;
      this.gaugeElapsed = 0;
      this.gaugesReady = false;
      this.animationTime = 0;
    }
    box(width, height, depth, color, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color, roughness: 0.84, flatShading: true }));
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      return mesh;
    }
    buildShell() {
      const frame = 0x1a2026, liner = 0x222b32;
      this.box(2.5, 0.12, 0.16, frame, 0, 0.74, -1.04);
      const left = this.box(0.0455, 1.5, 0.06, frame, -1.01, 0.25, -1.04);
      const right = this.box(0.0455, 1.5, 0.06, frame, 1.01, 0.25, -1.04);
      left.rotation.z = -0.16; right.rotation.z = 0.16;
      const shade = this.box(1.56, 0.065, 0.33, frame, 0, -0.30, -1.40);
      shade.rotation.x = -0.24;
      this.box(0.26, 0.7, 0.4, liner, -1.02, -0.63, -0.9);
      this.box(0.26, 0.7, 0.4, liner, 1.02, -0.63, -0.9);
      this.box(1.53, 0.61, 0.09, 0x2b353e, 0, -0.56, -1.26);
      const glare = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.008, 0.045), new THREE.MeshBasicMaterial({ color: 0x53606a }));
      glare.position.set(0, -0.265, -1.21);
      this.group.add(glare);
      for (const side of [-1, 1]) {
        const start = new THREE.Vector3(side * 1.22, -0.39, -1.58);
        const end = new THREE.Vector3(side * 2.48, 0.86, -2.1);
        const direction = end.clone().sub(start);
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.033, direction.length(), 5), new THREE.MeshBasicMaterial({ color: 0x19262c }));
        strut.position.copy(start).add(end).multiplyScalar(0.5);
        strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        this.group.add(strut);
      }
      this.lamp = new THREE.PointLight(0xffba78, 0.65, 3);
      this.lamp.position.set(0, 0.22, -0.5);
      this.group.add(this.lamp);
    }
    buildCowlAndPropeller() {
      const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.67, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), new THREE.MeshStandardMaterial({ color: 0xeae2d3, roughness: 0.58, flatShading: true }));
      cowl.position.set(0, -0.39, -2.45); cowl.scale.set(0.94, 0.31, 1.64);
      this.group.add(cowl);
      const seam = this.box(0.028, 0.008, 1.15, 0x1e3a4c, 0, -0.181, -2.43);
      seam.rotation.x = -0.045;
      this.cockpitPropeller = new THREE.Mesh(new THREE.CircleGeometry(0.72, 48), new THREE.MeshBasicMaterial({ map: KR.createPropellerTexture(), transparent: true, opacity: 0.76, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      this.cockpitPropeller.position.set(0, -0.3, -3.54);
      this.cockpitPropeller.castShadow = false;
      this.group.add(this.cockpitPropeller);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 8), new THREE.MeshStandardMaterial({ color: 0x1e3a4c, metalness: 0.35, roughness: 0.35 }));
      hub.position.set(0, -0.3, -3.5);
      this.group.add(hub);
      this.compass = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), new THREE.MeshBasicMaterial({ color: 0x12181e }));
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.008, 6, 20), new THREE.MeshStandardMaterial({ color: 0x53606a, metalness: 0.5, roughness: 0.4 }));
      this.compass.add(ball, bezel);
      this.compass.position.set(0, -0.145, -1.5);
      this.box(0.024, 0.065, 0.025, 0x1a2026, 0, -0.205, -1.5);
      this.group.add(this.compass);
      this.compassMark = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.025, 0.008), new THREE.MeshBasicMaterial({ color: 0xeae4d7 }));
      this.compassMark.position.set(0, 0.012, 0.053);
      this.compass.add(this.compassMark);
    }
    buildPanel() {
      const placard = document.createElement('canvas');
      placard.width = 512; placard.height = 64;
      const g = placard.getContext('2d');
      g.fillStyle = '#eae4d7'; g.font = 'bold 29px monospace'; g.textAlign = 'center';
      g.fillText('KESTREL K-1   ·   G-AWK', 256, 42);
      const labelTexture = new THREE.CanvasTexture(placard);
      labelTexture.encoding = THREE.sRGBEncoding;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.078), new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, toneMapped: false }));
      label.position.set(0, -0.77, -1.2);
      this.group.add(label);
      for (let index = 0; index < 4; index++) {
        const base = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 5, 12), new THREE.MeshStandardMaterial({ color: 0x818b91, metalness: 0.7, roughness: 0.4 }));
        base.position.set(0.59, -0.42 - index * 0.068, -1.19);
        const toggle = this.box(0.012, 0.038, 0.014, 0xd6d4c8, 0.59, -0.411 - index * 0.068, -1.172);
        toggle.rotation.x = index % 2 ? -0.45 : 0.45;
        this.group.add(base);
      }
      this.fuelWarning = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), new THREE.MeshBasicMaterial({ color: 0x493320, toneMapped: false }));
      this.fuelWarning.position.set(0.59, -0.31, -1.19);
      this.group.add(this.fuelWarning);
      const warningLabel = document.createElement('canvas'); warningLabel.width = 128; warningLabel.height = 32;
      const warningContext = warningLabel.getContext('2d'); warningContext.fillStyle = '#eae4d7'; warningContext.font = 'bold 22px monospace'; warningContext.textAlign = 'center'; warningContext.fillText('FUEL', 64, 24);
      const warningTexture = new THREE.CanvasTexture(warningLabel); warningTexture.encoding = THREE.sRGBEncoding;
      const warningText = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.029), new THREE.MeshBasicMaterial({ map: warningTexture, transparent: true, toneMapped: false }));
      warningText.position.set(0.59, -0.36, -1.188); this.group.add(warningText);
    }
    buildYoke() {
      const yoke = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: 0x1c2929, roughness: 0.8, flatShading: true });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.24, 6), material);
      shaft.rotation.x = 0.3; shaft.position.set(0, -0.12, 0.12);
      yoke.add(shaft);
      const hub = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.08), material);
      hub.position.set(0, -0.02, 0.02);
      yoke.add(hub);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.023, 5, 16, Math.PI), material);
      rim.position.set(0, 0.03, 0.02);
      rim.rotation.z = Math.PI;
      yoke.add(rim);
      for (const side of [-1, 1]) {
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.034, 0.2, 6), material);
        grip.position.set(side * 0.19, 0.03, 0.02);
        yoke.add(grip);
      }
      yoke.scale.setScalar(0.6);
      yoke.position.set(-0.60, -0.49, -1.24);
      this.yoke = yoke;
      this.group.add(yoke);
    }
    buildGauges() {
      const specs = [
        ['speed', 'AIRSPEED', 'KNOTS'], ['alt', 'ALTITUDE', 'FEET MSL'], ['att', 'ATTITUDE', ''],
        ['hdg', 'HEADING', 'DEGREES'], ['vsi', 'VERT SPEED', 'FT / MIN'], ['rpm', 'TACHOMETER', 'RPM']
      ];
      specs.forEach((spec, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.encoding = THREE.sRGBEncoding;
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.103, 40), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
        const column = index % 3, row = Math.floor(index / 3);
        face.position.set((column - 1) * 0.31 - 0.035, -0.35 - row * 0.224, -1.19);
        this.group.add(face);
        const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.106, 0.008, 6, 32), new THREE.MeshStandardMaterial({ color: 0x58636d, metalness: 0.65, roughness: 0.36 }));
        bezel.position.copy(face.position);
        bezel.position.z -= 0.004;
        this.group.add(bezel);
        const base = document.createElement('canvas');
        base.width = base.height = 256;
        this.gaugeCanvases[spec[0]] = { canvas, base, context: canvas.getContext('2d'), texture, label: spec[1], unit: spec[2] };
        this.buildGaugeBase(spec[0]);
      });
    }
    buildGaugeBase(name) {
      const gauge = this.gaugeCanvases[name];
      const context = gauge.base.getContext('2d');
      if (name === 'att') {
        context.strokeStyle = '#ff8c38'; context.lineWidth = 5; context.lineCap = 'round';
        context.beginPath(); context.moveTo(82, 126); context.lineTo(112, 126); context.lineTo(120, 135); context.lineTo(128, 126); context.lineTo(136, 135); context.lineTo(144, 126); context.lineTo(174, 126); context.stroke();
        context.strokeStyle = '#eae4d7'; context.lineWidth = 3;
        context.beginPath(); context.arc(128, 128, 108, 0, Math.PI * 2); context.stroke();
      } else {
        const gradient = context.createRadialGradient(128, 120, 16, 128, 128, 122);
        gradient.addColorStop(0, '#1c2630'); gradient.addColorStop(0.72, '#12181e'); gradient.addColorStop(1, '#090e13');
        context.fillStyle = gradient; context.beginPath(); context.arc(128, 128, 122, 0, Math.PI * 2); context.fill();
        context.strokeStyle = '#63717b'; context.lineWidth = 4; context.stroke();
        context.strokeStyle = 'rgba(234,228,215,0.2)'; context.lineWidth = 2;
        context.beginPath(); context.arc(128, 128, 102, 0, Math.PI * 2); context.stroke();
        if (name === 'speed') this.dialTicks(context, Math.PI * 0.78, Math.PI * 2.22, 10, 102, 11, 2, (index) => String(index * 20));
        if (name === 'alt') this.dialTicks(context, Math.PI * 0.75, Math.PI * 2.25, 10, 102, 11, 1, (index) => String(index));
        if (name === 'hdg') this.dialTicks(context, -Math.PI / 2, Math.PI * 1.5, 12, 102, 11, 1, (index) => ['N', '3', '6', '9', '12', '15', '18', '21', '24', '27', '30', '33', 'N'][index]);
        if (name === 'vsi') this.dialTicks(context, Math.PI * 0.65, Math.PI * 2.35, 8, 102, 11, 2, (index) => String((index - 4) / 2));
        if (name === 'rpm') this.dialTicks(context, Math.PI * 0.8, Math.PI * 2.2, 10, 102, 11, 2, (index) => String(index * 3));
      }
      context.fillStyle = '#eae4d7'; context.textAlign = 'center';
      context.font = 'bold 14px monospace'; context.fillText(gauge.label, 128, 201);
      context.font = '12px monospace'; context.fillStyle = '#95a7b2'; context.fillText(gauge.unit, 128, 220);
    }
    drawDial(name, text, angle, length, secondaryAngle) {
      const gauge = this.gaugeCanvases[name];
      const context = gauge.context;
      context.clearRect(0, 0, 256, 256);
      context.drawImage(gauge.base, 0, 0);
      this.needle(context, angle, length, '#ff8c38', 5);
      if (secondaryAngle !== undefined) this.needle(context, secondaryAngle, 42, '#eae4d7', 3);
      context.font = 'bold 22px monospace'; context.fillStyle = '#eae4d7'; context.textAlign = 'center';
      context.fillText(text, 128, 177);
      gauge.texture.needsUpdate = true;
    }
    dialTicks(g, start, end, count, radius, length, labelStep, format) {
      g.save(); g.translate(128, 128);
      for (let index = 0; index <= count; index++) {
        const angle = start + (end - start) * index / count;
        const major = index % labelStep === 0;
        g.strokeStyle = major ? '#eae4d7' : '#89949b';
        g.lineWidth = major ? 4 : 2;
        g.beginPath();
        g.moveTo(Math.cos(angle) * (radius - length), Math.sin(angle) * (radius - length));
        g.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        g.stroke();
        if (major) {
          g.fillStyle = '#eae4d7'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(format ? format(index) : String(index), Math.cos(angle) * (radius - 21), Math.sin(angle) * (radius - 21));
        }
      }
      g.restore();
    }
    needle(g, angle, length, color, width) {
      g.save(); g.translate(128, 128); g.rotate(angle + Math.PI / 2);
      g.strokeStyle = color; g.lineCap = 'round';
      g.globalAlpha = 0.22; g.lineWidth = (width || 5) + 7;
      g.beginPath(); g.moveTo(0, 10); g.lineTo(0, -length); g.stroke();
      g.globalAlpha = 1; g.lineWidth = width || 5; g.stroke();
      g.fillStyle = '#eae4d7'; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    updateGauges(state) {
      const speed = state.speed * 1.94384;
      this.drawDial('speed', String(Math.round(speed)).padStart(3, '0'), Math.PI * 0.78 + Math.PI * 1.44 * Math.min(1, speed / 200), 84);
      const feet = Math.max(0, state.altitude * 3.28084);
      this.drawDial('alt', String(Math.round(feet)), Math.PI * 0.75 + Math.PI * 1.5 * ((feet % 1000) / 1000), 72, Math.PI * 0.75 + Math.PI * 1.5 * ((feet % 10000) / 10000));
      this.renderAttitudeIndicator(state.pitch, state.roll);
      const heading = C.heading(state.heading);
      this.drawDial('hdg', String(Math.round(heading) % 360).padStart(3, '0'), -Math.PI / 2 + Math.PI * 2 * (heading / 360), 82);
      const vsi = Math.round(state.verticalSpeed * 196.85 / 50) * 50;
      this.drawDial('vsi', (vsi >= 0 ? '+' : '') + vsi, Math.PI * 0.65 + Math.PI * 1.7 * C.clamp((vsi + 2000) / 4000, 0, 1), 82);
      const rpm = Math.round(state.rpm / 10) * 10;
      this.drawDial('rpm', String(rpm), Math.PI * 0.8 + Math.PI * 1.4 * C.clamp(rpm / 3000, 0, 1), 80);
    }
    update(delta, state, controls) {
      if (!this.group.visible) return;
      this.gaugeElapsed += delta;
      if (!this.gaugesReady || this.gaugeElapsed >= 0.05) {
        this.updateGauges(state);
        this.gaugeElapsed %= 0.05;
        this.gaugesReady = true;
      }
      this.pitch = C.damp(this.pitch, controls.pitch, 8, delta);
      this.roll = C.damp(this.roll, controls.roll, 8, delta);
      this.yoke.rotation.x = this.pitch * 0.45;
      this.yoke.rotation.z = -this.roll * 0.55;
      this.animationTime += delta;
      this.lamp.intensity = 0.55 + Math.sin(this.animationTime * 2) * 0.05;
      this.fuelWarning.material.color.setHex(state.fuel < 25 ? 0xffac37 : 0x493320);
      const tau = Math.PI * 2;
      this.cockpitPropeller.rotation.z = ((this.cockpitPropeller.rotation.z - delta * state.rpm * 0.08) % tau + tau) % tau;
      this.cockpitPropeller.visible = state.rpm > 100;
      this.compassMark.position.x = Math.sin(-state.heading) * 0.033;
    }
    renderAttitudeIndicator(pitch, roll) {
      const gauge = this.gaugeCanvases.att;
      const g = gauge.context;
      g.clearRect(0, 0, 256, 256);
      g.save();
      g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.clip();
      g.translate(128, 128); g.rotate(-roll);
      const offset = C.clamp(pitch * 260, -90, 90);
      g.fillStyle = '#244b61'; g.fillRect(-170, -300 + offset, 340, 300);
      g.fillStyle = '#654631'; g.fillRect(-170, offset, 340, 300);
      g.strokeStyle = '#eae4d7'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-170, offset); g.lineTo(170, offset); g.stroke();
      g.strokeStyle = 'rgba(250,240,207,0.8)'; g.lineWidth = 2;
      for (const mark of [-40, -20, 20, 40]) {
        g.beginPath(); g.moveTo(-28, offset + mark); g.lineTo(28, offset + mark); g.stroke();
      }
      g.restore();
      g.drawImage(gauge.base, 0, 0);
      g.textAlign = 'center';
      g.fillStyle = '#eae4d7'; g.font = 'bold 20px monospace';
      g.fillText((pitch >= 0 ? '+' : '') + Math.round(C.degrees(pitch)) + '°', 128, 178);
      g.font = 'bold 13px monospace'; g.fillStyle = '#ff8c38';
      g.fillText(Math.round(Math.abs(C.degrees(roll))) + '° ' + (roll >= 0 ? 'R' : 'L'), 128, 222);
      gauge.texture.needsUpdate = true;
    }
    setVisible(visible) {
      if (visible && !this.group.visible) {
        this.gaugesReady = false;
        this.gaugeElapsed = 0;
      }
      this.group.visible = visible;
    }
  };
})();
