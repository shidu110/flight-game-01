(function () {
  'use strict';
  const C = KR.Config;
  KR.Cockpit = class KestrelCockpit {
    constructor(camera) {
      this.camera = camera;
      this.group = new THREE.Group();
      this.group.position.set(0, -0.02, 0);
      camera.add(this.group);
      this.buildShell();
      this.buildPanel();
      this.buildYoke();
      this.gaugeCanvases = {};
      this.buildGauges();
      this.pitch = 0;
      this.roll = 0;
    }
    box(width, height, depth, color, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color, roughness: 0.84, flatShading: true }));
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      return mesh;
    }
    buildShell() {
      const frame = 0x243b3c, liner = 0x455d57;
      this.box(2.5, 0.12, 0.16, frame, 0, 0.74, -1.04);
      const left = this.box(0.065, 1.5, 0.07, frame, -1.01, 0.25, -1.04);
      const right = this.box(0.065, 1.5, 0.07, frame, 1.01, 0.25, -1.04);
      left.rotation.z = -0.16; right.rotation.z = 0.16;
      const shade = this.box(1.48, 0.07, 0.27, 0x1d3031, 0, -0.16, -1.14);
      shade.rotation.x = -0.1;
      this.box(0.26, 0.7, 0.4, liner, -1.02, -0.63, -0.9);
      this.box(0.26, 0.7, 0.4, liner, 1.02, -0.63, -0.9);
      const panel = this.box(1.45, 0.66, 0.09, 0x17292b, 0, -0.53, -1.14);
      this.panel = panel;
      const glare = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0xd9b875 }));
      glare.position.set(0, -0.175, -1.08);
      this.group.add(glare);
      this.lamp = new THREE.PointLight(0xffb763, 0.7, 3);
      this.lamp.position.set(0, 0.22, -0.5);
      this.group.add(this.lamp);
    }
    buildPanel() {
      const placard = document.createElement('canvas');
      placard.width = 512; placard.height = 64;
      const g = placard.getContext('2d');
      g.fillStyle = '#d9c99f'; g.font = 'bold 29px monospace'; g.textAlign = 'center';
      g.fillText('KESTREL K-1   ·   G-AWK', 256, 42);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.095), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(placard) }));
      label.position.set(0, -0.79, -1.085);
      this.group.add(label);
    }
    buildYoke() {
      const yoke = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: 0x1c2929, roughness: 0.8, flatShading: true });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 6), material);
      shaft.rotation.x = 0.3; shaft.position.set(0, -0.23, 0.18);
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
      yoke.position.set(-0.62, -0.43, -1.0);
      this.yoke = yoke;
      this.group.add(yoke);
    }
    buildGauges() {
      const specs = [
        ['speed', 'AIRSPEED', 'knots'], ['alt', 'ALTITUDE', 'feet'], ['att', 'ATTITUDE', ''],
        ['hdg', 'HEADING', 'degrees'], ['vsi', 'VERT SPEED', 'ft/min'], ['rpm', 'TACHOMETER', 'rpm']
      ];
      this.gaugeMeshes = {};
      specs.forEach((spec, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.116, 32), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
        const column = index % 3, row = Math.floor(index / 3);
        face.position.set((column - 1) * 0.34, -0.32 - row * 0.245, -1.075);
        this.group.add(face);
        const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.119, 0.012, 5, 28), new THREE.MeshStandardMaterial({ color: 0x9b9b83, metalness: 0.55, roughness: 0.42 }));
        bezel.position.copy(face.position);
        bezel.position.z -= 0.004;
        this.group.add(bezel);
        this.gaugeCanvases[spec[0]] = { canvas, context: canvas.getContext('2d'), texture, label: spec[1], unit: spec[2] };
        this.gaugeMeshes[spec[0]] = face;
      });
    }
    drawDial(name, value, text, subtext, drawExtra) {
      const gauge = this.gaugeCanvases[name];
      const g = gauge.context;
      g.clearRect(0, 0, 256, 256);
      const gradient = g.createRadialGradient(128, 120, 16, 128, 128, 122);
      gradient.addColorStop(0, '#fff4ca'); gradient.addColorStop(0.72, '#dccfa5'); gradient.addColorStop(1, '#655d45');
      g.fillStyle = gradient; g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2c2b22'; g.lineWidth = 7; g.stroke();
      g.strokeStyle = 'rgba(53,45,29,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.arc(128, 128, 102, 0, Math.PI * 2); g.stroke();
      if (drawExtra) drawExtra(g);
      g.fillStyle = '#413b2b'; g.textAlign = 'center';
      g.font = 'bold 14px monospace'; g.fillText(gauge.label, 128, 201);
      g.font = 'bold 22px monospace'; g.fillStyle = '#1f2b2b'; g.fillText(text, 128, 177);
      g.font = '12px monospace'; g.fillStyle = '#4d4b38'; g.fillText(subtext || gauge.unit, 128, 220);
      gauge.texture.needsUpdate = true;
    }
    dialTicks(g, start, end, count, radius, length, labelStep, format) {
      g.save(); g.translate(128, 128);
      for (let index = 0; index <= count; index++) {
        const angle = start + (end - start) * index / count;
        const major = index % labelStep === 0;
        g.strokeStyle = major ? '#26251e' : '#6d6751';
        g.lineWidth = major ? 4 : 2;
        g.beginPath();
        g.moveTo(Math.cos(angle) * (radius - length), Math.sin(angle) * (radius - length));
        g.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        g.stroke();
        if (major) {
          g.fillStyle = '#312d21'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(format ? format(index) : String(index), Math.cos(angle) * (radius - 21), Math.sin(angle) * (radius - 21));
        }
      }
      g.restore();
    }
    needle(g, angle, length, color, width) {
      g.save(); g.translate(128, 128); g.rotate(angle + Math.PI / 2);
      g.shadowColor = color; g.shadowBlur = 12;
      g.strokeStyle = color; g.lineWidth = width || 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 10); g.lineTo(0, -length); g.stroke();
      g.shadowBlur = 0; g.fillStyle = '#2b2920'; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    update(state, controls) {
      const speed = state.speed * 1.94384;
      this.drawDial('speed', speed, String(Math.round(speed)).padStart(3, '0'), 'KNOTS', (g) => {
        this.dialTicks(g, Math.PI * 0.78, Math.PI * 2.22, 10, 102, 11, 2, (i) => String(i * 20));
        this.needle(g, Math.PI * 0.78 + (Math.PI * 1.44) * Math.min(1, speed / 200), 84, '#e3532f', 5);
      });
      const feet = Math.max(0, state.altitude * 3.28084);
      this.drawDial('alt', feet, String(Math.round(feet)), 'FEET MSL', (g) => {
        this.dialTicks(g, Math.PI * 0.75, Math.PI * 2.25, 10, 102, 11, 1, (i) => String(i));
        this.needle(g, Math.PI * 0.75 + Math.PI * 1.5 * ((feet % 1000) / 1000), 72, '#e3532f', 5);
        this.needle(g, Math.PI * 0.75 + Math.PI * 1.5 * ((feet % 10000) / 10000), 42, '#4a4632', 3);
      });
      this.drawAttitude(state.pitch, state.roll);
      const heading = C.heading(state.heading);
      this.drawDial('hdg', heading, String(Math.round(heading) % 360).padStart(3, '0'), 'DEGREES', (g) => {
        this.dialTicks(g, -Math.PI / 2, Math.PI * 1.5, 12, 102, 11, 1, (i) => ['N', '3', '6', '9', '12', '15', '18', '21', '24', '27', '30', '33', 'N'][i]);
        this.needle(g, -Math.PI / 2 + Math.PI * 2 * (heading / 360), 82, '#d84e31', 5);
      });
      const vsi = Math.round(state.verticalSpeed * 196.85 / 50) * 50;
      this.drawDial('vsi', vsi, (vsi >= 0 ? '+' : '') + vsi, 'FT / MIN', (g) => {
        this.dialTicks(g, Math.PI * 0.65, Math.PI * 2.35, 8, 102, 11, 2, (i) => String((i - 4) / 2));
        this.needle(g, Math.PI * 0.65 + Math.PI * 1.7 * C.clamp((vsi + 2000) / 4000, 0, 1), 82, '#2e7d67', 5);
      });
      const rpm = Math.round(state.rpm / 10) * 10;
      this.drawDial('rpm', rpm, String(rpm), 'RPM', (g) => {
        this.dialTicks(g, Math.PI * 0.8, Math.PI * 2.2, 10, 102, 11, 2, (i) => String(i * 3));
        this.needle(g, Math.PI * 0.8 + Math.PI * 1.4 * C.clamp(rpm / 3200, 0, 1), 80, '#dd7a32', 5);
      });
      this.pitch = C.damp(this.pitch, controls.pitch, 8, 1 / 60);
      this.roll = C.damp(this.roll, controls.roll, 8, 1 / 60);
      this.yoke.rotation.x = this.pitch * 0.45;
      this.yoke.rotation.z = -this.roll * 0.55;
      this.lamp.intensity = 0.55 + Math.sin(performance.now() * 0.002) * 0.05;
    }
    drawAttitude(pitch, roll) {
      const gauge = this.gaugeCanvases.att;
      const g = gauge.context;
      g.clearRect(0, 0, 256, 256);
      g.save();
      g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.clip();
      g.translate(128, 128); g.rotate(-roll);
      const offset = C.clamp(pitch * 260, -90, 90);
      g.fillStyle = '#2f7891'; g.fillRect(-170, -300 + offset, 340, 300);
      g.fillStyle = '#9e7041'; g.fillRect(-170, offset, 340, 300);
      g.strokeStyle = '#f6edcd'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-170, offset); g.lineTo(170, offset); g.stroke();
      g.strokeStyle = 'rgba(250,240,207,0.8)'; g.lineWidth = 2;
      for (const mark of [-40, -20, 20, 40]) {
        g.beginPath(); g.moveTo(-28, offset + mark); g.lineTo(28, offset + mark); g.stroke();
      }
      g.restore();
      g.strokeStyle = '#f7b34a'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(82, 126); g.lineTo(112, 126); g.lineTo(120, 135); g.lineTo(128, 126); g.lineTo(136, 135); g.lineTo(144, 126); g.lineTo(174, 126); g.stroke();
      g.strokeStyle = '#fff0be'; g.lineWidth = 4;
      g.beginPath(); g.arc(128, 128, 108, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fff3c6'; g.font = 'bold 14px monospace'; g.textAlign = 'center';
      g.fillText('ATTITUDE', 128, 201);
      g.fillStyle = '#2a2418'; g.font = 'bold 20px monospace';
      g.fillText((pitch >= 0 ? '+' : '') + Math.round(C.degrees(pitch)) + '°', 128, 178);
      gauge.texture.needsUpdate = true;
    }
    setVisible(visible) {
      this.group.visible = visible;
      this.camera.visible = true;
    }
  };
})();
