(function () {
  'use strict';
  const C = KR.Config;
  const seeded = KR.createRandom(Number(new URLSearchParams(location.search).get('seed')) || C.seed);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 4400);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  document.getElementById('game').appendChild(renderer.domElement);

  const world = new KR.World(scene, seeded);
  const aircraft = new KR.Aircraft(scene);
  const flight = new KR.Flight(world);
  const missions = new KR.Missions(scene);
  const cockpit = new KR.Cockpit(camera);
  const hud = new KR.Hud();
  const input = new KR.Input();
  const audio = new KR.Audio();
  const shots = new KR.Shots();
  const cameraRig = new KR.CameraRig(camera, world);
  cameraRig.mode = 'briefing';
  const briefing = document.getElementById('briefing');
  briefing.querySelector('.mission-name').textContent = 'SORTIE 01 · ISLAND HOPPER';
  shots.apply(flight, missions, cameraRig);
  if (shots.name && shots.name !== 'briefing') briefing.classList.remove('show');
  if (shots.name === 'briefing') briefing.classList.add('show');
  if (!shots.name) document.getElementById('briefing-start').focus();

  let paused = false;
  let started = false;
  let last = performance.now();
  let accumulator = 0;
  let didCrash = false;

  function beginSortie() {
    if (shots.active) return;
    audio.start();
    briefing.classList.remove('show');
    missions.start();
    flight.throttle = 12;
    started = true;
    cameraRig.mode = 'chase';
    cameraRig.reset();
    hud.showToast('SHIFT / CTRL THROTTLE · ↑↓ PITCH · ←→ BANK');
  }
  function restart() {
    if (shots.active) return;
    flight.resetToRunway();
    missions.reset();
    missions.start();
    missions.chimed = 0;
    flight.throttle = 12;
    started = true;
    didCrash = false;
    cameraRig.mode = 'chase';
    cameraRig.reset();
    hud.showToast('SORTIE RESET · THROTTLE UP');
  }
  document.getElementById('briefing-start').addEventListener('click', beginSortie);
  document.getElementById('crash-restart').addEventListener('click', restart);
  addEventListener('pointerdown', () => audio.start(), { once: true });
  addEventListener('keydown', () => audio.start(), { once: true });
  addEventListener('blur', () => { paused = true; input.keys = {}; });
  addEventListener('focus', () => { paused = false; last = performance.now(); });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  input.onKey((event) => {
    if (event.code === 'Enter' && !started && !shots.active) beginSortie();
    if (event.code === 'KeyC' && started) cameraRig.cycle();
    if (event.code === 'KeyF' && started) missions.toggleFreeFlight();
    if (event.code === 'KeyM') hud.showToast(audio.toggleMute() ? 'AUDIO MUTED' : 'AUDIO ON');
    if (event.code === 'KeyR' && flight.crashed) restart();
    if (event.code === 'Enter' && missions.state === 'landed' && !shots.active) {
      document.getElementById('debrief').classList.remove('show');
      restart();
    }
  });

  let lastLanded = false;
  let serviced = true;
  function updateGame(delta) {
    if (!started) return;
    const active = started && !flight.crashed;
    flight.update(delta, input, active);
    if (flight.landed && !lastLanded) {
      audio.thud();
      hud.showToast(flight.touchdownMessage || 'TOUCHDOWN');
    }
    lastLanded = flight.landed;
    if (!flight.onGround) serviced = false;
    if (flight.onGround && !serviced && flight.speed < 5 && flight.throttle < 10) {
      serviced = true;
      flight.applyLandingService();
      hud.showToast('STOP COMPLETE · REFUELLED AND REPAIRED');
    }
    missions.update(delta, flight, world.time);
    if (missions.next > 0 && missions.next !== missions.chimed) {
      missions.chimed = missions.next;
      audio.chime();
    }
    if (missions.state === 'flying' && missions.next >= missions.rings.length && missions.complete(flight)) {
      flight.applyLandingService();
      flight.throttle = 0;
      audio.chime();
      hud.showToast('SORTIE COMPLETE · REFUELLED AND REPAIRED');
      document.getElementById('debrief-score').textContent = missions.score + ' PTS';
      document.getElementById('debrief-time').textContent = Math.floor(missions.elapsed / 60) + ':' + String(Math.floor(missions.elapsed) % 60).padStart(2, '0') + ' · 10 RINGS · AIRFRAME SERVICED';
      document.getElementById('debrief').classList.add('show');
    }
    if (flight.crashed && !didCrash) { audio.thud(); didCrash = true; }
  }
  document.getElementById('next-sortie').addEventListener('click', () => {
    document.getElementById('debrief').classList.remove('show');
    restart();
  });

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!paused) {
      world.update(delta, now / 1000);
      if (!shots.active) {
        accumulator += delta;
        while (accumulator >= C.flight.step) {
          if (missions.state !== 'landed') updateGame(C.flight.step);
          accumulator -= C.flight.step;
        }
      } else {
        missions.update(delta, flight, now / 1000);
      }
      aircraft.update(delta, flight.snapshot());
      cockpit.update(flight.snapshot(), input.controlState);
      cameraRig.update(delta, flight, shots, now / 1000, input);
      aircraft.setVisible(cameraRig.mode !== 'cockpit' || shots.name === 'briefing');
      cockpit.setVisible(cameraRig.mode === 'cockpit');
      hud.setBriefingVisible(!started && !shots.name || shots.name === 'briefing');
      hud.update(flight, missions);
      audio.update(flight.snapshot());
      renderer.render(scene, camera);
      input.endFrame();
    }
  }
  requestAnimationFrame(animate);
})();
