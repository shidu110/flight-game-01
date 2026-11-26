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
      const sky = new THREE.Mesh(new THREE.SphereGeometry(3400, 32, 16),
        new THREE.ShaderMaterial({
          side: THREE.BackSide, depthWrite: false, fog: false,
          uniforms: { sunDirection: { value: new THREE.Vector3(-0.65, 0.24, -0.72).normalize() } },
          vertexShader: 'varying vec3 worldDirection; void main(){ worldDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: 'varying vec3 worldDirection; uniform vec3 sunDirection; void main(){ vec3 ray=normalize(worldDirection); float height=pow(max(ray.y,0.0),0.55); vec3 color=mix(vec3(0.96,0.76,0.52),vec3(0.29,0.58,0.66),height); float glow=pow(max(dot(ray,sunDirection),0.0),18.0); color+=vec3(0.3,0.17,0.04)*glow; gl_FragColor=vec4(color,1.0); }'
        }));
      this.scene.add(sky);
      this.sky = sky;
      const sun = new THREE.Mesh(new THREE.SphereGeometry(48, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffe4a2, fog: false }));
      sun.position.set(-1500, 550, -1660);
      this.scene.add(sun);
      this.scene.add(new THREE.HemisphereLight(0xd9eddf, 0x70583c, 1.25));
      const sunlight = new THREE.DirectionalLight(0xffd49b, 2.1);
      sunlight.position.set(-900, 1100, -700);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.set(2048, 2048);
      sunlight.shadow.camera.left = -650;
      sunlight.shadow.camera.right = 650;
      sunlight.shadow.camera.top = 650;
      sunlight.shadow.camera.bottom = -650;
      sunlight.shadow.camera.far = 2400;
      sunlight.shadow.normalBias = 0.7;
      sunlight.shadow.bias = -0.0003;
      sunlight.target.position.set(-300, 0, 100);
      this.scene.add(sunlight, sunlight.target);
      this.scene.fog = new THREE.Fog(0xd5c9a0, 1400, 3700);
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
      const vertices = flat.attributes.position;
      for (let index = 0; index < vertices.count; index += 3) {
        const height = (vertices.getY(index) + vertices.getY(index + 1) + vertices.getY(index + 2)) / 3;
        const slope = flat.attributes.normal.getY(index);
        color.setHex(height < 8.5 ? C.palette.sand : height > 70 || slope < 0.78 ? C.palette.rock : C.palette.grass);
        color.multiplyScalar(0.88 + this.random() * 0.2);
        for (let corner = 0; corner < 3; corner++) color.toArray(colors, (index + corner) * 3);
      }
      flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const terrain = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
      terrain.receiveShadow = true;
      this.scene.add(terrain);
      this.terrain = terrain;
    }
    buildWater() {
      const geometry = new THREE.PlaneGeometry(C.seaSize + 600, C.seaSize + 600, 100, 100);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: 'uniform float time; varying vec3 surface; void main(){ vec3 point=position; point.y+=sin(point.x*0.024+time*0.8)*0.22+sin(point.z*0.037-time*0.55)*0.16; surface=(modelMatrix*vec4(point,1.0)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(surface,1.0); }',
        fragmentShader: 'uniform float time; varying vec3 surface; void main(){ float wave=sin(surface.x*0.022+surface.z*0.016+time*0.9)*sin(surface.z*0.031-time*0.7); float facets=floor(wave*5.0)/5.0; vec3 color=mix(vec3(0.055,0.29,0.34),vec3(0.15,0.52,0.54),facets*0.35+0.65); float sparkle=pow(max(0.0,sin(surface.x*0.53+surface.z*0.39+time)*sin(surface.z*0.62-time)),20.0); float sunPath=pow(max(0.0,dot(normalize(vec3(-0.65,0.0,-0.72)),normalize(vec3(surface.x-cameraPosition.x,0.0,surface.z-cameraPosition.z)))),16.0); color+=vec3(0.77,0.56,0.25)*sparkle*(0.08+sunPath*0.5); float haze=smoothstep(1100.0,3300.0,distance(cameraPosition,surface)); gl_FragColor=vec4(mix(color,vec3(0.77,0.76,0.62),haze),1.0); }'
      });
      this.water = new THREE.Mesh(geometry, material);
      this.scene.add(this.water);
      const shoreMaterial = new THREE.MeshBasicMaterial({ color: 0xa4d6b7, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
      for (const island of ISLANDS) {
        const points = [], indices = [];
        for (let segment = 0; segment <= 120; segment++) {
          const angle = segment / 120 * Math.PI * 2;
          let low = 0, high = island.r * 1.2;
          for (let step = 0; step < 13; step++) {
            const radius = (low + high) / 2;
            if (this.rawHeight(island.x + Math.cos(angle) * radius, island.z + Math.sin(angle) * radius) > 0.5) low = radius;
            else high = radius;
          }
          for (const width of [0, 9]) points.push(island.x + Math.cos(angle) * (high + width), 0.45, island.z + Math.sin(angle) * (high + width));
          if (segment < 120) {
            const offset = segment * 2;
            indices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
          }
        }
        const shore = new THREE.BufferGeometry();
        shore.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        shore.setIndex(indices);
        this.scene.add(new THREE.Mesh(shore, shoreMaterial));
      }
    }
    buildClouds() {
      this.clouds = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: 0xffe8c7, roughness: 1, flatShading: true });
      const geometry = new THREE.IcosahedronGeometry(1, 0);
      for (let index = 0; index < 26; index++) {
        const cloud = new THREE.Group();
        for (let puff = 0; puff < 5; puff++) {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(puff * 23 - 46, this.random.range(-6, 6), this.random.range(-15, 15));
          mesh.scale.set(this.random.range(23, 39), this.random.range(10, 18), this.random.range(16, 28));
          cloud.add(mesh);
        }
        cloud.position.set(this.random.range(-2200, 2200), this.random.range(360, 560), this.random.range(-2100, 2100));
        cloud.userData.drift = this.random.range(1.5, 3.8);
        this.clouds.add(cloud);
      }
      this.scene.add(this.clouds);
    }
    buildRunway() {
      const rw = C.runway;
      this.airport = new THREE.Group();
      this.airport.position.set(rw.x, rw.height + 0.13, rw.z);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(rw.width, 0.18, rw.length), new THREE.MeshStandardMaterial({ color: 0x3d4a48, roughness: 1 }));
      strip.receiveShadow = true;
      this.airport.add(strip);
      const white = new THREE.MeshStandardMaterial({ color: 0xf8e9c2, roughness: 1 });
      const marking = (width, length, x, z) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, length), white);
        mesh.position.set(x, 0.13, z);
 this.airport.add(mesh);
      };
      for (let z = -250; z <= 250; z += 48) marking(0.9, 21, 0, z);
      for (const z of [-282, 282]) {
        for (const x of [-11, -7, -3, 3, 7, 11]) marking(2.2, 18, x, z);
      }
      marking(0.5, 598, -15, 0); marking(0.5, 598, 15, 0);
      const lampGeometry = new THREE.SphereGeometry(0.6, 6, 4);
      const lamp = new THREE.MeshBasicMaterial({ color: 0xffe2a5, toneMapped: false });
      const green = new THREE.MeshBasicMaterial({ color: 0x6affb7, toneMapped: false });
      for (let z = -300; z <= 300; z += 30) {
        for (const x of [-18.5, 18.5]) {
          const light = new THREE.Mesh(lampGeometry, lamp);
          light.position.set(x, 0.6, z);
          this.airport.add(light);
        }
      }
      for (const z of [-302, 302]) {
        for (let x = -15; x <= 15; x += 3) {
          const light = new THREE.Mesh(lampGeometry, green);
          light.position.set(x, 0.4, z);
          this.airport.add(light);
        }
      }
      this.scene.add(this.airport);
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const context = canvas.getContext('2d');
      context.fillStyle = '#f4e9cf'; context.font = 'bold 76px sans-serif'; context.textAlign = 'center'; context.fillText('36', 64, 90);
      const number = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
      number.rotation.x = -Math.PI / 2;
      number.position.set(rw.x, rw.height + 0.3, rw.z + 248);
      this.scene.add(number);
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
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 17, 6), new THREE.MeshStandardMaterial({ color: 0xc2b995 }));
      mast.position.set(rw.x + 44, rw.height + 9.5, rw.z - 90);
      this.scene.add(mast);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.6, 7, 8, 1, true), new THREE.MeshStandardMaterial({ color: C.palette.red, side: THREE.DoubleSide, flatShading: true }));
      sock.rotation.z = Math.PI / 2 - 0.17;
      sock.position.set(mast.position.x + 3.5, mast.position.y + 8, mast.position.z);
      this.scene.add(sock);
      this.windsock = sock;
    }
    buildClutter() {
      const trees = [], rocks = [];
      for (let attempt = 0; attempt < 2400; attempt++) {
        const island = ISLANDS[attempt % ISLANDS.length];
        const x = island.x + this.random.range(-island.r, island.r);
        const z = island.z + this.random.range(-island.r, island.r);
        const y = this.heightAt(x, z);
        const airport = Math.abs(x - C.runway.x) < 130 && Math.abs(z - C.runway.z) < 395;
        if (y < 10 || airport) continue;
        const item = { x, y, z: z, scale: this.random.range(0.75, 1.65), angle: this.random() * Math.PI * 2 };
        if (y < 72 && trees.length < 420) trees.push(item);
        else if (rocks.length < 120) rocks.push(item);
      }
      const dummy = new THREE.Object3D();
      const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(4.2, 15, 5), new THREE.MeshStandardMaterial({ color: 0x35634c, flatShading: true, roughness: 1 }), trees.length);
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.65, 6, 5), new THREE.MeshStandardMaterial({ color: 0x766044, flatShading: true }), trees.length);
      trees.forEach((tree, index) => {
        dummy.position.set(tree.x, tree.y + 10 * tree.scale, tree.z);
        dummy.rotation.set(0, tree.angle, 0); dummy.scale.setScalar(tree.scale); dummy.updateMatrix(); crowns.setMatrixAt(index, dummy.matrix);
        dummy.position.y = tree.y + 3 * tree.scale; dummy.updateMatrix(); trunks.setMatrixAt(index, dummy.matrix);
      });
      crowns.castShadow = true; trunks.castShadow = true;
      this.scene.add(crowns, trunks);
      const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4, 0), new THREE.MeshStandardMaterial({ color: 0x9a9b88, flatShading: true, roughness: 1 }), rocks.length);
      rocks.forEach((rock, index) => {
        dummy.position.set(rock.x, rock.y + rock.scale, rock.z); dummy.rotation.set(0.1, rock.angle, 0.2);
        dummy.scale.set(rock.scale * 1.5, rock.scale, rock.scale); dummy.updateMatrix(); stones.setMatrixAt(index, dummy.matrix);
      });
      stones.castShadow = true; this.scene.add(stones);
    }
    buildLighthouse() {
      const x = -770, z = -140, base = this.heightAt(x, z);
      const tower = new THREE.Group();
      const white = new THREE.MeshStandardMaterial({ color: 0xeee3c7, flatShading: true });
      const red = new THREE.MeshStandardMaterial({ color: C.palette.red, flatShading: true });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 6, 31, 10), white);
      body.position.y = 15.5; tower.add(body);
      const band = new THREE.Mesh(new THREE.CylinderGeometry( 4.6, 5, 5, 10), red); band.position.y = 18; tower.add(band);
      const balcony = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 1, 10), red); balcony.position.y = 30; tower.add(balcony);
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 5, 8), new THREE.MeshBasicMaterial({ color: 0xffd780, toneMapped: false }));
      lantern.position.y = 33; tower.add(lantern);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(5.3, 4, 10), red); cap.position.y = 37; tower.add(cap);
      tower.position.set(x, base, z);
      tower.traverse((object) => { if (object.isMesh) object.castShadow = true; });
      this.scene.add(tower);
      return tower;
    }
    isRunway(x, z) {
      return Math.abs(x - C.runway.x) < C.runway.width / 2 && Math.abs(z - C.runway.z) < C.runway.length / 2;
    }
    update(delta, time) {
      this.time = time;
      this.water.material.uniforms.time.value = time;
      for (const cloud of this.clouds.children) {
        cloud.position.x += cloud.userData.drift * delta;
        if (cloud.position.x > 2300) cloud.position.x = -2300;
      }
      this.windsock.rotation.y = Math.sin(time * 0.8) * 0.12;
    }
  };
})();
