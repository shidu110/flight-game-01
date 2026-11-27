// Job: Sortie manager: 10-ring coastal & high-ridge courses, 3 sortie modes (Island Hopper, 60% Fuel Run, 7 m/s Ridge Crosswind), and par-time/hull medals.
// Exports: KR.Missions
(function () {
  'use strict';
  const C = KR.Config, MEDALS = ['COMPLETE', 'BRONZE', 'SILVER', 'GOLD'];
  KR.Missions = class KestrelMissions {
    constructor(scene, world) {
      this.scene = scene; this.world = world; this.rings = [];
      this.next = this.elapsed = this.score = this.selectedSortie = 0;
      this.state = 'briefing'; this.freeFlight = this.frozen = false; this.result = null;
      this.sorties = [
        { name: '01 · ISLAND HOPPER', fuel: 100, crosswind: 0, parTime: 300, detail: 'FULL TANK · CALM AIR · COASTAL COURSE' },
        { name: '02 · FUEL RUN', fuel: 60, crosswind: 0, parTime: 300, detail: '60% FUEL · SAME COURSE · MAKE IT HOME' },
        { name: '03 · RIDGE CROSSWIND', fuel: 100, crosswind: 7, parTime: 360, detail: '7 M/S WEST WIND · HIGH RIDGE ROUTE' }
      ];
      this.bestMedals = this.sorties.map(() => null);
      this.buildCourse();
    }
    buildCourse() {
      const rw = C.runway;
      const pts = [
        [rw.x, 45, rw.z - 430], [120, 95, -580], [40, 120, 600],
        [620, 100, 720], [930, 85, 900], [530, 105, 1340],
        [-30, 145, 1100], [-1000, 100, 50], [-900, 105, -250], [rw.x, 48, 700]
      ];
      this.standardPoints = pts;
      const tm = (c, o, ei) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: ei, roughness: 0.45, transparent: true, opacity: o, side: THREE.DoubleSide, toneMapped: false });
      const fm = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
      const active = { torus: tm(0xffb42c, 1, 1.55), halo: fm(0xffc95c, 0.2), inner: fm(0xffb42c, 0.03), brackets: new THREE.MeshBasicMaterial({ color: 0x1b2631, side: THREE.DoubleSide, toneMapped: false }) };
      const idle = { torus: tm(0x38bdf8, 0.16, 0.75), upcoming: tm(0x38bdf8, 0.55, 0.75), passed: tm(0x38bdf8, 0.06, 0.75), halo: fm(0x38bdf8, 0.025), inner: fm(0xff9f1c, 0) };
      active.details = [active.inner, active.brackets];
      idle.details = [idle.inner, idle.inner];
      this.ringMaterials = { active, idle };
      const disk = new THREE.CircleGeometry(15.2, 28).toNonIndexed(), parts = [disk];
      for (let c = 0; c < 4; c++) {
        for (const s of [-1, 1]) {
          const arm = new THREE.BoxGeometry(1.5, 6.8, 1.3).toNonIndexed();
          arm.rotateZ(s * 0.6); arm.translate(s * 2.1, 20.4, 0); arm.rotateZ(c * Math.PI / 2);
          parts.push(arm);
        }
      }
      const verts = new Float32Array(parts.reduce((n, p) => n + p.attributes.position.array.length, 0));
      let off = 0;
      for (const p of parts) { verts.set(p.attributes.position.array, off); off += p.attributes.position.array.length; }
      const details = new THREE.BufferGeometry();
      details.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      details.addGroup(0, disk.attributes.position.count, 0);
      details.addGroup(disk.attributes.position.count, verts.length / 3 - disk.attributes.position.count, 1);
      for (const p of parts) p.dispose();
      this.ringGeometries = { torus: new THREE.TorusGeometry(16, 1.65, 10, 48), halo: new THREE.TorusGeometry(16, 2.55, 8, 40), details };
      pts.forEach((p, i) => {
        const ring = new THREE.Group();
        const torus = new THREE.Mesh(this.ringGeometries.torus, idle.torus);
        const halo = new THREE.Mesh(this.ringGeometries.halo, idle.halo);
        const inner = new THREE.Mesh(details, idle.details);
        ring.add(torus, halo, inner);
        ring.position.set(p[0], p[1], p[2]);
        const prev = pts[(i + pts.length - 1) % pts.length];
        ring.lookAt(p[0] * 2 - prev[0], p[1], p[2] * 2 - prev[2]);
        ring.userData = { torus, halo, inner, baseY: p[1], index: i };
        this.scene.add(ring);
        this.rings.push(ring);
      });
      this.guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0xffd69a, transparent: true, opacity: 0.22, dashSize: 6, gapSize: 10, depthWrite: false }));
      this.guide.geometry.setAttribute('lineDistance', new THREE.Float32BufferAttribute([0, 1], 1));
      this.guide.frustumCulled = false;
      this.scene.add(this.guide);
      this.selectSortie(0);
      this.updateRingMaterials();
    }
    get sortie() { return this.sorties[this.selectedSortie]; }
    selectSortie(index) {
      this.selectedSortie = (index + this.sorties.length) % this.sorties.length;
      const ord = this.selectedSortie === 2 ? [0, 2, 6, 7, 8, 1, 3, 4, 5, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const pts = ord.map((pi, ci) => {
        const p = this.standardPoints[pi].slice();
        if (this.selectedSortie === 2 && ci > 0 && ci < 9) p[1] += 65 + ci % 3 * 20;
        return p;
      });
      this.rings.forEach((ring, i) => {
        const p = pts[i], prev = pts[(i + 9) % 10];
        ring.position.set(...p);
        ring.userData.baseY = p[1];
        ring.lookAt(p[0] * 2 - prev[0], p[1], p[2] * 2 - prev[2]);
      });
      return this.sortie;
    }
    start() {
      this.freeFlight = false; this.state = 'flying'; this.next = this.elapsed = this.score = 0; this.result = null;
      this.setRingVisibility(true); this.updateRingMaterials();
    }
    reset() {
      this.state = 'briefing'; this.next = 0; this.result = null;
      this.setRingVisibility(true); this.updateRingMaterials();
    }
    setRingVisibility(v) {
      for (const r of this.rings) r.visible = v;
      this.guide.visible = v && this.next < this.rings.length - 1;
    }
    toggleFreeFlight() { this.freeFlight = !this.freeFlight; this.setRingVisibility(!this.freeFlight); this.updateRingMaterials(); }
    updateRingMaterials() {
      const a = this.ringMaterials.active, id = this.ringMaterials.idle;
      this.rings.forEach((r, i) => {
        const act = i === this.next && !this.freeFlight, m = act ? a : id;
        r.userData.torus.material = act ? a.torus : i < this.next ? id.passed : i === this.next + 1 ? id.upcoming : id.torus;
        r.userData.halo.material = m.halo;
        r.userData.inner.material = m.details;
        r.userData.inner.visible = act;
      });
      this.materialNext = this.next; this.materialFreeFlight = this.freeFlight;
    }
    update(dt, state, time) {
      if (!this.frozen && this.state === 'flying') this.elapsed += dt;
      if (this.materialNext !== this.next || this.materialFreeFlight !== this.freeFlight) this.updateRingMaterials();
      if (!this.frozen) this.ringMaterials.active.halo.opacity = 0.2 + Math.sin(time * 4) * 0.04;
      for (let i = 0; i < this.rings.length; i++) {
        const r = this.rings[i], act = i === this.next && !this.freeFlight;
        if (!this.frozen) r.scale.setScalar(act ? 1 + Math.sin(time * 4) * 0.09 : 1);
        r.position.y = r.userData.baseY + (this.frozen ? 0 : Math.sin(time * 1.3 + i) * 1.1);
      }
      this.guide.visible = !this.freeFlight && this.next < this.rings.length - 1 && this.state !== 'landed';
      if (this.guide.visible) {
        const pos = this.guide.geometry.attributes.position, cur = this.rings[this.next].position, nxt = this.rings[this.next + 1].position;
        pos.setXYZ(0, cur.x, cur.y, cur.z); pos.setXYZ(1, nxt.x, nxt.y, nxt.z); pos.needsUpdate = true;
        const d = this.guide.geometry.attributes.lineDistance; d.setX(1, cur.distanceTo(nxt)); d.needsUpdate = true;
      }
      if (this.frozen || this.state !== 'flying' || this.freeFlight || this.next >= this.rings.length) return;
      if (state.position.distanceTo(this.rings[this.next].position) < 19) {
        this.score += 100; this.next++; this.updateRingMaterials();
        if (this.onRing) this.onRing(this.next);
      }
    }
    grade(hull) {
      if (this.next < this.rings.length) return 'COMPLETE';
      if (hull >= 90 && this.elapsed <= this.sortie.parTime) return 'GOLD';
      if (hull >= 75 && this.elapsed <= this.sortie.parTime * 1.25) return 'SILVER';
      if (hull >= 50 && this.elapsed <= this.sortie.parTime * 1.5) return 'BRONZE';
      return 'COMPLETE';
    }
    complete(state) {
      if (state.crashed || this.next < this.rings.length) return false;
      if (this.state === 'landed') return true;
      if (this.state !== 'flying' || this.freeFlight || this.frozen) return false;
      if (state.onGround && state.speed < 20 && this.world.isRunway(state.position.x, state.position.z)) {
        const medal = this.grade(state.hull);
        this.result = { medal, rings: this.next, elapsed: this.elapsed, hull: state.hull, parTime: this.sortie.parTime };
        if (MEDALS.indexOf(medal) > MEDALS.indexOf(this.bestMedals[this.selectedSortie])) this.bestMedals[this.selectedSortie] = medal;
        this.state = 'landed';
        this.score += Math.max(0, 400 - Math.floor(this.elapsed) * 2);
        return true;
      }
      return false;
    }
  };
})();
