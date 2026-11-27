// Job: Game bootstrap: WebGLRenderer setup, fixed-step simulation loop, sortie/debrief/service lifecycle, and focus pause handling.
// Exports: None (starts Kestrel Run)
(function () {
  'use strict';
  const C = KR.Config, $ = (id) => document.getElementById(id);
  const shots = new KR.ShotPresets(), seeded = KR.createRandom(shots.seed);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.35, 4400);
  camera.rotation.order = 'YXZ'; scene.add(camera);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  $('game').appendChild(renderer.domElement);

  const world = new KR.World(scene, seeded), aircraft = new KR.Aircraft(scene), flight = new KR.Flight(world);
  const missions = new KR.Missions(scene, world), cockpit = new KR.Cockpit(camera), hud = new KR.Hud();
  const input = new KR.Input(), audio = new KR.Audio(), cameraRig = new KR.CameraRig(camera, world);
  missions.onRing = () => audio.chime();
  cameraRig.mode = 'briefing';
  const briefing = $('briefing');
  const fmt = (sec) => Math.floor(sec / 60) + ':' + String(Math.floor(sec) % 60).padStart(2, '0');
  function updateSortieRecord() {
    $('sortie-par').textContent = 'PAR ' + fmt(missions.sortie.parTime);
    const rec = $('sortie-best'), best = missions.bestMedals[missions.selectedSortie];
    rec.textContent = 'BEST · ' + (best || 'NOT FLOWN');
    rec.dataset.medal = best || 'NONE';
  }
  function selectSortie(idx) {
    const s = missions.selectSortie(idx);
    briefing.querySelector('.mission-name').textContent = 'SORTIE ' + s.name;
    $('sortie-detail').textContent = s.detail;
    for (let i = 0; i < 3; i++) {
      const b = $('sortie-' + i), sel = i === missions.selectedSortie;
      b.classList.toggle('selected', sel); b.setAttribute('aria-pressed', String(sel));
    }
    updateSortieRecord(); hud.renderRouteMap(world, missions);
  }
  selectSortie(0);
  for (let i = 0; i < 3; i++) $('sortie-' + i).addEventListener('click', () => {
    if (!started && (!shots.active || shots.name === 'briefing')) selectSortie(i);
  });
  shots.apply(flight, missions, cameraRig);
  if (shots.name && shots.name !== 'briefing') briefing.classList.remove('show');
  if (shots.name === 'briefing') briefing.classList.add('show');
  if (!shots.name) $('briefing-start').focus();

  let paused = !shots.active && !!document.hidden, focused = true, started = false;
  let last = performance.now(), acc = 0, didCrash = false, lastLanded = false, serviced = true;

  function beginSortie() {
    if (shots.active || started) return;
    audio.start(); briefing.classList.remove('show'); missions.start();
    flight.applySortieParameters(missions.sortie); flight.throttle = 12;
    started = true; cameraRig.mode = 'chase'; cameraRig.reset();
    hud.showToast('SHIFT / CTRL THROTTLE · ↑↓ PITCH · ←→ BANK');
  }
  function restart() {
    if (shots.active) return;
    flight.resetToRunway(); missions.reset(); missions.start();
    flight.applySortieParameters(missions.sortie); flight.throttle = 12;
    started = serviced = true; didCrash = lastLanded = false; acc = 0;
    cameraRig.mode = 'chase'; cameraRig.reset();
    hud.showToast('SORTIE RESET · THROTTLE UP');
  }
  function nextSortie() {
    if (shots.active) return;
    $('debrief').classList.remove('show');
    flight.resetToRunway(); missions.reset();
    started = didCrash = lastLanded = false; serviced = true; acc = 0;
    cameraRig.mode = 'briefing'; cameraRig.reset();
    selectSortie((missions.selectedSortie + 1) % missions.sorties.length);
    briefing.classList.add('show'); $('briefing-start').focus();
  }
  $('briefing-start').addEventListener('click', beginSortie);
  $('crash-restart').addEventListener('click', restart);
  $('next-sortie').addEventListener('click', nextSortie);
  addEventListener('pointerdown', () => audio.start(), { once: true });
  addEventListener('keydown', () => audio.start(), { once: true });
  function syncFocus() {
    paused = !shots.active && (!focused || !!document.hidden);
    input.keys = {}; last = performance.now(); acc = 0;
    if (paused) audio.suspend(); else audio.resume();
  }
  addEventListener('blur', () => { focused = false; syncFocus(); });
  addEventListener('focus', () => { focused = true; syncFocus(); });
  document.addEventListener('visibilitychange', syncFocus);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  input.onKey((e) => {
    if (!started && (!shots.active || shots.name === 'briefing') && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      selectSortie(missions.selectedSortie + (['ArrowRight', 'ArrowDown'].includes(e.code) ? 1 : -1)); return;
    }
    if (e.code === 'Enter' && !started && !shots.active) { e.preventDefault(); beginSortie(); }
    if (e.code === 'KeyC' && started && !flight.crashed && missions.state !== 'landed') cameraRig.cycle();
    if (e.code === 'KeyF' && started && !flight.crashed && missions.state !== 'landed') missions.toggleFreeFlight();
    if (e.code === 'KeyM') hud.showToast(audio.toggleMute() ? 'AUDIO MUTED' : 'AUDIO ON');
    if (e.code === 'KeyR' && started && missions.state !== 'landed') restart();
    if (e.code === 'Enter' && missions.state === 'landed' && !shots.active) { e.preventDefault(); nextSortie(); }
  });
  function updateGame(dt) {
    if (!started) return;
    flight.update(dt, input, started && !flight.crashed);
    if (flight.landed && !lastLanded) { audio.thud(); hud.showToast(flight.touchdownMessage || 'TOUCHDOWN'); }
    lastLanded = flight.landed;
    if (!flight.onGround) serviced = false;
    missions.update(dt, flight, world.time);
    if (missions.state === 'flying' && missions.next >= missions.rings.length && missions.complete(flight)) {
      const res = missions.result, medal = $('debrief-medal');
      medal.textContent = res.medal; medal.dataset.medal = res.medal;
      $('debrief-time').textContent = fmt(res.elapsed) + ' / PAR ' + fmt(res.parTime) + ' · ' + res.rings + '/' + missions.rings.length + ' RINGS · HULL ' + Math.round(res.hull) + '%';
      updateSortieRecord(); serviced = true; flight.applyLandingService();
      flight.throttle = flight.speed = flight.rpm = flight.verticalSpeed = 0;
      audio.chime(); hud.showToast('SORTIE COMPLETE · REFUELLED AND REPAIRED');
      $('debrief-score').textContent = missions.score + ' PTS';
      $('debrief').classList.add('show');
    } else if (!flight.crashed && flight.onGround && !serviced && flight.speed < 5 && flight.throttle < 10) {
      serviced = true; flight.applyLandingService();
      hud.showToast('STOP COMPLETE · REFUELLED AND REPAIRED');
    }
    if (flight.crashed && !didCrash) { audio.thud(); didCrash = true; }
  }
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    const sDt = shots.active ? 0 : dt, simT = shots.active ? 0 : now / 1000;
    last = now;
    if (!paused) {
      world.update(sDt, simT);
      if (!shots.active) {
        acc += dt;
        while (acc >= C.flight.step) { if (missions.state !== 'landed') updateGame(C.flight.step); acc -= C.flight.step; }
      } else { missions.update(sDt, flight, simT); }
      aircraft.update(sDt, flight);
      cameraRig.update(sDt, flight, shots, simT, input);
      world.updateView(camera, flight);
      aircraft.setVisible(cameraRig.mode !== 'cockpit' || shots.name === 'briefing');
      cockpit.setVisible(cameraRig.mode === 'cockpit');
      if (cameraRig.mode === 'cockpit') cockpit.update(sDt, flight, input.controlState);
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
