// Job: Display cached flight readouts, alerts and the dispatch route map.
// Exports: KR.Hud.
(function () {
  'use strict';
  KR.Hud = class KestrelHud {
    constructor() {
      this.root = document.getElementById('hud');
      this.last = Object.create(null);
      this.runwayTarget = new THREE.Vector3(KR.Config.runway.x, 9, KR.Config.runway.z + 240);
      this.build();
    }
    build() {
      this.root.innerHTML = [
        '<div class="flight-readouts">',
        '<div class="readout"><span>ALT</span><strong id="hud-alt">0</strong><small>FT</small></div>',
        '<div class="readout"><span>SPD</span><strong id="hud-spd">0</strong><small>KT</small></div>',
        '<div class="readout"><span>HDG</span><strong id="hud-hdg">000</strong><small>°</small></div>',
        '</div>',
        '<div class="status"><div class="status-row"><span>FUEL <em id="low-fuel">LOW FUEL</em></span><b id="hud-fuel">100</b></div><div class="bar"><i id="fuel-bar"></i></div>',
        '<div class="status-row"><span>HULL</span><b id="hud-hull">100</b></div><div class="bar hull"><i id="hull-bar"></i></div>',
        '<div class="mission"><span id="hud-mission">SORTIE 01 · ISLAND HOPPER</span><div class="navigation"><b id="hud-distance">0 M</b><b id="hud-time">00:00</b></div><div class="navigation-labels"><span>TO NEXT</span><span>ELAPSED</span></div></div></div>',
        '<div id="banner" class="banner"></div>',
        '<div class="hint" aria-label="Permanent controls"><span>↑↓ PITCH</span><span>←→ BANK</span><span>A/D RUDDER</span><span>SHIFT/CTRL THROTTLE</span><span>C CAMERA</span><span>F FREE FLIGHT</span><span>M MUTE</span><span>ENTER START · R RESTART</span></div>',
        '<div class="throttle"><span>THROTTLE</span><div class="bar"><i id="throttle-bar"></i></div><b id="hud-throttle">0%</b></div>',
        '<div class="reticle"></div>',
        '<div id="toast" class="toast"></div>'
      ].join('');
      this.alt = document.getElementById('hud-alt');
      this.spd = document.getElementById('hud-spd');
      this.hdg = document.getElementById('hud-hdg');
      this.fuel = document.getElementById('hud-fuel');
      this.hull = document.getElementById('hud-hull');
      this.fuelBar = document.getElementById('fuel-bar');
      this.hullBar = document.getElementById('hull-bar');
      this.throttleBar = document.getElementById('throttle-bar');
      this.throttle = document.getElementById('hud-throttle');
      this.distance = document.getElementById('hud-distance');
      this.elapsed = document.getElementById('hud-time');
      this.lowFuel = document.getElementById('low-fuel');
      this.mission = document.getElementById('hud-mission');
      this.banner = document.getElementById('banner');
      this.toast = document.getElementById('toast');
      this.crash = document.getElementById('crash');
      this.briefing = document.getElementById('briefing');
      this.crashReason = this.crash.querySelector('.crash-reason');
      this.crashScore = this.crash.querySelector('.crash-score');
    }
    setText(name, value) {
      if (this.last[name] === value) return;
      this.last[name] = value;
      this[name].textContent = value;
    }
    setBar(name, value) {
      const scale = (KR.Config.clamp(value, 0, 100) / 100).toFixed(3);
      if (this.last[name] === scale) return;
      this.last[name] = scale;
      this[name].style.transform = 'scaleX(' + scale + ')';
    }
    setClass(key, node, name, enabled) {
      if (this.last[key] === enabled) return;
      this.last[key] = enabled;
      node.classList.toggle(name, enabled);
    }
    update(state, mission) {
      this.setText('alt', String(Math.max(0, Math.round(state.altitude * 3.28084))));
      this.setText('spd', String(Math.round(state.speed * 1.94384)));
      this.setText('hdg', String(Math.round(KR.Config.heading(state.heading)) % 360).padStart(3, '0'));
      this.setText('fuel', String(Math.round(state.fuel)));
      this.setText('hull', String(Math.round(state.hull)));
      this.setBar('fuelBar', state.fuel);
      if (this.last.fuelColor !== (state.fuel < 25)) {
        this.last.fuelColor = state.fuel < 25;
        this.fuelBar.style.background = state.fuel < 25 ? '#e63946' : '#ffb25b';
      }
      this.setClass('lowFuelShown', this.lowFuel, 'show', state.fuel < 25);
      this.setBar('hullBar', state.hull);
      this.setBar('throttleBar', state.throttle);
      this.setText('throttle', Math.round(state.throttle) + '%');
      this.setText('mission', 'SORTIE ' + mission.sortie.name);
      const target = mission.next < mission.rings.length ? mission.rings[mission.next].position : this.runwayTarget;
      this.setText('distance', Math.round(state.position.distanceTo(target)) + ' M');
      this.setText('elapsed', String(Math.floor(mission.elapsed / 60)).padStart(2, '0') + ':' + String(Math.floor(mission.elapsed) % 60).padStart(2, '0'));
      const region = mission.selectedSortie === 2 ? 'HIGH RIDGE' : mission.next < 3 ? 'MAIN ISLAND' : mission.next < 7 ? 'OUTER ISLES' : 'LIGHTHOUSE COAST';
      this.setText('banner', mission.freeFlight ? 'FREE FLIGHT · ENJOY THE ISLANDS' : mission.next < mission.rings.length ? 'NEXT RING ' + String(mission.next + 1).padStart(2, '0') + ' / 10 · ' + region : 'FINAL · RUNWAY 36');
      this.setClass('bannerShown', this.banner, 'show', mission.state === 'flying');
      this.setClass('stalled', this.root, 'stalled', state.speed < KR.Config.flight.stallSpeed && !state.onGround && !state.crashed);
      this.setClass('crashed', this.root, 'crashed', state.crashed);
      if (state.crashed) {
        this.setText('crashReason', state.crashReason || 'AIRFRAME LOST');
        this.setText('crashScore', 'SCORE ' + mission.score);
      }
      this.setClass('crashShown', this.crash, 'show', state.crashed);
    }
    showToast(message) {
      this.setText('toast', message);
      this.toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.toast.classList.remove('show'), 2200);
    }
    setBriefingVisible(visible) {
      this.setClass('briefingShown', this.briefing, 'show', visible);
      this.setClass('briefingMode', this.root, 'briefing', visible);
    }
    setCameraView(mode) {
      if (this.last.cameraMode === mode) return;
      this.last.cameraMode = mode;
      this.root.classList.toggle('cockpit', mode === 'cockpit');
      this.root.classList.toggle('chase', mode === 'chase');
    }
    renderRouteMap(world, mission) {
      const canvas = document.getElementById('route-map');
      const context = canvas.getContext('2d');
      const mapX = (value) => 28 + (value + 1850) / 3450 * (canvas.width - 56);
      const mapZ = (value) => 14 + (value + 1650) / 3500 * (canvas.height - 28);
      context.fillStyle = '#102b36'; context.fillRect(0, 0, canvas.width, canvas.height);
      for (const island of world.islands) {
        context.beginPath();
        for (let segment = 0; segment <= 40; segment++) {
          const angle = segment / 40 * Math.PI * 2;
          const radius = island.r * (0.86 + Math.sin(angle * 3 + island.x) * 0.035);
          const pointX = mapX(island.x + Math.cos(angle) * radius), pointZ = mapZ(island.z + Math.sin(angle) * radius);
          if (segment === 0) context.moveTo(pointX, pointZ); else context.lineTo(pointX, pointZ);
        }
        context.closePath(); context.fillStyle = '#41573e'; context.fill(); context.strokeStyle = '#8a9070'; context.lineWidth = 2; context.stroke();
      }
      context.beginPath();
      mission.rings.forEach((ring, index) => {
        const pointX = mapX(ring.position.x), pointZ = mapZ(ring.position.z);
        if (!index) context.moveTo(pointX, pointZ); else context.lineTo(pointX, pointZ);
      });
      context.strokeStyle = '#d6a75e'; context.lineWidth = 1.5; context.setLineDash([6, 5]); context.stroke(); context.setLineDash([]);
      mission.rings.forEach((ring, index) => {
        const pointX = mapX(ring.position.x), pointZ = mapZ(ring.position.z);
        context.beginPath(); context.arc(pointX, pointZ, 10, 0, Math.PI * 2); context.fillStyle = '#ffb25b'; context.fill();
        context.fillStyle = '#10232a'; context.font = 'bold 13px monospace'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(index + 1), pointX, pointZ + 1);
      });
      const rw = KR.Config.runway;
      context.strokeStyle = '#f2eee2'; context.lineWidth = 4; context.beginPath(); context.moveTo(mapX(rw.x), mapZ(rw.z - 300)); context.lineTo(mapX(rw.x), mapZ(rw.z + 300)); context.stroke();
      context.fillStyle = '#f2eee2'; context.font = '12px monospace'; context.textAlign = 'left'; context.fillText('36', mapX(rw.x) + 8, mapZ(rw.z));
    }
  };
})();
