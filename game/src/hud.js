(function () {
  'use strict';
  KR.Hud = class KestrelHud {
    constructor() {
      this.root = document.getElementById('hud');
      this.build();
    }
    build() {
      this.root.innerHTML = [
        '<div class="flight-readouts">',
        '<div class="readout"><span>ALT</span><strong id="hud-alt">0</strong><small>FT</small></div>',
        '<div class="readout"><span>SPD</span><strong id="hud-spd">0</strong><small>KT</small></div>',
        '<div class="readout"><span>HDG</span><strong id="hud-hdg">000</strong><small>°</small></div>',
        '</div>',
        '<div class="status"><div class="status-row"><span>FUEL</span><b id="hud-fuel">100</b></div><div class="bar"><i id="fuel-bar"></i></div>',
        '<div class="status-row"><span>HULL</span><b id="hud-hull">100</b></div><div class="bar hull"><i id="hull-bar"></i></div>',
        '<div class="mission"><span id="hud-mission">SORTIE 01 · ISLAND HOPPER</span><b id="hud-progress">RING 0 / 10</b></div></div>',
        '<div id="banner" class="banner"></div>',
        '<div class="hint"><span>↑↓ PITCH</span><span>←→ BANK</span><span>A/D RUDDER</span><span>SHIFT/CTRL THROTTLE</span><span>C CAMERA</span><span>F FREE FLIGHT</span><span>M MUTE</span></div>',
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
      this.progress = document.getElementById('hud-progress');
      this.mission = document.getElementById('hud-mission');
      this.banner = document.getElementById('banner');
      this.toast = document.getElementById('toast');
      this.crash = document.getElementById('crash');
    }
    update(state, mission) {
      this.alt.textContent = String(Math.max(0, Math.round(state.altitude * 3.28084)));
      this.spd.textContent = String(Math.round(state.speed * 1.94384));
      this.hdg.textContent = String(Math.round(KR.Config.heading(state.heading)) % 360).padStart(3, '0');
      this.fuel.textContent = String(Math.round(state.fuel));
      this.hull.textContent = String(Math.round(state.hull));
      this.fuelBar.style.width = state.fuel + '%';
      this.fuelBar.style.background = state.fuel < 18 ? '#ef7352' : '#ffca7a';
      this.hullBar.style.width = state.hull + '%';
      this.throttleBar.style.width = state.throttle + '%';
      this.throttle.textContent = Math.round(state.throttle) + '%';
      this.progress.textContent = 'RING ' + Math.min(mission.next, mission.rings.length) + ' / ' + mission.rings.length;
      if (mission.bannerTime > 0) {
        this.banner.textContent = mission.banner;
        this.banner.classList.add('show');
      } else if (mission.state === 'flying') {
        const target = mission.next < mission.rings.length ? mission.rings[mission.next].position : new THREE.Vector3(KR.Config.runway.x, 9, KR.Config.runway.z + 240);
        const bearing = KR.Config.heading(Math.atan2(target.x - state.position.x, state.position.z - target.z));
        const distance = Math.round(state.position.distanceTo(target));
        const objective = mission.next < mission.rings.length ? 'RING ' + String(mission.next + 1).padStart(2, '0') : 'RETURN · RWY 36';
        this.banner.textContent = mission.freeFlight ? 'FREE FLIGHT · ENJOY THE ISLANDS' : objective + ' · ' + distance + ' M · ' + Math.round(bearing).toString().padStart(3, '0') + '°';
        this.banner.classList.add('show');
      } else {
        this.banner.classList.remove('show');
      }
      this.root.classList.toggle('stalled', state.speed < KR.Config.flight.stallSpeed && !state.onGround && !state.crashed);
      this.root.classList.toggle('crashed', state.crashed);
      if (state.crashed) {
        this.crash.querySelector('.crash-reason').textContent = state.crashReason || 'AIRFRAME LOST';
        this.crash.querySelector('.crash-score').textContent = 'SCORE ' + mission.score;
        this.crash.classList.add('show');
      } else {
        this.crash.classList.remove('show');
      }
    }
    showToast(message) {
      this.toast.textContent = message;
      this.toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.toast.classList.remove('show'), 2200);
    }
    setBriefingVisible(visible) {
      document.getElementById('briefing').classList.toggle('show', visible);
    }
  };
})();
