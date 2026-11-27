// Job: Procedural archipelago: seeded heightfield islands, caustic ocean/shallows, layered stratocumulus, runway 36 apron/fuel depot/PAPI/tower, and lighthouse.
// Exports: KR.World
(function () {
  'use strict';
  const C = KR.Config;
  const ISLANDS = [
    { x: -420, z: 320, r: 720, h: 112 }, { x: 930, z: -760, r: 285, h: 44 },
    { x: 1010, z: 1010, r: 360, h: 63 }, { x: -1360, z: -1100, r: 470, h: 79 },
    { x: 350, z: 1460, r: 230, h: 31 }, { x: -1210, z: 1230, r: 175, h: 20 }
  ];
  const std = (c, r, f) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.9 : r, flatShading: f !== false });
  KR.World = class KestrelWorld {
    constructor(scene, random) {
      this.scene = scene; this.random = random; this.time = 0;
      this.waterLevel = C.waterLevel; this.islands = ISLANDS;
      this.heightAt = this.heightAt.bind(this);
      this.buildSky(); this.buildTerrain(); this.buildWater();
      this.buildClouds(); this.buildRunway(); this.buildClutter();
      this.lighthouse = this.buildLighthouse();
    }
    rawHeight(x, z) {
      let total = -8;
      for (let i = 0; i < ISLANDS.length; i++) {
        const isl = ISLANDS[i], edge = 1 - Math.hypot(x - isl.x, z - isl.z) / isl.r;
        if (edge > 0) {
          total += isl.h * Math.pow(edge, 0.72) * (0.84 + Math.sin(i * 4.7) * 0.13) + Math.sin(x * 0.027 + i) * Math.cos(z * 0.021 - i) * 6 * edge;
        }
      }
      const rw = C.runway;
      const cd = Math.hypot(Math.max(0, Math.abs(x - rw.x) - 80), Math.max(0, Math.abs(z - rw.z) - 620));
      total = THREE.MathUtils.lerp(total, Math.min(total, rw.height), 1 - THREE.MathUtils.smoothstep(cd, 0, 110));
      const od = Math.hypot(Math.max(0, Math.abs(x - rw.x) - 65), Math.max(0, Math.abs(z - rw.z) - 350));
      return THREE.MathUtils.lerp(total, rw.height, 1 - THREE.MathUtils.smoothstep(od, 0, 135));
    }
    heightAt(x, z) { return Math.max(0, this.rawHeight(x, z)); }
    buildSky() {
      this.sunDirection = new THREE.Vector3(-0.34, 0.25, 0.9).normalize();
      const horizon = new THREE.Color(C.palette.horizon);
      const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { sunDirection: { value: this.sunDirection }, horizonColor: { value: horizon }, zenithColor: { value: new THREE.Color(0x547b88) } },
        vertexShader: 'varying vec3 wd;void main(){wd=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'varying vec3 wd;uniform vec3 sunDirection,horizonColor,zenithColor;void main(){vec3 r=normalize(wd);vec3 c=mix(horizonColor,zenithColor,pow(max(r.y,0.0),0.55));float g=pow(max(dot(r,sunDirection),0.0),26.0)*smoothstep(0.0,0.12,r.y);c+=vec3(0.22,0.09,0.015)*g;gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\ngl_FragColor.rgb=mix(linearToOutputTexel(vec4(horizonColor,1.0)).rgb,gl_FragColor.rgb,smoothstep(0.0,0.12,r.y));}'
      }));
      sky.renderOrder = -10; this.scene.add(sky); this.sky = sky;
      this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(31.8, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffd494, fog: false, toneMapped: false, depthWrite: false }));
      this.sunDisc.position.copy(this.sunDirection).multiplyScalar(3900);
      this.scene.add(this.sunDisc, new THREE.HemisphereLight(0xb7cbd0, 0x65503b, 0.44));
      const sun = new THREE.DirectionalLight(0xffb86c, 2.0);
      sun.position.copy(this.sunDirection).multiplyScalar(650);
      sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 1; sun.shadow.camera.far = 1100;
      sun.shadow.normalBias = 0.025; sun.shadow.bias = -0.0005; sun.shadow.radius = 2;
      this.sunlight = sun; this.shadowCenter = new THREE.Vector3();
      this.shadowRight = new THREE.Vector3(0, 1, 0).cross(this.sunDirection).normalize();
      this.shadowUp = new THREE.Vector3().crossVectors(this.sunDirection, this.shadowRight).normalize();
      this.scene.add(sun, sun.target);
      this.scene.fog = new THREE.FogExp2(C.palette.horizon, 0.00046);
    }
    buildTerrain() {
      const geo = new THREE.PlaneGeometry(C.seaSize, C.seaSize, 180, 180); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, this.rawHeight(pos.getX(i), pos.getZ(i)));
      const flat = geo.toNonIndexed(); geo.dispose(); flat.computeVertexNormals();
      const colors = new Float32Array(flat.attributes.position.count * 3), col = new THREE.Color();
      const grass = new THREE.Color(C.palette.grass), forest = new THREE.Color(C.palette.forest), rock = new THREE.Color(C.palette.rock);
      const v = flat.attributes.position;
      for (let i = 0; i < v.count; i += 3) {
        const h = (v.getY(i) + v.getY(i + 1) + v.getY(i + 2)) / 3, sl = flat.attributes.normal.getY(i);
        col.setHex(C.palette.sand).lerp(grass, THREE.MathUtils.smoothstep(h, 3, 11)).lerp(forest, THREE.MathUtils.smoothstep(h, 25, 79));
        col.lerp(rock, (1 - THREE.MathUtils.smoothstep(sl, 0.72, 0.94)) * THREE.MathUtils.smoothstep(h, 5, 18));
        col.multiplyScalar(0.91 + this.random() * 0.15);
        for (let k = 0; k < 3; k++) col.toArray(colors, (i + k) * 3);
      }
      flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const t = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
      t.receiveShadow = t.castShadow = true; this.scene.add(t); this.terrain = t;
    }
    buildCausticTexture() {
      const sz = 128, cv = document.createElement('canvas'); cv.width = cv.height = sz;
      const g = cv.getContext('2d'), img = g.createImageData(sz, sz), cells = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cells.push([(c + 0.5) * 32 + Math.sin(r * 7 + c * 3) * 8, (r + 0.5) * 32 + Math.cos(c * 5 + r * 2) * 8]);
      for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
        const sx = (x + sz + Math.sin(y / sz * Math.PI * 4) * 5) % sz, sy = (y + sz + Math.sin(x / sz * Math.PI * 4) * 5) % sz;
        let n1 = Infinity, n2 = Infinity;
        for (const c of cells) {
          const dx = Math.abs(sx - c[0]), dy = Math.abs(sy - c[1]);
          const wx = Math.min(dx, sz - dx), wy = Math.min(dy, sz - dy), d = wx * wx + wy * wy;
          if (d < n1) { n2 = n1; n1 = d; } else if (d < n2) n2 = d;
        }
        const gap = Math.sqrt(n2) - Math.sqrt(n1), o = (y * sz + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
        img.data[o + 3] = Math.round(255 * Math.exp(-gap * gap / 2));
      }
      g.putImageData(img, 0, 0);
      const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return tx;
    }
    buildWater() {
      const geo = new THREE.CircleGeometry(18000, 128); geo.rotateX(-Math.PI / 2);
      const mat = new THREE.ShaderMaterial({
        fog: true,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, sunDirection: { value: this.sunDirection }, deepColor: { value: new THREE.Color(C.palette.seaDeep) }, seaColor: { value: new THREE.Color(C.palette.sea) } }]),
        vertexShader: 'varying vec3 sf;\n#include <fog_pars_vertex>\nvoid main(){sf=(modelMatrix*vec4(position,1.0)).xyz;vec4 mvPosition=viewMatrix*vec4(sf,1.0);gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
        fragmentShader: [
          'uniform float time;uniform vec3 sunDirection,deepColor,seaColor;varying vec3 sf;\n#include <fog_pars_fragment>',
          'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
          'float noise(vec2 p){vec2 c=floor(p),b=fract(p);b=b*b*(3.0-2.0*b);return mix(mix(hash(c),hash(c+vec2(1.0,0.0)),b.x),mix(hash(c+vec2(0.0,1.0)),hash(c+vec2(1.0)),b.x),b.y);}',
          'void main(){vec2 dr=vec2(time*0.025,-time*0.018);float sw=noise(sf.xz*0.004+dr)*0.65+noise(sf.xz*0.011-dr)*0.35;vec3 col=mix(deepColor,seaColor,0.55+sw*0.25);',
          'vec3 vd=normalize(cameraPosition-sf),n=normalize(vec3((noise(sf.xz*0.018+dr)-0.5)*0.10,1.0,(noise(sf.zx*0.021-dr)-0.5)*0.10)),hv=normalize(vd+sunDirection);float rf=pow(max(dot(n,hv),0.0),160.0),pt=pow(max(dot(normalize(sf.xz-cameraPosition.xz),normalize(sunDirection.xz)),0.0),34.0),gl=noise(sf.xz*0.2+dr*4.0);col+=vec3(0.75,0.34,0.07)*(rf*0.9+pt*pow(gl,5.0)*0.24);gl_FragColor=vec4(col,1.0);',
          '#include <tonemapping_fragment>\n#include <encodings_fragment>\n#include <fog_fragment>\n}'
        ].join('\n')
      });
      this.water = new THREE.Mesh(geo, mat); this.scene.add(this.water);
      this.causticTexture = this.buildCausticTexture();
      const sh = new THREE.ShaderMaterial({
        fog: true, transparent: true, side: THREE.DoubleSide, depthWrite: false,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, shallowColor: { value: new THREE.Color(0x2e7d82) }, causticColor: { value: new THREE.Color(C.palette.horizon) } }]),
        vertexShader: 'varying vec2 suv;varying float sa;attribute float shoreEdge;\n#include <fog_pars_vertex>\nvoid main(){suv=(modelMatrix*vec4(position,1.0)).xz;sa=shoreEdge;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
        fragmentShader: [
          'uniform float time;uniform sampler2D causticMap;uniform vec3 shallowColor,causticColor;varying vec2 suv;varying float sa;\n#include <fog_pars_fragment>',
          'void main(){float a=texture2D(causticMap,suv/48.0+vec2(time*0.018,-time*0.013)).a*0.07,b=texture2D(causticMap,vec2(suv.y,-suv.x)/76.0+vec2(-time*0.011,time*0.015)).a*0.045;',
          'float ef=smoothstep(0.0,0.18,sa)*(1.0-smoothstep(0.65,1.0,sa));gl_FragColor=vec4(mix(shallowColor,causticColor,(a+b)*ef),0.68);',
          '#include <tonemapping_fragment>\n#include <encodings_fragment>\n#include <fog_fragment>\n}'
        ].join('\n')
      });
      sh.uniforms.causticMap = { value: this.causticTexture }; this.shallowsMaterial = sh;
      const foam = new THREE.MeshBasicMaterial({ color: 0xf5f1e5, transparent: true, opacity: 0.66, side: THREE.DoubleSide, depthWrite: false });
      const pts = [], fpts = [], idx = [], edges = [];
      for (const isl of ISLANDS) {
        const vo = pts.length / 3;
        for (let seg = 0; seg <= 120; seg++) {
          const a = seg / 120 * Math.PI * 2; let lo = 0, hi = isl.r * 1.2;
          for (let st = 0; st < 13; st++) {
            const r = (lo + hi) / 2;
            if (this.rawHeight(isl.x + Math.cos(a) * r, isl.z + Math.sin(a) * r) > 0.15) lo = r; else hi = r;
          }
          for (const w of [-2, 22]) pts.push(isl.x + Math.cos(a) * (hi + w), 0.12, isl.z + Math.sin(a) * (hi + w));
          edges.push(0, 1);
          for (const w of [-0.8, 1.3]) fpts.push(isl.x + Math.cos(a) * (hi + w), 0.2, isl.z + Math.sin(a) * (hi + w));
          if (seg < 120) { const o = vo + seg * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
        }
      }
      const shore = new THREE.BufferGeometry();
      shore.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      shore.setAttribute('shoreEdge', new THREE.Float32BufferAttribute(edges, 1));
      shore.setIndex(idx); this.scene.add(new THREE.Mesh(shore, sh));
      const edge = new THREE.BufferGeometry();
      edge.setAttribute('position', new THREE.Float32BufferAttribute(fpts, 3));
      edge.setIndex(idx); this.scene.add(new THREE.Mesh(edge, foam));
    }
    buildClouds() {
      // Smooth flattened stratocumulus ellipsoids with warm sunlit tops and soft dusk violet-gray undersides
      const geo = new THREE.SphereGeometry(1, 14, 10), pos = geo.attributes.position;
      const cols = new Float32Array(pos.count * 3), topC = new THREE.Color(0xfff3df), botC = new THREE.Color(0x9a8c9d), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < 0) pos.setY(i, y * 0.45);
        c.copy(botC).lerp(topC, THREE.MathUtils.smoothstep(y, -0.55, 0.72));
        c.toArray(cols, i * 3);
      }
      geo.computeVertexNormals();
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, metalness: 0, flatShading: false });
      this.clouds = new THREE.InstancedMesh(geo, mat, 130);
      this.clouds.frustumCulled = false;
      this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.cloudGroups = []; this.cloudDummy = new THREE.Object3D();
      for (let i = 0; i < 26; i++) {
        const cl = { position: new THREE.Vector3(), puffs: [] };
        for (let p = 0; p < 5; p++) {
          const rx = this.random.range(-6, 6), rz = this.random.range(-15, 15);
          const sx = this.random.range(23, 39), sy = this.random.range(10, 18), sz = this.random.range(16, 28);
          const crown = p === 2 ? 1.25 : (p === 1 || p === 3) ? 1.05 : 0.8;
          cl.puffs.push({
            position: new THREE.Vector3((p - 2) * 32 + rx * 1.4, (crown - 0.9) * 8 + rx * 0.2, rz * 1.15),
            scale: new THREE.Vector3(sx * 1.55 * crown, sy * 0.48 * crown, sz * 1.25 * crown)
          });
        }
        cl.position.set(this.random.range(-2200, 2200), this.random.range(360, 560), this.random.range(-2100, 2100));
        cl.drift = this.random.range(1.5, 3.8);
        this.cloudGroups.push(cl);
      }
      this.updateCloudMatrices(); this.scene.add(this.clouds);
    }
    updateCloudMatrices() {
      let i = 0;
      for (const cl of this.cloudGroups) for (const p of cl.puffs) {
        this.cloudDummy.position.copy(cl.position).add(p.position);
        this.cloudDummy.scale.copy(p.scale); this.cloudDummy.updateMatrix();
        this.clouds.setMatrixAt(i++, this.cloudDummy.matrix);
      }
      this.clouds.instanceMatrix.needsUpdate = true;
    }
    buildRunway() {
      const rw = C.runway, asp = std(0x2a2f36, 0.94, false), wht = std(0xf3f1e9, 1, false), yel = std(0xe5b953, 0.9, false);
      this.airport = new THREE.Group();
      this.airport.position.set(rw.x, rw.height + 0.13, rw.z);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(rw.width, 0.18, rw.length), asp);
      strip.receiveShadow = true; this.airport.add(strip);
      // Apron pad + connecting taxiway outside runway safety zone (x >= +16..+96)
      const apron = new THREE.Mesh(new THREE.BoxGeometry(58, 0.16, 76), asp);
      apron.position.set(60, -0.01, 130); apron.receiveShadow = true;
      const twy = new THREE.Mesh(new THREE.BoxGeometry(28, 0.16, 16), asp);
      twy.position.set(28, -0.01, 130); twy.receiveShadow = true;
      const twyN = new THREE.Mesh(new THREE.BoxGeometry(14, 0.16, 180), asp);
      twyN.position.set(36, -0.01, 35); twyN.receiveShadow = true;
      this.airport.add(apron, twy, twyN);
      // Yellow taxiway centerline & apron stand markings
      const mkY = (w, l, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, l), yel); m.position.set(x, 0.11, z); m.receiveShadow = true; this.airport.add(m); };
      mkY(22, 0.65, 29, 130); mkY(0.65, 174, 36, 35); mkY(44, 0.6, 58, 130);
      mkY(0.55, 18, 52, 114); mkY(0.55, 18, 70, 114); mkY(0.55, 18, 52, 146);
      this.runwayMarkings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wht, 37);
      this.runwayMarkings.frustumCulled = false; this.runwayMarkings.receiveShadow = true;
      const dm = new THREE.Object3D(); let mi = 0;
      const mark = (w, l, x, z) => { dm.position.set(x, 0.13, z); dm.scale.set(w, 0.04, l); dm.updateMatrix(); this.runwayMarkings.setMatrixAt(mi++, dm.matrix); };
      for (let z = -250; z <= 250; z += 48) mark(0.9, 21, 0, z);
      for (const z of [-282, 282]) for (const x of [-11, -7, -3, 3, 7, 11]) mark(2.2, 18, x, z);
      mark(0.5, 598, -15, 0); mark(0.5, 598, 15, 0);
      for (const z of [200, 145, 90]) for (const s of [-1, 1]) { mark(2.4, 24, s * 7.6, z); mark(2.4, 24, s * 11, z); }
      this.runwayMarkings.instanceMatrix.needsUpdate = true;
      this.airport.add(this.runwayMarkings);
      this.runwayLights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 64);
      this.runwayLights.frustumCulled = false;
      const lc = new THREE.Color(); let li = 0; dm.scale.setScalar(1);
      const rwl = (x, y, z, col) => { dm.position.set(x, y, z); dm.updateMatrix(); this.runwayLights.setMatrixAt(li, dm.matrix); this.runwayLights.setColorAt(li++, lc.setHex(col)); };
      for (let z = -300; z <= 300; z += 30) for (const x of [-18.5, 18.5]) rwl(x, 0.6, z, 0xffc265);
      for (const z of [-302, 302]) for (let x = -15; x <= 15; x += 3) rwl(x, 0.4, z, 0x6affb7);
      this.runwayLights.instanceMatrix.needsUpdate = true; this.runwayLights.instanceColor.needsUpdate = true;
      this.airport.add(this.runwayLights); this.scene.add(this.airport);
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const g = cv.getContext('2d'); g.fillStyle = '#f4e9cf'; g.font = 'bold 76px sans-serif'; g.textAlign = 'center'; g.fillText('36', 64, 90);
      const nt = new THREE.CanvasTexture(cv); nt.encoding = THREE.sRGBEncoding;
      const num = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshStandardMaterial({ map: nt, transparent: true, roughness: 1 }));
      num.rotation.x = -Math.PI / 2; num.position.set(rw.x, rw.height + 0.3, rw.z + 248); num.receiveShadow = true;
      this.scene.add(num); this.runwayNumber = num;
      // Enlarged PAPI lights + luminous soft glow halos
      const gcv = document.createElement('canvas'); gcv.width = gcv.height = 64;
      const gg = gcv.getContext('2d'), gr = gg.createRadialGradient(32, 32, 2, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.38, 'rgba(255,255,255,0.48)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
      const gtx = new THREE.CanvasTexture(gcv); gtx.encoding = THREE.sRGBEncoding;
      this.papiLights = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.1, 1.15), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, side: THREE.DoubleSide }), 4);
      this.papiHalos = new THREE.InstancedMesh(new THREE.PlaneGeometry(5.2, 4.2), new THREE.MeshBasicMaterial({ map: gtx, color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), 4);
      this.papiLights.frustumCulled = this.papiHalos.frustumCulled = false;
      this.papiColor = new THREE.Color(); this.papiThresholds = [3.5, 3.17, 2.83, 2.5];
      for (let i = 0; i < 4; i++) {
        const hs = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.45, 1.6), std(0x2a3035, 0.85));
        hs.position.set(rw.x - 24.5 - i * 3.8, rw.height + 0.95, rw.z + 180); hs.castShadow = true;
        dm.position.set(hs.position.x, hs.position.y + 0.14, hs.position.z + 0.84); dm.scale.setScalar(1); dm.updateMatrix();
        this.papiLights.setMatrixAt(i, dm.matrix);
        dm.position.z += 0.08; dm.updateMatrix(); this.papiHalos.setMatrixAt(i, dm.matrix);
        const col = i < 2 ? 0xe63946 : 0xfff2dc;
        this.papiLights.setColorAt(i, this.papiColor.setHex(col));
        this.papiHalos.setColorAt(i, this.papiColor.setHex(col));
        this.scene.add(hs);
      }
      this.papiLights.instanceMatrix.needsUpdate = this.papiLights.instanceColor.needsUpdate = true;
      this.papiHalos.instanceMatrix.needsUpdate = this.papiHalos.instanceColor.needsUpdate = true;
      this.papiRedCount = 2; this.scene.add(this.papiLights, this.papiHalos);
      // Hangar, fuel depot tanks, pump shed & runway-side perimeter markers/shrubs
      const hangar = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.BoxGeometry(39, 15, 29), std(0xc7be9e, 0.85)); shell.position.y = 7.5; shell.castShadow = true;
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 34, 3), std(0x6c7f78, 0.85));
      roof.rotation.set(Math.PI / 2, 0, Math.PI / 2); roof.scale.set(1, 0.6, 1); roof.position.y = 13;
      const door = new THREE.Mesh(new THREE.BoxGeometry(30, 11, 0.3), std(0x344a49, 0.8)); door.position.set(0, 5.5, 14.7);
      hangar.add(shell, roof, door);
      hangar.position.set(rw.x + 94, this.heightAt(rw.x + 94, rw.z + 135), rw.z + 135);
      this.scene.add(hangar);
      const tankMat = std(0xe6dfd0, 0.55), bandMat = std(C.palette.red, 0.6), darkM = std(0x313a40, 0.8);
      for (let t = 0; t < 2; t++) {
        const tx = rw.x + 76 + t * 14, tz = rw.z + 82, ty = this.heightAt(tx, tz);
        const tk = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 15, 10), tankMat);
        tk.rotation.x = Math.PI / 2; tk.position.set(tx, ty + 4.4, tz); tk.castShadow = true;
        const bd = new THREE.Mesh(new THREE.CylinderGeometry(3.52, 3.52, 2.2, 10), bandMat);
        bd.rotation.x = Math.PI / 2; bd.position.copy(tk.position);
        const cr = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.2, 11), darkM); cr.position.set(tx, ty + 1.1, tz);
        this.scene.add(tk, bd, cr);
      }
      const shed = new THREE.Mesh(new THREE.BoxGeometry(10, 5.5, 8), std(0x9f9782, 0.85));
      shed.position.set(rw.x + 64, this.heightAt(rw.x + 64, rw.z + 178) + 2.75, rw.z + 178); shed.castShadow = true;
      this.scene.add(shed);
      // Left-side distance markers & perimeter coastal scrub strictly outside safety zone (|x-rw.x| >= 34)
      const coneG = new THREE.ConeGeometry(1.1, 2.2, 6), shrubG = new THREE.IcosahedronGeometry(3.2, 1), shrubM = std(0x4c6138, 1);
      for (const z of [260, 215, 145, 75, -10]) {
        const mx = rw.x - 35, mz = rw.z + z, my = this.heightAt(mx, mz);
        const mk = new THREE.Mesh(coneG, bandMat); mk.position.set(mx, my + 1.1, mz); this.scene.add(mk);
      }
      for (const [ox, oz, sc] of [[-58, 255, 1.1], [-72, 210, 1.4], [-64, 150, 0.95], [-80, 95, 1.3], [-56, 30, 1.0], [54, 240, 1.05], [72, 215, 1.3], [92, 195, 1.1], [68, 45, 1.2]]) {
        const sx = rw.x + ox, sz = rw.z + oz, sy = this.heightAt(sx, sz);
        const sb = new THREE.Mesh(shrubG, shrubM); sb.position.set(sx, sy + 1.6 * sc, sz); sb.scale.set(sc * 1.25, sc * 0.72, sc); sb.castShadow = true; this.scene.add(sb);
      }
      this.buildControlTower();
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 17, 6), std(0xc2b995, 0.8));
      mast.position.set(rw.x + 44, rw.height + 9.5, rw.z - 35);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.6, 7, 8, 1, true), new THREE.MeshStandardMaterial({ color: C.palette.red, side: THREE.DoubleSide, flatShading: true }));
      sock.rotation.z = Math.PI / 2 - 0.17; sock.position.set(mast.position.x + 3.5, mast.position.y + 8, mast.position.z);
      this.scene.add(mast, sock); this.windsock = sock;
      // Second approach-end windsock on west side outside safety zone
      const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 12, 6), std(0xc2b995, 0.8));
      m2.position.set(rw.x - 44, rw.height + 6, rw.z + 230);
      const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.3, 5.5, 8, 1, true), new THREE.MeshStandardMaterial({ color: C.palette.red, side: THREE.DoubleSide, flatShading: true }));
      s2.rotation.z = Math.PI / 2 - 0.18; s2.position.set(m2.position.x + 2.8, m2.position.y + 5.5, m2.position.z);
      this.scene.add(m2, s2);
    }
    buildControlTower() {
      const rw = C.runway, tw = new THREE.Group();
      const st = std(0x9a927e, 0.9), dk = new THREE.MeshStandardMaterial({ color: 0x243f45, roughness: 0.5, metalness: 0.15 });
      const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); tw.add(o); };
      add(new THREE.BoxGeometry(8, 17, 8), st, 0, 8.5, 0);
      add(new THREE.BoxGeometry(13, 0.65, 12), dk, 0, 17, 0);
      add(new THREE.BoxGeometry(10, 4.8, 9), new THREE.MeshStandardMaterial({ color: 0x153e49, roughness: 0.22, metalness: 0.28 }), 0, 19.7, 0);
      add(new THREE.BoxGeometry(13, 0.6, 12), dk, 0, 22.4, 0);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.35, 5, 9.2), st, s * 4.8, 19.7, 0);
      add(new THREE.CylinderGeometry(0.1, 0.15, 6, 5), dk, 0, 25.5, 0);
      tw.position.set(rw.x + 52, this.heightAt(rw.x + 52, rw.z - 52), rw.z - 52);
      tw.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      this.scene.add(tw); this.controlTower = tw;
    }
    buildClutter() {
      const pines = [], broad = [], rocks = [];
      for (let a = 0; a < 3200; a++) {
        const isl = ISLANDS[a % ISLANDS.length];
        const x = isl.x + this.random.range(-isl.r, isl.r), z = isl.z + this.random.range(-isl.r, isl.r), y = this.heightAt(x, z);
        if (y < 10 || (Math.abs(x - C.runway.x) < 130 && Math.abs(z - C.runway.z) < 395)) continue;
        const cl = Math.sin(x * 0.015) * Math.cos(z * 0.019) + Math.sin((x + z) * 0.009) * 0.5;
        const it = { x, y, z, scale: this.random.range(0.8, 1.4), angle: this.random() * Math.PI * 2, hue: this.random.range(-0.025, 0.025) };
        if (y < 38 && cl > -0.1 && broad.length < 230) broad.push(it);
        else if (y >= 25 && y < 87 && cl > -0.45 && pines.length < 340) pines.push(it);
        else if (y > 50 && rocks.length < 100) rocks.push(it);
      }
      const dm = new THREE.Object3D();
      const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(4.2, 15, 6), std(0xffffff, 1), pines.length);
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.65, 6, 5), std(0x65503b, 0.9), pines.length);
      pines.forEach((t, i) => {
        dm.position.set(t.x, t.y + 10 * t.scale, t.z); dm.rotation.set(0, t.angle, 0); dm.scale.setScalar(t.scale); dm.updateMatrix(); crowns.setMatrixAt(i, dm.matrix);
        dm.position.y = t.y + 3 * t.scale; dm.updateMatrix(); trunks.setMatrixAt(i, dm.matrix);
        crowns.setColorAt(i, new THREE.Color(0x384d34).offsetHSL(t.hue, 0, t.hue * 0.6));
      });
      crowns.castShadow = true; this.scene.add(crowns, trunks);
      const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4.3, 1), std(0xffffff, 1), broad.length * 3);
      const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.9, 8, 6), std(0x6d5849, 0.9), broad.length);
      broad.forEach((t, i) => {
        dm.position.set(t.x, t.y + 4 * t.scale, t.z); dm.rotation.set(0, t.angle, 0); dm.scale.setScalar(t.scale); dm.updateMatrix(); branches.setMatrixAt(i, dm.matrix);
        for (let k = 0; k < 3; k++) {
          const a = k * Math.PI * 2 / 3 + t.angle;
          dm.position.set(t.x + Math.cos(a) * 2.8 * t.scale, t.y + (8.3 + k * 0.7) * t.scale, t.z + Math.sin(a) * 2.8 * t.scale);
          dm.scale.set(t.scale * 1.15, t.scale * 0.95, t.scale); dm.updateMatrix(); leaves.setMatrixAt(i * 3 + k, dm.matrix);
          leaves.setColorAt(i * 3 + k, new THREE.Color(0x5c7042).offsetHSL(t.hue, 0, t.hue * 0.7));
        }
      });
      leaves.castShadow = leaves.receiveShadow = true; this.scene.add(leaves, branches);
      const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4, 0), std(C.palette.rock, 1), rocks.length);
      rocks.forEach((r, i) => {
        dm.position.set(r.x, r.y + r.scale, r.z); dm.rotation.set(0.1, r.angle, 0.2);
        dm.scale.set(r.scale * 1.5, r.scale, r.scale); dm.updateMatrix(); stones.setMatrixAt(i, dm.matrix);
      });
      stones.castShadow = true; this.scene.add(stones);
      for (const m of [crowns, trunks, leaves, branches, stones]) {
        m.frustumCulled = false; m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    }
    buildLighthouse() {
      const x = -910, z = -160, base = this.heightAt(x, z), tw = new THREE.Group();
      const wh = std(0xeee3c7, 0.8), rd = std(0xb94035, 0.8);
      const add = (g, m, y) => { const o = new THREE.Mesh(g, m); o.position.y = y; tw.add(o); };
      add(new THREE.CylinderGeometry(3.8, 6, 31, 10), wh, 15.5);
      for (const h of [7, 17, 27]) add(new THREE.CylinderGeometry(6 - (h + 2.5) * 2.2 / 31 + 0.02, 6 - (h - 2.5) * 2.2 / 31 + 0.02, 5, 10), rd, h);
      add(new THREE.CylinderGeometry(6, 6, 1, 10), rd, 30);
      add(new THREE.CylinderGeometry(3.5, 3.5, 5, 8), new THREE.MeshBasicMaterial({ color: 0xffd780, toneMapped: false }), 33);
      const b = new THREE.PointLight(0xffb65d, 1.4, 65, 2); b.position.y = 33; tw.add(b);
      add(new THREE.ConeGeometry(5.3, 4, 10), rd, 37);
      tw.position.set(x, base, z);
      tw.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(tw); return tw;
    }
    updateView(camera, s) {
      this.water.position.set(camera.position.x, 0, camera.position.z);
      this.sky.position.copy(camera.position);
      this.sunDisc.position.copy(this.sunDirection).multiplyScalar(3900).add(camera.position);
      const ga = C.degrees(Math.atan2(s.position.y - (C.runway.height + 1.03), Math.hypot(s.position.x - C.runway.x + 29, s.position.z - C.runway.z - 180)));
      let red = 0; for (const th of this.papiThresholds) if (ga < th) red++;
      if (red !== this.papiRedCount) {
        for (let i = 0; i < 4; i++) {
          const col = i < red ? 0xe63946 : 0xfff2dc;
          this.papiLights.setColorAt(i, this.papiColor.setHex(col));
          this.papiHalos.setColorAt(i, this.papiColor.setHex(col));
        }
        this.papiLights.instanceColor.needsUpdate = this.papiHalos.instanceColor.needsUpdate = true;
        this.papiRedCount = red;
      }
      const gnd = this.heightAt(s.position.x, s.position.z), clr = Math.max(0, s.position.y - gnd), ext = C.clamp(38 + clr * 0.75, 48, 160);
      const sc = this.sunlight.shadow.camera;
      if (Math.abs(sc.right - ext) > 0.5) { sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.updateProjectionMatrix(); }
      const step = (sc.right - sc.left) / this.sunlight.shadow.mapSize.x;
      this.shadowCenter.copy(s.position).addScaledVector(this.sunDirection, -clr / this.sunDirection.y * 0.5);
      const h = this.shadowCenter.dot(this.shadowRight), v = this.shadowCenter.dot(this.shadowUp);
      this.shadowCenter.addScaledVector(this.shadowRight, Math.round(h / step) * step - h);
      this.shadowCenter.addScaledVector(this.shadowUp, Math.round(v / step) * step - v);
      this.sunlight.target.position.copy(this.shadowCenter);
      this.sunlight.position.copy(this.shadowCenter).addScaledVector(this.sunDirection, 650);
    }
    isRunway(x, z) { return Math.abs(x - C.runway.x) < C.runway.width / 2 && Math.abs(z - C.runway.z) < C.runway.length / 2; }
    update(dt, time) {
      this.time = time;
      this.water.material.uniforms.time.value = time;
      this.shallowsMaterial.uniforms.time.value = time;
      if (dt > 0) {
        let i = 0;
        for (const cl of this.cloudGroups) {
          cl.position.x += cl.drift * dt;
          if (cl.position.x > 2300) cl.position.x = -2300;
          for (const p of cl.puffs) this.clouds.instanceMatrix.array[i++ * 16 + 12] = cl.position.x + p.position.x;
        }
        this.clouds.instanceMatrix.needsUpdate = true;
      }
      this.windsock.rotation.y = Math.sin(time * 0.8) * 0.12;
    }
  };
})();
