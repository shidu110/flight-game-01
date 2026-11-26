// Job: Wire the game, fixed-step simulation, focus lifecycle and render loop.
// Exports: None (starts Kestrel Run).
(function () {
  'use strict';
  const C = KR.Config;
  const shots = new KR.ShotPresets();
  const seeded = KR.createRandom(shots.seed);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.35, 4400);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  document.getElementById('game').appendChild(renderer.domElement);

  const world = new KR.World(scene, seeded);
  const aircraft = new KR.Aircraft(scene);
  const flight = new KR.Flight(world);
  const missions = new KR.Missions(scene, world);
  const cockpit = new KR.Cockpit(camera);
  const hud = new KR.Hud();
  const input = new KR.Input();
  const audio = new KR.Audio();
  missions.onRing = () => audio.chime();
  const cameraRig = new KR.CameraRig(camera, world);
  cameraRig.mode = 'briefing';
  const briefing = document.getElementById('briefing');
  function formatTime(seconds) {
    return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds) % 60).padStart(2, '0');
  }
  function updateSortieRecord() {
    document.getElementById('sortie-par').textContent = 'PAR ' + formatTime(missions.sortie.parTime);
    const record = document.getElementById('sortie-best');
    const best = missions.bestMedals[missions.selectedSortie];
    record.textContent = 'BEST · ' + (best || 'NOT FLOWN');
    record.dataset.medal = best || 'NONE';
  }
  function selectSortie(index) {
    const sortie = missions.selectSortie(index);
    briefing.querySelector('.mission-name').textContent = 'SORTIE ' + sortie.name;
    document.getElementById('sortie-detail').textContent = sortie.detail;
    for (let option = 0; option < 3; option++) {
      const button = document.getElementById('sortie-' + option);
      button.classList.toggle('selected', option === missions.selectedSortie);
      button.setAttribute('aria-pressed', String(option === missions.selectedSortie));
    }
    updateSortieRecord();
    hud.renderRouteMap(world, missions);
  }
  selectSortie(0);
  for (let option = 0; option < 3; option++) document.getElementById('sortie-' + option).addEventListener('click', () => {
    if (!started && (!shots.active || shots.name === 'briefing')) selectSortie(option);
  });
  shots.apply(flight, missions, cameraRig);
  if (shots.name && shots.name !== 'briefing') briefing.classList.remove('show');
  if (shots.name === 'briefing') briefing.classList.add('show');
  if (!shots.name) document.getElementById('briefing-start').focus();

  let paused = !shots.active && !!document.hidden;
  let focused = true;
  let started = false;
  let last = performance.now();
  let accumulator = 0;
  let didCrash = false;

  function beginSortie() {
    if (shots.active || started) return;
    audio.start();
    briefing.classList.remove('show');
    missions.start();
    flight.applySortieParameters(missions.sortie);
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
    flight.applySortieParameters(missions.sortie);
    flight.throttle = 12;
    started = true;
    didCrash = false;
    serviced = true;
    lastLanded = false;
    accumulator = 0;
    cameraRig.mode = 'chase';
    cameraRig.reset();
    hud.showToast('SORTIE RESET · THROTTLE UP');
  }
  function nextSortie() {
    if (shots.active) return;
    document.getElementById('debrief').classList.remove('show');
    flight.resetToRunway();
    missions.reset();
    started = false;
    didCrash = false;
    serviced = true;
    lastLanded = false;
    accumulator = 0;
    cameraRig.mode = 'briefing';
    cameraRig.reset();
    selectSortie((missions.selectedSortie + 1) % missions.sorties.length);
    briefing.classList.add('show');
    document.getElementById('briefing-start').focus();
  }
  document.getElementById('briefing-start').addEventListener('click', beginSortie);
  document.getElementById('crash-restart').addEventListener('click', restart);
  addEventListener('pointerdown', () => audio.start(), { once: true });
  addEventListener('keydown', () => audio.start(), { once: true });
  function syncFocus() {
    paused = !shots.active && (!focused || !!document.hidden);
    input.keys = {};
    last = performance.now();
    accumulator = 0;
    if (paused) audio.suspend(); else audio.resume();
  }
  addEventListener('blur', () => { focused = false; syncFocus(); });
  addEventListener('focus', () => { focused = true; syncFocus(); });
  document.addEventListener('visibilitychange', syncFocus);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  input.onKey((event) => {
    if (!started && (!shots.active || shots.name === 'briefing') && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      selectSortie(missions.selectedSortie + (['ArrowRight', 'ArrowDown'].includes(event.code) ? 1 : -1));
      return;
    }
    if (event.code === 'Enter' && !started && !shots.active) {
      event.preventDefault();
      beginSortie();
    }
    if (event.code === 'KeyC' && started && !flight.crashed && missions.state !== 'landed') cameraRig.cycle();
    if (event.code === 'KeyF' && started && !flight.crashed && missions.state !== 'landed') missions.toggleFreeFlight();
    if (event.code === 'KeyM') hud.showToast(audio.toggleMute() ? 'AUDIO MUTED' : 'AUDIO ON');
    if (event.code === 'KeyR' && started && missions.state !== 'landed') restart();
    if (event.code === 'Enter' && missions.state === 'landed' && !shots.active) {
      event.preventDefault();
      nextSortie();
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
    missions.update(delta, flight, world.time);
    if (missions.state === 'flying' && missions.next >= missions.rings.length && missions.complete(flight)) {
      const result = missions.result;
      const medal = document.getElementById('debrief-medal');
      medal.textContent = result.medal;
      medal.dataset.medal = result.medal;
      document.getElementById('debrief-time').textContent = formatTime(result.elapsed) + ' / PAR ' + formatTime(result.parTime) + ' · ' + result.rings + '/' + missions.rings.length + ' RINGS · HULL ' + Math.round(result.hull) + '%';
      updateSortieRecord();
      serviced = true;
      flight.applyLandingService();
      flight.throttle = flight.speed = flight.rpm = flight.verticalSpeed = 0;
      audio.chime();
      hud.showToast('SORTIE COMPLETE · REFUELLED AND REPAIRED');
      document.getElementById('debrief-score').textContent = missions.score + ' PTS';
      document.getElementById('debrief').classList.add('show');
    } else if (!flight.crashed && flight.onGround && !serviced && flight.speed < 5 && flight.throttle < 10) {
      serviced = true;
      flight.applyLandingService();
      hud.showToast('STOP COMPLETE · REFUELLED AND REPAIRED');
    }
    if (flight.crashed && !didCrash) { audio.thud(); didCrash = true; }
  }
  document.getElementById('next-sortie').addEventListener('click', nextSortie);

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
    const stepDelta = shots.active ? 0 : delta;
    const simTime = shots.active ? 0 : now / 1000;
    last = now;
    if (!paused) {
      world.update(stepDelta, simTime);
      if (!shots.active) {
        accumulator += delta;
        while (accumulator >= C.flight.step) {
          if (missions.state !== 'landed') updateGame(C.flight.step);
          accumulator -= C.flight.step;
        }
      } else {
        missions.update(stepDelta, flight, simTime);
      }
      aircraft.update(stepDelta, flight);
      cameraRig.update(stepDelta, flight, shots, simTime, input);
      world.updateView(camera, flight);
      aircraft.setVisible(cameraRig.mode !== 'cockpit' || shots.name === 'briefing');
      cockpit.setVisible(cameraRig.mode === 'cockpit');
      if (cameraRig.mode === 'cockpit') cockpit.update(stepDelta, flight, input.controlState);
      hud.setBriefingVisible(!started && !shots.name || shots.name === 'briefing');
      hud.setCameraView(cameraRig.mode);
      hud.update(flight, missions);
      audio.update(flight);
      renderer.render(scene, camera);
      input.endFrame();
    }
  }
  requestAnimationFrame(animate);
})();
