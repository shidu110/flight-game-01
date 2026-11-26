// Job: Build seeded islands, batched scenery, sky, water and runway aids.
// Exports: KR.World.
(function () {
  'use strict';
  const C = KR.Config;
  const ISLANDS = [
    { x: -420, z: 320, r: 720, h: 112 }, { x: 930, z: -760, r: 285, h: 44 },
    { x: 1010, z: 1010, r: 360, h: 63 }, { x: -1360, z: -1100, r: 470, h: 79 },
    { x: 350, z: 1460, r: 230, h: 31 }, { x: -1210, z: 1230, r: 175, h: 20 }
  ];
  KR.World = class KestrelWorld {
    constructor(scene, random) {
      this.scene = scene;
      this.random = random;
      this.time = 0;
      this.waterLevel = C.waterLevel;
      this.islands = ISLANDS;
      this.heightAt = this.heightAt.bind(this);
      this.buildSky();
      this.buildTerrain();
      this.buildWater();
      this.buildClouds();
      this.buildRunway();
      this.buildClutter();
      this.lighthouse = this.buildLighthouse();
    }
    rawHeight(x, z) {
      let total = -8;
      for (let i = 0; i < ISLANDS.length; i++) {
        const island = ISLANDS[i];
        const distance = Math.hypot(x - island.x, z - island.z) / island.r;
        const edge = 1 - distance;
        if (edge > 0) {
          const peaks = Math.sin(i * 4.7) * 13;
          total += island.h * Math.pow(edge, 0.72) * (0.84 + peaks / 100) +
            Math.sin(x * 0.027 + i) * Math.cos(z * 0.021 - i) * 6 * edge;
        }
      }
      const rw = C.runway;
      const corridorDistance = Math.hypot(Math.max(0, Math.abs(x - rw.x) - 80), Math.max(0, Math.abs(z - rw.z) - 620));
      const corridor = 1 - THREE.MathUtils.smoothstep(corridorDistance, 0, 110);
      total = THREE.MathUtils.lerp(total, Math.min(total, rw.height), corridor);
      const outside = Math.hypot(Math.max(0, Math.abs(x - rw.x) - 65), Math.max(0, Math.abs(z - rw.z) - 350));
      const airport = 1 - THREE.MathUtils.smoothstep(outside, 0, 135);
      return THREE.MathUtils.lerp(total, rw.height, airport);
    }
    heightAt(x, z) { return Math.max(0, this.rawHeight(x, z)); }
    buildSky() {
      this.sunDirection = new THREE.Vector3(-0.34, 0.25, 0.9).normalize();
      const horizon = new THREE.Color(C.palette.horizon);
      const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16),
        new THREE.ShaderMaterial({
          side: THREE.BackSide, depthWrite: false, fog: false,
          uniforms: { sunDirection: { value: this.sunDirection }, horizonColor: { value: horizon }, zenithColor: { value: new THREE.Color(0x547b88) } },
          vertexShader: 'varying vec3 worldDirection; void main(){ worldDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: 'varying vec3 worldDirection; uniform vec3 sunDirection; uniform vec3 horizonColor; uniform vec3 zenithColor; void main(){ vec3 ray=normalize(worldDirection); float height=pow(max(ray.y,0.0),0.55); vec3 color=mix(horizonColor,zenithColor,height); float glow=pow(max(dot(ray,sunDirection),0.0),26.0)*smoothstep(0.0,0.12,ray.y); color+=vec3(0.22,0.09,0.015)*glow; gl_FragColor=vec4(color,1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\ngl_FragColor.rgb=mix(linearToOutputTexel(vec4(horizonColor,1.0)).rgb,gl_FragColor.rgb,smoothstep(0.0,0.12,ray.y)); }'
        }));
      sky.renderOrder = -10;
      this.scene.add(sky);
      this.sky = sky;
      this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(155 * 3900 / 19000, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffd494, fog: false, toneMapped: false, depthWrite: false }));
      this.sunDisc.position.copy(this.sunDirection).multiplyScalar(3900);
      this.scene.add(this.sunDisc);
      this.scene.add(new THREE.HemisphereLight(0xb7cbd0, 0x65503b, 0.4));
      const sunlight = new THREE.DirectionalLight(0xffb86c, 2.0);
      sunlight.position.copy(this.sunDirection).multiplyScalar(650);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.set(1024, 1024);
      sunlight.shadow.camera.near = 1;
      sunlight.shadow.camera.far = 1100;
      sunlight.shadow.normalBias = 0.025;
      sunlight.shadow.bias = -0.0005;
      sunlight.shadow.radius = 2;
      this.sunlight = sunlight;
      this.shadowCenter = new THREE.Vector3();
      this.shadowRight = new THREE.Vector3(0, 1, 0).cross(this.sunDirection).normalize();
      this.shadowUp = new THREE.Vector3().crossVectors(this.sunDirection, this.shadowRight).normalize();
      this.scene.add(sunlight, sunlight.target);
      this.scene.fog = new THREE.FogExp2(C.palette.horizon, 0.00032);
    }
    buildTerrain() {
      const geometry = new THREE.PlaneGeometry(C.seaSize, C.seaSize, 180, 180);
      geometry.rotateX(-Math.PI / 2);
      const position = geometry.attributes.position;
      for (let index = 0; index < position.count; index++) {
        position.setY(index, this.rawHeight(position.getX(index), position.getZ(index)));
      }
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      flat.computeVertexNormals();
      const colors = new Float32Array(flat.attributes.position.count * 3);
      const color = new THREE.Color();
      const grass = new THREE.Color(C.palette.grass), forest = new THREE.Color(C.palette.forest), rock = new THREE.Color(C.palette.rock);
      const vertices = flat.attributes.position;
      for (let index = 0; index < vertices.count; index += 3) {
        const height = (vertices.getY(index) + vertices.getY(index + 1) + vertices.getY(index + 2)) / 3;
        const slope = flat.attributes.normal.getY(index);
        color.setHex(C.palette.sand).lerp(grass, THREE.MathUtils.smoothstep(height, 3, 11));
        color.lerp(forest, THREE.MathUtils.smoothstep(height, 25, 79));
        color.lerp(rock, (1 - THREE.MathUtils.smoothstep(slope, 0.72, 0.94)) * THREE.MathUtils.smoothstep(height, 5, 18));
        color.multiplyScalar(0.91 + this.random() * 0.15);
        for (let corner = 0; corner < 3; corner++) color.toArray(colors, (index + corner) * 3);
      }
      flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const terrain = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
      terrain.receiveShadow = true;
      terrain.castShadow = true;
      this.scene.add(terrain);
      this.terrain = terrain;
    }
    buildCausticTexture() {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      const image = context.createImageData(size, size);
      const cells = [];
      for (let row = 0; row < 4; row++) {
        for (let column = 0; column < 4; column++) {
          cells.push([(column + 0.5) * 32 + Math.sin(row * 7 + column * 3) * 8, (row + 0.5) * 32 + Math.cos(column * 5 + row * 2) * 8]);
        }
      }
      for (let pixelY = 0; pixelY < size; pixelY++) {
        for (let pixelX = 0; pixelX < size; pixelX++) {
          const sampleX = (pixelX + size + Math.sin(pixelY / size * Math.PI * 4) * 5) % size;
          const sampleY = (pixelY + size + Math.sin(pixelX / size * Math.PI * 4) * 5) % size;
          let nearest = Infinity, second = Infinity;
          for (const cell of cells) {
            const distanceX = Math.abs(sampleX - cell[0]), distanceY = Math.abs(sampleY - cell[1]);
            const wrappedX = Math.min(distanceX, size - distanceX), wrappedY = Math.min(distanceY, size - distanceY);
            const distance = wrappedX * wrappedX + wrappedY * wrappedY;
            if (distance < nearest) { second = nearest; nearest = distance; }
            else if (distance < second) second = distance;
          }
          const gap = Math.sqrt(second) - Math.sqrt(nearest);
          const offset = (pixelY * size + pixelX) * 4;
          image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = 255;
          image.data[offset + 3] = Math.round(255 * Math.exp(-gap * gap / 2));
        }
      }
      context.putImageData(image, 0, 0);
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    }
    buildWater() {
      const geometry = new THREE.CircleGeometry(18000, 128);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.ShaderMaterial({
        fog: true,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, sunDirection: { value: this.sunDirection }, deepColor: { value: new THREE.Color(C.palette.seaDeep) }, seaColor: { value: new THREE.Color(C.palette.sea) } }]),
        vertexShader: 'varying vec3 surface;\n#include <fog_pars_vertex>\nvoid main(){ surface=(modelMatrix*vec4(position,1.0)).xyz; vec4 mvPosition=viewMatrix*vec4(surface,1.0); gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
        fragmentShader: [
          'uniform float time; uniform vec3 sunDirection; uniform vec3 deepColor; uniform vec3 seaColor; varying vec3 surface;',
          '#include <fog_pars_fragment>',
          'float hash(vec2 point){ return fract(sin(dot(point,vec2(127.1,311.7)))*43758.5453); }',
          'float noise(vec2 point){ vec2 cell=floor(point); vec2 blend=fract(point); blend=blend*blend*(3.0-2.0*blend); return mix(mix(hash(cell),hash(cell+vec2(1.0,0.0)),blend.x),mix(hash(cell+vec2(0.0,1.0)),hash(cell+vec2(1.0)),blend.x),blend.y); }',
          'void main(){ vec2 drift=vec2(time*0.025,-time*0.018); float swell=noise(surface.xz*0.004+drift)*0.65+noise(surface.xz*0.011-drift)*0.35; vec3 color=mix(deepColor,seaColor,0.55+swell*0.25);',
          'vec3 viewDirection=normalize(cameraPosition-surface); vec3 normal=normalize(vec3((noise(surface.xz*0.018+drift)-0.5)*0.10,1.0,(noise(surface.zx*0.021-drift)-0.5)*0.10)); vec3 halfVector=normalize(viewDirection+sunDirection); float reflection=pow(max(dot(normal,halfVector),0.0),160.0); float path=pow(max(dot(normalize(surface.xz-cameraPosition.xz),normalize(sunDirection.xz)),0.0),34.0); float glint=noise(surface.xz*0.2+drift*4.0); color+=vec3(0.75,0.34,0.07)*(reflection*0.9+path*pow(glint,5.0)*0.24); gl_FragColor=vec4(color,1.0);',
          '#include <tonemapping_fragment>', '#include <encodings_fragment>', '#include <fog_fragment>', '}'
        ].join('\n')
      });
      this.water = new THREE.Mesh(geometry, material);
      this.scene.add(this.water);
      this.causticTexture = this.buildCausticTexture();
      const shallows = new THREE.ShaderMaterial({
        fog: true, transparent: true, side: THREE.DoubleSide, depthWrite: false,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, shallowColor: { value: new THREE.Color(0x2e7d82) }, causticColor: { value: new THREE.Color(C.palette.horizon) } }]),
        vertexShader: 'varying vec2 surfaceUv; varying float shoreAcross; attribute float shoreEdge;\n#include <fog_pars_vertex>\nvoid main(){ surfaceUv=(modelMatrix*vec4(position,1.0)).xz; shoreAcross=shoreEdge; vec4 mvPosition=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
        fragmentShader: [
          'uniform float time; uniform sampler2D causticMap; uniform vec3 shallowColor; uniform vec3 causticColor; varying vec2 surfaceUv; varying float shoreAcross;',
          '#include <fog_pars_fragment>',
          'void main(){ float firstLayer=texture2D(causticMap,surfaceUv/48.0+vec2(time*0.018,-time*0.013)).a*0.07; float secondLayer=texture2D(causticMap,vec2(surfaceUv.y,-surfaceUv.x)/76.0+vec2(-time*0.011,time*0.015)).a*0.045;',
          'float edgeFade=smoothstep(0.0,0.18,shoreAcross)*(1.0-smoothstep(0.65,1.0,shoreAcross)); vec3 color=mix(shallowColor,causticColor,(firstLayer+secondLayer)*edgeFade); gl_FragColor=vec4(color,0.68);',
          '#include <tonemapping_fragment>', '#include <encodings_fragment>', '#include <fog_fragment>', '}'
        ].join('\n')
      });
      shallows.uniforms.causticMap = { value: this.causticTexture };
      this.shallowsMaterial = shallows;
      const foam = new THREE.MeshBasicMaterial({ color: 0xf5f1e5, transparent: true, opacity: 0.66, side: THREE.DoubleSide, depthWrite: false });
      const points = [], foamPoints = [], indices = [], shoreEdges = [];
      for (const island of ISLANDS) {
        const vertexOffset = points.length / 3;
        for (let segment = 0; segment <= 120; segment++) {
          const angle = segment / 120 * Math.PI * 2;
          let low = 0, high = island.r * 1.2;
          for (let step = 0; step < 13; step++) {
            const radius = (low + high) / 2;
            if (this.rawHeight(island.x + Math.cos(angle) * radius, island.z + Math.sin(angle) * radius) > 0.15) low = radius;
            else high = radius;
          }
          for (const width of [-2, 22]) points.push(island.x + Math.cos(angle) * (high + width), 0.12, island.z + Math.sin(angle) * (high + width));
          shoreEdges.push(0, 1);
          for (const width of [-0.8, 1.3]) foamPoints.push(island.x + Math.cos(angle) * (high + width), 0.2, island.z + Math.sin(angle) * (high + width));
          if (segment < 120) {
            const offset = vertexOffset + segment * 2;
            indices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
          }
        }
      }
      const shore = new THREE.BufferGeometry();
      shore.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      shore.setAttribute('shoreEdge', new THREE.Float32BufferAttribute(shoreEdges, 1));
      shore.setIndex(indices);
      this.scene.add(new THREE.Mesh(shore, shallows));
      const edge = new THREE.BufferGeometry();
      edge.setAttribute('position', new THREE.Float32BufferAttribute(foamPoints, 3));
      edge.setIndex(indices);
      this.scene.add(new THREE.Mesh(edge, foam));
    }
    buildClouds() {
      const material = new THREE.MeshStandardMaterial({ color: 0xffe8c7, roughness: 1, flatShading: true });
      const geometry = new THREE.IcosahedronGeometry(1, 0);
      this.clouds = new THREE.InstancedMesh(geometry, material, 130);
      this.clouds.frustumCulled = false;
      this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.cloudGroups = [];
      this.cloudDummy = new THREE.Object3D();
      for (let index = 0; index < 26; index++) {
        const cloud = { position: new THREE.Vector3(), puffs: [] };
        for (let puff = 0; puff < 5; puff++) {
          const position = new THREE.Vector3(puff * 23 - 46, this.random.range(-6, 6), this.random.range(-15, 15));
          const scale = new THREE.Vector3(this.random.range(23, 39), this.random.range(10, 18), this.random.range(16, 28));
          cloud.puffs.push({ position, scale });
        }
        cloud.position.set(this.random.range(-2200, 2200), this.random.range(360, 560), this.random.range(-2100, 2100));
        cloud.drift = this.random.range(1.5, 3.8);
        this.cloudGroups.push(cloud);
      }
      this.updateCloudMatrices();
      this.scene.add(this.clouds);
    }
    updateCloudMatrices() {
      let index = 0;
      for (const cloud of this.cloudGroups) {
        for (const puff of cloud.puffs) {
          this.cloudDummy.position.copy(cloud.position).add(puff.position);
          this.cloudDummy.scale.copy(puff.scale);
          this.cloudDummy.updateMatrix();
          this.clouds.setMatrixAt(index++, this.cloudDummy.matrix);
        }
      }
      this.clouds.instanceMatrix.needsUpdate = true;
    }
    buildRunway() {
      const rw = C.runway;
      this.airport = new THREE.Group();
      this.airport.position.set(rw.x, rw.height + 0.13, rw.z);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(rw.width, 0.18, rw.length), new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.94 }));
      strip.receiveShadow = true;
      this.airport.add(strip);
      const white = new THREE.MeshStandardMaterial({ color: 0xf3f1e9, roughness: 1 });
      this.runwayMarkings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), white, 37);
      this.runwayMarkings.frustumCulled = false;
      this.runwayMarkings.receiveShadow = true;
      const dummy = new THREE.Object3D();
      let markingIndex = 0;
      const marking = (width, length, x, z) => {
        dummy.position.set(x, 0.13, z);
        dummy.scale.set(width, 0.04, length);
        dummy.updateMatrix();
        this.runwayMarkings.setMatrixAt(markingIndex++, dummy.matrix);
      };
      for (let z = -250; z <= 250; z += 48) marking(0.9, 21, 0, z);
      for (const z of [-282, 282]) {
        for (const x of [-11, -7, -3, 3, 7, 11]) marking(2.2, 18, x, z);
      }
      marking(0.5, 598, -15, 0); marking(0.5, 598, 15, 0);
      for (const z of [200, 145, 90]) {
        for (const side of [-1, 1]) {
          marking(2.4, 24, side * 7.6, z);
          marking(2.4, 24, side * 11, z);
        }
      }
      this.runwayMarkings.instanceMatrix.needsUpdate = true;
      this.airport.add(this.runwayMarkings);
      const lampGeometry = new THREE.SphereGeometry(0.6, 6, 4);
      this.runwayLights = new THREE.InstancedMesh(lampGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 64);
      this.runwayLights.frustumCulled = false;
      const lightColor = new THREE.Color();
      let lightIndex = 0;
      dummy.scale.setScalar(1);
      const runwayLight = (x, y, z, color) => {
        dummy.position.set(x, y, z); dummy.updateMatrix();
        this.runwayLights.setMatrixAt(lightIndex, dummy.matrix);
        this.runwayLights.setColorAt(lightIndex++, lightColor.setHex(color));
      };
      for (let z = -300; z <= 300; z += 30) {
        for (const x of [-18.5, 18.5]) runwayLight(x, 0.6, z, 0xffc265);
      }
      for (const z of [-302, 302]) {
        for (let x = -15; x <= 15; x += 3) runwayLight(x, 0.4, z, 0x6affb7);
      }
      this.runwayLights.instanceMatrix.needsUpdate = true;
      this.runwayLights.instanceColor.needsUpdate = true;
      this.airport.add(this.runwayLights);
      this.scene.add(this.airport);
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const context = canvas.getContext('2d');
      context.fillStyle = '#f4e9cf'; context.font = 'bold 76px sans-serif'; context.textAlign = 'center'; context.fillText('36', 64, 90);
      const numberTexture = new THREE.CanvasTexture(canvas);
      numberTexture.encoding = THREE.sRGBEncoding;
      const number = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshStandardMaterial({ map: numberTexture, transparent: true, roughness: 1 }));
      number.rotation.x = -Math.PI / 2;
      number.position.set(rw.x, rw.height + 0.3, rw.z + 248);
      number.receiveShadow = true;
      this.scene.add(number);
      this.runwayNumber = number;
      this.papiLights = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.35, 0.65), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, side: THREE.DoubleSide }), 4);
      this.papiLights.frustumCulled = false;
      this.papiColor = new THREE.Color();
      this.papiThresholds = [3.5, 3.17, 2.83, 2.5];
      for (let index = 0; index < 4; index++) {
        const housing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.25, 1.5), new THREE.MeshStandardMaterial({ color: 0x30363a, roughness: 0.85 }));
        housing.position.set(rw.x - 24 - index * 3.3, rw.height + 0.9, rw.z + 180);
        housing.castShadow = true;
        dummy.position.copy(housing.position); dummy.position.y += 0.13; dummy.position.z += 0.77;
        dummy.updateMatrix(); this.papiLights.setMatrixAt(index, dummy.matrix);
        this.papiLights.setColorAt(index, this.papiColor.setHex(index < 2 ? 0xe63946 : 0xfff2dc));
        this.scene.add(housing);
      }
      this.papiLights.instanceMatrix.needsUpdate = true;
      this.papiLights.instanceColor.needsUpdate = true;
      this.papiRedCount = 2;
      this.scene.add(this.papiLights);
      const hangar = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.BoxGeometry(39, 15, 29), new THREE.MeshStandardMaterial({ color: 0xc7be9e, flatShading: true }));
      shell.position.y = 7.5; shell.castShadow = true;
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 34, 3), new THREE.MeshStandardMaterial({ color: 0x6c7f78, flatShading: true }));
      roof.rotation.x = Math.PI / 2; roof.rotation.z = Math.PI / 2;
      roof.scale.set(1, 0.6, 1); roof.position.y = 13;
      const door = new THREE.Mesh(new THREE.BoxGeometry(30, 11, 0.3), new THREE.MeshStandardMaterial({ color: 0x344a49 }));
      door.position.set(0, 5.5, 14.7);
      hangar.add(shell, roof, door);
      hangar.position.set(rw.x + 94, this.heightAt(rw.x + 94, rw.z + 135), rw.z + 135);
      this.scene.add(hangar);
      this.buildControlTower();
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 17, 6), new THREE.MeshStandardMaterial({ color: 0xc2b995 }));
      mast.position.set(rw.x + 44, rw.height + 9.5, rw.z - 35);
      this.scene.add(mast);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.6, 7, 8, 1, true), new THREE.MeshStandardMaterial({ color: C.palette.red, side: THREE.DoubleSide, flatShading: true }));
      sock.rotation.z = Math.PI / 2 - 0.17;
      sock.position.set(mast.position.x + 3.5, mast.position.y + 8, mast.position.z);
      this.scene.add(sock);
      this.windsock = sock;
    }
    buildControlTower() {
      const rw = C.runway;
      const tower = new THREE.Group();
      const structure = new THREE.MeshStandardMaterial({ color: 0x9a927e, flatShading: true, roughness: 0.9 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x243f45, roughness: 0.5, metalness: 0.15 });
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(8, 17, 8), structure);
      shaft.position.y = 8.5;
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(13, 0.65, 12), dark);
      balcony.position.y = 17;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(10, 4.8, 9), new THREE.MeshStandardMaterial({ color: 0x153e49, roughness: 0.22, metalness: 0.28 }));
      cab.position.y = 19.7;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(13, 0.6, 12), dark);
      roof.position.y = 22.4;
      tower.add(shaft, balcony, cab, roof);
      for (const side of [-1, 1]) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5, 9.2), structure);
        mullion.position.set(side * 4.8, 19.7, 0);
        tower.add(mullion);
      }
      const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 6, 5), dark);
      aerial.position.y = 25.5;
      tower.add(aerial);
      tower.position.set(rw.x + 52, this.heightAt(rw.x + 52, rw.z - 52), rw.z - 52);
      tower.traverse((object) => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
      this.scene.add(tower);
      this.controlTower = tower;
    }
    buildClutter() {
      const pines = [], broadleaf = [], rocks = [];
      for (let attempt = 0; attempt < 3200; attempt++) {
        const island = ISLANDS[attempt % ISLANDS.length];
        const x = island.x + this.random.range(-island.r, island.r);
        const z = island.z + this.random.range(-island.r, island.r);
        const y = this.heightAt(x, z);
        const airport = Math.abs(x - C.runway.x) < 130 && Math.abs(z - C.runway.z) < 395;
        if (y < 10 || airport) continue;
        const cluster = Math.sin(x * 0.015) * Math.cos(z * 0.019) + Math.sin((x + z) * 0.009) * 0.5;
        const item = { x, y, z, scale: this.random.range(0.8, 1.4), angle: this.random() * Math.PI * 2, hue: this.random.range(-0.025, 0.025) };
        if (y < 38 && cluster > -0.1 && broadleaf.length < 230) broadleaf.push(item);
        else if (y >= 25 && y < 87 && cluster > -0.45 && pines.length < 340) pines.push(item);
        else if (y > 50 && rocks.length < 100) rocks.push(item);
      }
      const dummy = new THREE.Object3D();
      const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(4.2, 15, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 }), pines.length);
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.65, 6, 5), new THREE.MeshStandardMaterial({ color: 0x65503b, flatShading: true }), pines.length);
      pines.forEach((tree, index) => {
        dummy.position.set(tree.x, tree.y + 10 * tree.scale, tree.z);
        dummy.rotation.set(0, tree.angle, 0); dummy.scale.setScalar(tree.scale); dummy.updateMatrix(); crowns.setMatrixAt(index, dummy.matrix);
        dummy.position.y = tree.y + 3 * tree.scale; dummy.updateMatrix(); trunks.setMatrixAt(index, dummy.matrix);
        crowns.setColorAt(index, new THREE.Color(0x384d34).offsetHSL(tree.hue, 0, tree.hue * 0.6));
      });
      crowns.castShadow = true; trunks.castShadow = false;
      this.scene.add(crowns, trunks);
      const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4.3, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 }), broadleaf.length * 3);
      const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.9, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6d5849, flatShading: true }), broadleaf.length);
      broadleaf.forEach((tree, index) => {
        dummy.position.set(tree.x, tree.y + 4 * tree.scale, tree.z);
        dummy.rotation.set(0, tree.angle, 0); dummy.scale.setScalar(tree.scale); dummy.updateMatrix(); branches.setMatrixAt(index, dummy.matrix);
        for (let cluster = 0; cluster < 3; cluster++) {
          const angle = cluster * Math.PI * 2 / 3 + tree.angle;
          dummy.position.set(tree.x + Math.cos(angle) * 2.8 * tree.scale, tree.y + (8.3 + cluster * 0.7) * tree.scale, tree.z + Math.sin(angle) * 2.8 * tree.scale);
          dummy.scale.set(tree.scale * 1.15, tree.scale * 0.95, tree.scale); dummy.updateMatrix(); leaves.setMatrixAt(index * 3 + cluster, dummy.matrix);
          leaves.setColorAt(index * 3 + cluster, new THREE.Color(0x5c7042).offsetHSL(tree.hue, 0, tree.hue * 0.7));
        }
      });
      leaves.castShadow = true; leaves.receiveShadow = true; branches.castShadow = false;
      this.scene.add(leaves, branches);
      const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4, 0), new THREE.MeshStandardMaterial({ color: C.palette.rock, flatShading: true, roughness: 1 }), rocks.length);
      rocks.forEach((rock, index) => {
        dummy.position.set(rock.x, rock.y + rock.scale, rock.z); dummy.rotation.set(0.1, rock.angle, 0.2);
        dummy.scale.set(rock.scale * 1.5, rock.scale, rock.scale); dummy.updateMatrix(); stones.setMatrixAt(index, dummy.matrix);
      });
      stones.castShadow = true; this.scene.add(stones);
      for (const mesh of [crowns, trunks, leaves, branches, stones]) {
        mesh.frustumCulled = false;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    buildLighthouse() {
      const x = -910, z = -160, base = this.heightAt(x, z);
      const tower = new THREE.Group();
      const white = new THREE.MeshStandardMaterial({ color: 0xeee3c7, flatShading: true });
      const red = new THREE.MeshStandardMaterial({ color: 0xb94035, flatShading: true });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 6, 31, 10), white);
      body.position.y = 15.5; tower.add(body);
      for (const height of [7, 17, 27]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(6 - (height + 2.5) * 2.2 / 31 + 0.02, 6 - (height - 2.5) * 2.2 / 31 + 0.02, 5, 10), red);
        band.position.y = height;
        tower.add(band);
      }
      const balcony = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 1, 10), red); balcony.position.y = 30; tower.add(balcony);
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 5, 8), new THREE.MeshBasicMaterial({ color: 0xffd780, toneMapped: false }));
      lantern.position.y = 33; tower.add(lantern);
      const beacon = new THREE.PointLight(0xffb65d, 1.4, 65, 2);
      beacon.position.y = 33;
      tower.add(beacon);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(5.3, 4, 10), red); cap.position.y = 37; tower.add(cap);
      tower.position.set(x, base, z);
      tower.traverse((object) => { if (object.isMesh) object.castShadow = true; });
      this.scene.add(tower);
      return tower;
    }
    updateView(camera, state) {
      this.water.position.set(camera.position.x, 0, camera.position.z);
      this.sky.position.copy(camera.position);
      this.sunDisc.position.copy(this.sunDirection).multiplyScalar(3900).add(camera.position);
      const glideAngle = C.degrees(Math.atan2(state.position.y - (C.runway.height + 1.03), Math.hypot(state.position.x - C.runway.x + 29, state.position.z - C.runway.z - 180)));
      let redCount = 0;
      for (const threshold of this.papiThresholds) if (glideAngle < threshold) redCount++;
      if (redCount !== this.papiRedCount) {
        for (let index = 0; index < 4; index++) this.papiLights.setColorAt(index, this.papiColor.setHex(index < redCount ? 0xe63946 : 0xfff2dc));
        this.papiLights.instanceColor.needsUpdate = true;
        this.papiRedCount = redCount;
      }
      const ground = this.heightAt(state.position.x, state.position.z);
      const clearance = Math.max(0, state.position.y - ground);
      const extent = C.clamp(38 + clearance * 0.75, 48, 160);
      const shadowCamera = this.sunlight.shadow.camera;
      if (Math.abs(shadowCamera.right - extent) > 0.5) {
        shadowCamera.left = -extent; shadowCamera.right = extent;
        shadowCamera.top = extent; shadowCamera.bottom = -extent;
        shadowCamera.updateProjectionMatrix();
      }
      const texelStep = (shadowCamera.right - shadowCamera.left) / this.sunlight.shadow.mapSize.x;
      this.shadowCenter.copy(state.position).addScaledVector(this.sunDirection, -clearance / this.sunDirection.y * 0.5);
      const horizontal = this.shadowCenter.dot(this.shadowRight), vertical = this.shadowCenter.dot(this.shadowUp);
      this.shadowCenter.addScaledVector(this.shadowRight, Math.round(horizontal / texelStep) * texelStep - horizontal);
      this.shadowCenter.addScaledVector(this.shadowUp, Math.round(vertical / texelStep) * texelStep - vertical);
      this.sunlight.target.position.copy(this.shadowCenter);
      this.sunlight.position.copy(this.shadowCenter).addScaledVector(this.sunDirection, 650);
    }
    isRunway(x, z) {
      return Math.abs(x - C.runway.x) < C.runway.width / 2 && Math.abs(z - C.runway.z) < C.runway.length / 2;
    }
    update(delta, time) {
      this.time = time;
      this.water.material.uniforms.time.value = time;
      this.shallowsMaterial.uniforms.time.value = time;
      if (delta > 0) {
        let index = 0;
        for (const cloud of this.cloudGroups) {
          cloud.position.x += cloud.drift * delta;
          if (cloud.position.x > 2300) cloud.position.x = -2300;
          for (const puff of cloud.puffs) this.clouds.instanceMatrix.array[index++ * 16 + 12] = cloud.position.x + puff.position.x;
        }
        this.clouds.instanceMatrix.needsUpdate = true;
      }
      this.windsock.rotation.y = Math.sin(time * 0.8) * 0.12;
    }
  };
})();
