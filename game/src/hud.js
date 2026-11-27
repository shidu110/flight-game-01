// Job: Cached DOM HUD & dispatch UI: flight readouts, low-fuel/stall alerts, permanent keybar, sortie tags, and route canvas with service/wind markers.
// Exports: KR.Hud
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
        '<div class="readout"><span>HDG</span><strong id="hud-hdg">000</strong><small>°</small></div></div>',
        '<div class="status"><div class="status-row"><span>FUEL <em id="low-fuel">LOW FUEL</em></span><b id="hud-fuel">100</b></div><div class="bar"><i id="fuel-bar"></i></div>',
        '<div class="status-row"><span>HULL</span><b id="hud-hull">100</b></div><div class="bar hull"><i id="hull-bar"></i></div>',
        '<div class="mission"><span id="hud-mission">SORTIE 01 · ISLAND HOPPER</span><div class="navigation"><b id="hud-distance">0 M</b><b id="hud-time">00:00</b></div><div class="navigation-labels"><span>TO NEXT</span><span>ELAPSED</span></div></div></div>',
        '<div id="banner" class="banner"></div>',
        '<div class="hint" aria-label="Permanent controls"><span>↑↓ PITCH</span><span>←→ BANK</span><span>A/D RUDDER</span><span>SHIFT/CTRL THROTTLE</span><span>C CAMERA</span><span>F FREE FLIGHT</span><span>M MUTE</span><span>ENTER START · R RESTART</span></div>',
        '<div class="throttle"><span>THROTTLE</span><div class="bar"><i id="throttle-bar"></i></div><b id="hud-throttle">0%</b></div>',
        '<div class="reticle"></div><div id="toast" class="toast"></div>'
      ].join('');
      const $ = (id) => document.getElementById(id);
      this.alt = $('hud-alt'); this.spd = $('hud-spd'); this.hdg = $('hud-hdg');
      this.fuel = $('hud-fuel'); this.hull = $('hud-hull');
      this.fuelBar = $('fuel-bar'); this.hullBar = $('hull-bar');
      this.throttleBar = $('throttle-bar'); this.throttle = $('hud-throttle');
      this.distance = $('hud-distance'); this.elapsed = $('hud-time');
      this.lowFuel = $('low-fuel'); this.mission = $('hud-mission');
      this.banner = $('banner'); this.toast = $('toast');
      this.crash = $('crash'); this.briefing = $('briefing');
      this.crashReason = this.crash.querySelector('.crash-reason');
      this.crashScore = this.crash.querySelector('.crash-score');
    }
    setText(k, v) { if (this.last[k] !== v) { this.last[k] = v; this[k].textContent = v; } }
    setBar(k, v) {
      const s = (KR.Config.clamp(v, 0, 100) / 100).toFixed(3);
      if (this.last[k] !== s) { this.last[k] = s; this[k].style.transform = 'scaleX(' + s + ')'; }
    }
    setClass(k, el, cls, on) { if (this.last[k] !== on) { this.last[k] = on; el.classList.toggle(cls, on); } }
    update(s, m) {
      this.setText('alt', String(Math.max(0, Math.round(s.altitude * 3.28084))));
      this.setText('spd', String(Math.round(s.speed * 1.94384)));
      this.setText('hdg', String(Math.round(KR.Config.heading(s.heading)) % 360).padStart(3, '0'));
      this.setText('fuel', String(Math.round(s.fuel)));
      this.setText('hull', String(Math.round(s.hull)));
      this.setBar('fuelBar', s.fuel);
      if (this.last.fuelColor !== (s.fuel < 25)) {
        this.last.fuelColor = s.fuel < 25;
        this.fuelBar.style.background = s.fuel < 25 ? '#e63946' : '#ffb25b';
      }
      this.setClass('lowFuelShown', this.lowFuel, 'show', s.fuel < 25);
      this.setBar('hullBar', s.hull);
      this.setBar('throttleBar', s.throttle);
      this.setText('throttle', Math.round(s.throttle) + '%');
      this.setText('mission', 'SORTIE ' + m.sortie.name);
      const tgt = m.next < m.rings.length ? m.rings[m.next].position : this.runwayTarget;
      this.setText('distance', Math.round(s.position.distanceTo(tgt)) + ' M');
      this.setText('elapsed', String(Math.floor(m.elapsed / 60)).padStart(2, '0') + ':' + String(Math.floor(m.elapsed) % 60).padStart(2, '0'));
      const reg = m.selectedSortie === 2 ? 'HIGH RIDGE' : m.next < 3 ? 'MAIN ISLAND' : m.next < 7 ? 'OUTER ISLES' : 'LIGHTHOUSE COAST';
      this.setText('banner', m.freeFlight ? 'FREE FLIGHT · ENJOY THE ISLANDS' : m.next < m.rings.length ? 'NEXT RING ' + String(m.next + 1).padStart(2, '0') + ' / 10 · ' + reg : 'FINAL · RUNWAY 36');
      this.setClass('bannerShown', this.banner, 'show', m.state === 'flying');
      this.setClass('stalled', this.root, 'stalled', s.speed < KR.Config.flight.stallSpeed && !s.onGround && !s.crashed);
      this.setClass('crashed', this.root, 'crashed', s.crashed);
      if (s.crashed) { this.setText('crashReason', s.crashReason || 'AIRFRAME LOST'); this.setText('crashScore', 'SCORE ' + m.score); }
      this.setClass('crashShown', this.crash, 'show', s.crashed);
    }
    showToast(msg) {
      this.setText('toast', msg); this.toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.toast.classList.remove('show'), 2200);
    }
    setBriefingVisible(v) { this.setClass('briefingShown', this.briefing, 'show', v); this.setClass('briefingMode', this.root, 'briefing', v); }
    setCameraView(mode) {
      if (this.last.cameraMode === mode) return;
      this.last.cameraMode = mode;
      this.root.classList.toggle('cockpit', mode === 'cockpit');
      this.root.classList.toggle('chase', mode === 'chase');
    }
    renderRouteMap(world, mission) {
      const cv = document.getElementById('route-map'), g = cv.getContext('2d');
      const mx = (v) => 28 + (v + 1850) / 3450 * (cv.width - 56), mz = (v) => 14 + (v + 1650) / 3500 * (cv.height - 28);
      g.fillStyle = '#102b36'; g.fillRect(0, 0, cv.width, cv.height);
      for (const isl of world.islands) {
        g.beginPath();
        for (let s = 0; s <= 40; s++) {
          const a = s / 40 * Math.PI * 2, r = isl.r * (0.86 + Math.sin(a * 3 + isl.x) * 0.035);
          const x = mx(isl.x + Math.cos(a) * r), z = mz(isl.z + Math.sin(a) * r);
          if (s === 0) g.moveTo(x, z); else g.lineTo(x, z);
        }
        g.closePath(); g.fillStyle = '#41573e'; g.fill(); g.strokeStyle = '#8a9070'; g.lineWidth = 2; g.stroke();
      }
      g.beginPath();
      mission.rings.forEach((r, i) => { const x = mx(r.position.x), z = mz(r.position.z); if (!i) g.moveTo(x, z); else g.lineTo(x, z); });
      g.strokeStyle = '#d6a75e'; g.lineWidth = 2; g.setLineDash([7, 5]); g.stroke(); g.setLineDash([]);
      mission.rings.forEach((r, i) => {
        const x = mx(r.position.x), z = mz(r.position.z);
        g.beginPath(); g.arc(x, z, 11, 0, Math.PI * 2); g.fillStyle = '#ffb25b'; g.fill();
        g.fillStyle = '#10232a'; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), x, z + 1);
      });
      const rw = KR.Config.runway, rx = mx(rw.x), rz = mz(rw.z);
      g.strokeStyle = '#f2eee2'; g.lineWidth = 5; g.beginPath(); g.moveTo(rx, mz(rw.z - 300)); g.lineTo(rx, mz(rw.z + 300)); g.stroke();
      g.fillStyle = '#f2eee2'; g.font = 'bold 13px monospace'; g.textAlign = 'left'; g.fillText('36', rx + 8, rz - 4);
      // Runway service/repair badge (teal box with cross + SVC)
      g.fillStyle = '#153b42'; g.strokeStyle = '#79c9b7'; g.lineWidth = 2;
      g.fillRect(rx - 76, rz - 13, 62, 24); g.strokeRect(rx - 76, rz - 13, 62, 24);
      g.fillStyle = '#79c9b7'; g.fillRect(rx - 68, rz - 3, 12, 4); g.fillRect(rx - 64, rz - 7, 4, 12);
      g.font = 'bold 13px monospace'; g.textBaseline = 'middle'; g.fillText('SVC', rx - 50, rz);
      // Wind vector indicator in top-right of route map
      const cw = mission.sortie.crosswind;
      g.fillStyle = 'rgba(12,24,31,0.82)'; g.fillRect(cv.width - 178, 12, 166, 36);
      g.strokeStyle = cw > 0 ? '#ffb25b' : '#79c9b7'; g.lineWidth = 2; g.strokeRect(cv.width - 178, 12, 166, 36);
      g.strokeStyle = cw > 0 ? '#ffb25b' : '#79c9b7'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(cv.width - 166, 30); g.lineTo(cv.width - 128, 30);
      g.lineTo(cv.width - 137, 23); g.moveTo(cv.width - 128, 30); g.lineTo(cv.width - 137, 37); g.stroke();
      g.fillStyle = cw > 0 ? '#ffb25b' : '#cfe6df'; g.font = 'bold 14px monospace'; g.textAlign = 'left';
      g.fillText(cw > 0 ? cw + ' M/S W' : 'CALM AIR', cv.width - 118, 31);
    }
  };
})();
