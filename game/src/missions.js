// Job: Manage shared course rings, sortie progression and session medals.
// Exports: KR.Missions.
(function () {
  'use strict';
  const C = KR.Config;
  const MEDALS = ['COMPLETE', 'BRONZE', 'SILVER', 'GOLD'];
  KR.Missions = class KestrelMissions {
    constructor(scene, world) {
      this.scene = scene;
      this.world = world;
      this.rings = [];
      this.next = 0;
      this.state = 'briefing';
      this.elapsed = 0;
      this.score = 0;
      this.freeFlight = false;
      this.frozen = false;
      this.selectedSortie = 0;
      this.result = null;
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
      const points = [
        [rw.x, 45, rw.z - 430], [120, 95, -580], [40, 120, 600],
        [620, 100, 720], [930, 85, 900], [530, 105, 1340],
        [-30, 145, 1100], [-1000, 100, 50], [-900, 105, -250],
        [rw.x, 48, 700]
      ];
      this.standardPoints = points;
      const torusMaterial = (color, opacity, intensity) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5, transparent: true, opacity, side: THREE.DoubleSide, toneMapped: false });
      const flatMaterial = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
      const active = { torus: torusMaterial(0xff9f1c, 1, 1.4), halo: flatMaterial(0xff9f1c, 0.14), inner: flatMaterial(0xff9f1c, 0.035), brackets: new THREE.MeshBasicMaterial({ color: 0x1b2631, side: THREE.DoubleSide, toneMapped: false }) };
      const idle = { torus: torusMaterial(0x38bdf8, 0.16, 0.75), upcoming: torusMaterial(0x38bdf8, 0.55, 0.75), passed: torusMaterial(0x38bdf8, 0.06, 0.75), halo: flatMaterial(0x38bdf8, 0.025), inner: flatMaterial(0xff9f1c, 0) };
      active.details = [active.inner, active.brackets];
      idle.details = [idle.inner, idle.inner];
      this.ringMaterials = { active, idle };
      const disk = new THREE.CircleGeometry(15, 28).toNonIndexed();
      const detailParts = [disk];
      for (let corner = 0; corner < 4; corner++) {
        for (const side of [-1, 1]) {
          const arm = new THREE.BoxGeometry(1.8, 7.5, 1.5).toNonIndexed();
          arm.rotateZ(side * 0.6); arm.translate(side * 2.2, 20.6, 0); arm.rotateZ(corner * Math.PI / 2);
          detailParts.push(arm);
        }
      }
      const detailVertices = new Float32Array(detailParts.reduce((size, part) => size + part.attributes.position.array.length, 0));
      let offset = 0;
      for (const part of detailParts) {
        detailVertices.set(part.attributes.position.array, offset);
        offset += part.attributes.position.array.length;
      }
      const details = new THREE.BufferGeometry();
      details.setAttribute('position', new THREE.BufferAttribute(detailVertices, 3));
      details.addGroup(0, disk.attributes.position.count, 0);
      details.addGroup(disk.attributes.position.count, detailVertices.length / 3 - disk.attributes.position.count, 1);
      for (const part of detailParts) part.dispose();
      this.ringGeometries = { torus: new THREE.TorusGeometry(16, 2.21, 10, 48), halo: new THREE.TorusGeometry(16, 3.1, 8, 40), details };
      points.forEach((point, index) => {
        const ring = new THREE.Group();
        const torus = new THREE.Mesh(this.ringGeometries.torus, idle.torus);
        const halo = new THREE.Mesh(this.ringGeometries.halo, idle.halo);
        ring.add(torus, halo);
        const inner = new THREE.Mesh(details, idle.details);
        ring.add(inner);
        ring.position.set(point[0], point[1], point[2]);
        const previousPoint = points[(index + points.length - 1) % points.length];
        ring.lookAt(point[0] + point[0] - previousPoint[0], point[1], point[2] + point[2] - previousPoint[2]);
        ring.userData = { torus, halo, inner, baseY: point[1], index };
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
      const order = this.selectedSortie === 2 ? [0, 2, 6, 7, 8, 1, 3, 4, 5, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const points = order.map((pointIndex, courseIndex) => {
        const point = this.standardPoints[pointIndex].slice();
        if (this.selectedSortie === 2 && courseIndex > 0 && courseIndex < 9) point[1] += 65 + courseIndex % 3 * 20;
        return point;
      });
      this.rings.forEach((ring, ringIndex) => {
        const point = points[ringIndex], previous = points[(ringIndex + 9) % 10];
        ring.position.set(...point);
        ring.userData.baseY = point[1];
        ring.lookAt(point[0] * 2 - previous[0], point[1], point[2] * 2 - previous[2]);
      });
      return this.sortie;
    }
    start() {
      this.freeFlight = false;
      this.state = 'flying';
      this.next = 0;
      this.elapsed = 0;
      this.score = 0;
      this.result = null;
      this.setRingVisibility(true);
      this.updateRingMaterials();
    }
    reset() {
      this.state = 'briefing';
      this.next = 0;
      this.result = null;
      this.setRingVisibility(true);
      this.updateRingMaterials();
    }
    setRingVisibility(visible) {
      for (const ring of this.rings) ring.visible = visible;
      this.guide.visible = visible && this.next < this.rings.length - 1;
    }
    toggleFreeFlight() {
      this.freeFlight = !this.freeFlight;
      this.setRingVisibility(!this.freeFlight);
      this.updateRingMaterials();
    }
    updateRingMaterials() {
      const active = this.ringMaterials.active, idle = this.ringMaterials.idle;
      this.rings.forEach((ring, index) => {
        const materials = index === this.next && !this.freeFlight ? active : idle;
        ring.userData.torus.material = materials === active ? active.torus : index < this.next ? idle.passed : index === this.next + 1 ? idle.upcoming : idle.torus;
        ring.userData.halo.material = materials.halo;
        ring.userData.inner.material = materials.details;
        ring.userData.inner.visible = materials === active;
      });
      this.materialNext = this.next;
      this.materialFreeFlight = this.freeFlight;
    }
    update(delta, state, time) {
      if (!this.frozen && this.state === 'flying') this.elapsed += delta;
      if (this.materialNext !== this.next || this.materialFreeFlight !== this.freeFlight) this.updateRingMaterials();
      if (!this.frozen) this.ringMaterials.active.halo.opacity = 0.14 + Math.sin(time * 4) * 0.035;
      for (let index = 0; index < this.rings.length; index++) {
        const ring = this.rings[index];
        const active = index === this.next && !this.freeFlight;
        if (!this.frozen) ring.scale.setScalar(active ? 1 + Math.sin(time * 4) * 0.09 : 1);
        ring.position.y = ring.userData.baseY + (this.frozen ? 0 : Math.sin(time * 1.3 + index) * 1.1);
      }
      this.guide.visible = !this.freeFlight && this.next < this.rings.length - 1 && this.state !== 'landed';
      if (this.guide.visible) {
        const positions = this.guide.geometry.attributes.position;
        const current = this.rings[this.next].position, following = this.rings[this.next + 1].position;
        positions.setXYZ(0, current.x, current.y, current.z);
        positions.setXYZ(1, following.x, following.y, following.z);
        positions.needsUpdate = true;
        const distances = this.guide.geometry.attributes.lineDistance;
        distances.setX(1, current.distanceTo(following));
        distances.needsUpdate = true;
      }
      if (this.frozen || this.state !== 'flying' || this.freeFlight || this.next >= this.rings.length) return;
      const target = this.rings[this.next];
      const distance = state.position.distanceTo(target.position);
      if (distance < 19) {
        this.score += 100;
        this.next++;
        this.updateRingMaterials();
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
      if (state.crashed) return false;
      if (this.next < this.rings.length) return false;
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
