(function () {
  'use strict';
  const C = KR.Config;
  KR.Missions = class KestrelMissions {
    constructor(scene) {
      this.scene = scene;
      this.rings = [];
      this.next = 0;
      this.state = 'briefing';
      this.startedAt = 0;
      this.elapsed = 0;
      this.score = 0;
      this.banner = '';
      this.bannerTime = 0;
      this.freeFlight = false;
      this.frozen = false;
      this.buildCourse();
    }
    buildCourse() {
      const rw = C.runway;
      const points = [
        [rw.x, 45, rw.z - 430], [120, 95, -580], [40, 120, 600],
        [620, 100, 720], [930, 85, 900], [530, 105, 1340],
        [-30, 145, 1100], [-850, 150, 700], [-900, 105, 50],
        [rw.x, 48, 700]
      ];
      const material = new THREE.MeshBasicMaterial({ color: 0xffcf7a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false });
      const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xffd88e, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
      points.forEach((point, index) => {
        const ring = new THREE.Group();
        const torus = new THREE.Mesh(new THREE.TorusGeometry(16, 1.3, 8, 36), material.clone());
        const halo = new THREE.Mesh(new THREE.TorusGeometry(16, 3.2, 8, 36), glowMaterial.clone());
        ring.add(torus, halo);
        const inner = new THREE.Mesh(new THREE.CircleGeometry(15, 28), new THREE.MeshBasicMaterial({ color: 0xffe0a2, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
        ring.add(inner);
        ring.position.set(point[0], point[1], point[2]);
        const previousPoint = points[(index + points.length - 1) % points.length];
        ring.lookAt(point[0] + point[0] - previousPoint[0], point[1], point[2] + point[2] - previousPoint[2]);
        ring.userData = { torus, halo, inner, baseY: point[1], index };
        this.scene.add(ring);
        this.rings.push(ring);
      });
      this.ringMaterial = material;
      this.glowMaterial = glowMaterial;
    }
    start() {
      this.freeFlight = false;
      this.state = 'flying';
      this.next = 0;
      this.startedAt = performance.now();
      this.elapsed = 0;
      this.score = 0;
      this.banner = 'SORTIE 01 · ISLAND HOPPER';
      this.bannerTime = 3.5;
      this.setRingVisibility(true);
    }
    reset() {
      this.state = 'briefing';
      this.next = 0;
      this.banner = '';
      this.setRingVisibility(true);
    }
    setRingVisibility(visible) {
      for (const ring of this.rings) ring.visible = visible;
    }
    toggleFreeFlight() {
      this.freeFlight = !this.freeFlight;
      this.banner = this.freeFlight ? 'FREE FLIGHT · COURSE HIDDEN' : 'COURSE RESTORED';
      this.bannerTime = 2.2;
      this.setRingVisibility(!this.freeFlight);
    }
    update(delta, state, time) {
      if (!this.frozen && this.state === 'flying') this.elapsed += delta;
      for (let index = 0; index < this.rings.length; index++) {
        const ring = this.rings[index];
        const active = index === this.next && !this.freeFlight;
        const pulse = active ? 1 + Math.sin(time * 4) * 0.09 : 1;
        ring.scale.setScalar(pulse);
        ring.position.y = ring.userData.baseY + Math.sin(time * 1.3 + index) * 1.6;
        ring.userData.torus.material.opacity = active ? 0.98 : 0.34;
        ring.userData.halo.material.opacity = active ? 0.32 + Math.sin(time * 4) * 0.1 : 0.08;
        ring.userData.inner.material.opacity = active ? 0.12 : 0.025;
      }
      if (this.bannerTime > 0 && !this.frozen) this.bannerTime -= delta;
      if (this.frozen || this.state !== 'flying' || this.freeFlight || this.next >= this.rings.length) return;
      const target = this.rings[this.next];
      const distance = state.position.distanceTo(target.position);
      if (distance < 19) {
        this.score += 100;
        this.next++;
        this.banner = this.next >= this.rings.length ? 'COURSE COMPLETE · RETURN TO RUNWAY' : 'RING ' + this.next + ' / ' + this.rings.length + ' · CLEAN PASS';
        this.bannerTime = 2.6;
        if (this.onRing) this.onRing(this.next);
      }
    }
    complete(state) {
      if (state.crashed) return false;
      if (this.next < this.rings.length) return false;
      if (this.state === 'landed') return true;
      if (state.onGround && state.speed < 20 && this.worldRunway(state)) {
        this.state = 'landed';
        this.score += Math.max(0, 400 - Math.floor(this.elapsed) * 2);
        this.banner = 'SORTIE COMPLETE · ' + this.score + ' PTS';
        this.bannerTime = 6;
        return true;
      }
      return false;
    }
    worldRunway(state) {
      return Math.abs(state.position.x - C.runway.x) < C.runway.width && Math.abs(state.position.z - C.runway.z) < C.runway.length / 2;
    }
  };
})();
