import * as THREE from 'three';
import type { ProceduralTexturePack } from './textures';
import { createGateSignTexture } from './textures';

export interface QueenBeeRig {
  group: THREE.Group;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  crown: THREE.Mesh;
  abdomen: THREE.Mesh;
}

export interface GateVisual {
  group: THREE.Group;
  barrier: THREE.Mesh;
  signMesh: THREE.Mesh;
  floorGlow: THREE.Mesh;
  signMaterial: THREE.MeshStandardMaterial;
  barrierMaterial: THREE.MeshPhysicalMaterial;
  floorGlowMaterial: THREE.MeshBasicMaterial;
  setLabel: (label: string, positive: boolean, isMultiplier: boolean, maxAnisotropy: number) => void;
}

export interface HornetRig {
  group: THREE.Group;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  telegraphRing: THREE.Mesh;
  telegraphMat: THREE.MeshBasicMaterial;
}

export interface PollenVisual {
  group: THREE.Group;
  halo: THREE.Mesh;
  blossomHead: THREE.Group;
}

function createWingGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.09, 0.14, 0.34, 0.22, 0.44, 0.1);
  shape.bezierCurveTo(0.49, 0.01, 0.32, -0.1, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: 0.014,
    bevelEnabled: false,
  });
  geo.rotateX(Math.PI / 2);
  return geo;
}

/**
 * 9-part Queen Bee Hero Group (abdomen, stinger, thorax, head, 2 eyes, crown, left/right wings)
 */
export function createQueenBeeGroup(textures: ProceduralTexturePack): QueenBeeRig {
  const group = new THREE.Group();

  const abdomenGeo = new THREE.SphereGeometry(0.24, 18, 14);
  abdomenGeo.scale(1.0, 0.88, 1.38);
  const abdomenMat = new THREE.MeshStandardMaterial({
    map: textures.beeStripe,
    roughness: 0.38,
    metalness: 0.08,
  });
  const abdomen = new THREE.Mesh(abdomenGeo, abdomenMat);
  abdomen.position.set(0, 0, 0.16);
  abdomen.rotation.y = Math.PI / 2;
  abdomen.castShadow = true;
  group.add(abdomen);

  // Stinger accent
  const stingerGeo = new THREE.ConeGeometry(0.05, 0.18, 8);
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1e1612,
    roughness: 0.25,
    metalness: 0.25,
  });
  const stinger = new THREE.Mesh(stingerGeo, darkMat);
  stinger.rotation.x = Math.PI / 2;
  stinger.position.set(0, -0.02, 0.5);
  group.add(stinger);

  // Fuzzy thorax
  const thoraxGeo = new THREE.SphereGeometry(0.18, 14, 12);
  const thoraxMat = new THREE.MeshStandardMaterial({
    color: 0x3b2a1a,
    roughness: 0.82,
    metalness: 0.02,
  });
  const thorax = new THREE.Mesh(thoraxGeo, thoraxMat);
  thorax.position.set(0, 0.02, -0.12);
  thorax.castShadow = true;
  group.add(thorax);

  // Head
  const headGeo = new THREE.SphereGeometry(0.135, 14, 12);
  const head = new THREE.Mesh(headGeo, darkMat);
  head.position.set(0, 0.03, -0.3);
  group.add(head);

  // Glossy compound eyes
  const eyeGeo = new THREE.SphereGeometry(0.048, 10, 8);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.12,
    metalness: 0.45,
  });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.095, 0.06, -0.36);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.095, 0.06, -0.36);
  group.add(eyeL, eyeR);

  // Royal Golden Crown (Lathe profile)
  const crownPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.09, 0),
    new THREE.Vector2(0.11, 0.09),
    new THREE.Vector2(0.06, 0.06),
    new THREE.Vector2(0.04, 0.12),
    new THREE.Vector2(0.0, 0.07),
  ];
  const crownGeo = new THREE.LatheGeometry(crownPts, 8);
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xffd740,
    roughness: 0.18,
    metalness: 0.88,
    emissive: 0x7c4d00,
    emissiveIntensity: 0.35,
  });
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.set(0, 0.14, -0.28);
  group.add(crown);

  // Translucent articulated wings
  const wingGeo = createWingGeometry();
  const wingMat = new THREE.MeshPhysicalMaterial({
    color: 0xeaf7ff,
    roughness: 0.14,
    metalness: 0.05,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.1, 0.15, -0.08);
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.1, 0.15, -0.08);
  wingL.scale.x = -1;
  group.add(wingL, wingR);

  return { group, wingL, wingR, crown, abdomen };
}

/**
 * Dual-wing geometry for instanced worker bees
 */
export function createInstancedWingGeometry(): THREE.BufferGeometry {
  const verts = new Float32Array([
    // Right wing triangle
    0.04, 0.06, 0.0,
    0.26, 0.13, 0.06,
    0.21, 0.10, -0.10,
    // Left wing triangle
    -0.04, 0.06, 0.0,
    -0.21, 0.10, -0.10,
    -0.26, 0.13, 0.06,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Composite 6-part Gate Archway (2 plinths, 2 timber pillars, crossbeam, translucent barrier, sign board)
 */
export function createGateGroup(textures: ProceduralTexturePack, maxAnisotropy: number): GateVisual {
  const group = new THREE.Group();

  const postMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    roughness: 0.85,
    metalness: 0.04,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0xd4a359,
    roughness: 0.55,
    metalness: 0.15,
  });

  const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 2.7, 10);
  const plinthGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.25, 10);
  const orbGeo = new THREE.SphereGeometry(0.19, 10, 8);
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    emissive: 0xffab00,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.65,
  });

  const halfW = 2.05;
  [-halfW, halfW].forEach((px) => {
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(px, 0.125, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(px, 1.48, 0);
    post.castShadow = true;
    group.add(post);

    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(px, 3.08, 0);
    group.add(orb);
  });

  const beamGeo = new THREE.BoxGeometry(halfW * 2 + 0.4, 0.24, 0.24);
  const beam = new THREE.Mesh(beamGeo, plinthMat);
  beam.position.set(0, 2.86, 0);
  beam.castShadow = true;
  group.add(beam);

  const barrierMat = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    roughness: 0.12,
    metalness: 0.05,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const barrierGeo = new THREE.PlaneGeometry(halfW * 2 - 0.18, 2.55);
  const barrier = new THREE.Mesh(barrierGeo, barrierMat);
  barrier.position.set(0, 1.45, 0);
  barrier.renderOrder = 2;
  group.add(barrier);

  const floorGlowGeo = new THREE.PlaneGeometry(4.2, 2.0);
  floorGlowGeo.rotateX(-Math.PI / 2);
  const floorGlowMat = new THREE.MeshBasicMaterial({
    map: textures.glow,
    color: 0x3dff7a,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
  floorGlow.position.set(0, 0.045, 0);
  group.add(floorGlow);

  const initialTex = createGateSignTexture('+10', true, false, maxAnisotropy);
  const signMat = new THREE.MeshStandardMaterial({
    map: initialTex,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x111111,
    emissiveIntensity: 0.22,
  });
  const signGeo = new THREE.BoxGeometry(2.45, 1.22, 0.16);
  const signMesh = new THREE.Mesh(signGeo, signMat);
  signMesh.position.set(0, 2.55, 0.04);
  signMesh.castShadow = true;
  group.add(signMesh);

  let currentLabel = '+10';
  const setLabel = (label: string, positive: boolean, isMultiplier: boolean, aniso: number) => {
    if (currentLabel !== label) {
      currentLabel = label;
      const oldMap = signMat.map;
      signMat.map = createGateSignTexture(label, positive, isMultiplier, aniso);
      signMat.needsUpdate = true;
      oldMap?.dispose();
    }
    const accent = positive ? (isMultiplier ? 0xf59e0b : 0x10b981) : 0xef4444;
    const glowAccent = positive ? (isMultiplier ? 0xffd54a : 0x3dff7a) : 0xff3a3a;
    barrierMat.color.setHex(accent);
    floorGlowMat.color.setHex(glowAccent);
    signMat.emissive.setHex(accent);
    signMat.emissiveIntensity = positive ? 0.24 : 0.18;
  };

  return {
    group,
    barrier,
    signMesh,
    floorGlow,
    signMaterial: signMat,
    barrierMaterial: barrierMat,
    floorGlowMaterial: floorGlowMat,
    setLabel,
  };
}

/**
 * 5-part Golden Pollen Blossom Pickup
 */
export function createPollenBlossomGroup(): PollenVisual {
  const group = new THREE.Group();

  // Stem & leaf base grounded at y=0
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.72 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.75, 7), stemMat);
  stem.position.y = 0.375;
  group.add(stem);

  const leafGeo = new THREE.SphereGeometry(0.18, 8, 6);
  leafGeo.scale(1.4, 0.25, 0.7);
  const leafL = new THREE.Mesh(leafGeo, stemMat);
  leafL.position.set(-0.16, 0.16, 0);
  leafL.rotation.z = 0.25;
  const leafR = new THREE.Mesh(leafGeo, stemMat);
  leafR.position.set(0.16, 0.22, 0);
  leafR.rotation.z = -0.25;
  group.add(leafL, leafR);

  const blossomHead = new THREE.Group();
  blossomHead.position.y = 0.92;
  group.add(blossomHead);

  // Nectar gold core
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffd54f,
    emissive: 0xff9800,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.55,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), coreMat);
  core.castShadow = true;
  blossomHead.add(core);

  // 5 petals
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e1,
    roughness: 0.48,
    metalness: 0.04,
  });
  const petalGeo = new THREE.SphereGeometry(0.16, 8, 6);
  petalGeo.scale(1.0, 0.35, 1.45);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(Math.cos(angle) * 0.28, -0.02, Math.sin(angle) * 0.28);
    petal.rotation.y = -angle + Math.PI / 2;
    blossomHead.add(petal);
  }

  // Rotating golden ring halo
  const haloMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    emissive: 0xffab00,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.75,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 20), haloMat);
  halo.position.y = 0.92;
  group.add(halo);

  return { group, halo, blossomHead };
}

/**
 * Composite Thorny Bramble Log Hazard (bark log, 2 end caps, 10 protruding thorns, contact shadow base)
 */
export function createBrambleLogGroup(textures: ProceduralTexturePack): THREE.Group {
  const group = new THREE.Group();

  const logLen = 2.1;
  const logMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    roughness: 0.88,
    metalness: 0.03,
  });
  const logGeo = new THREE.CylinderGeometry(0.38, 0.4, logLen, 12);
  logGeo.rotateZ(Math.PI / 2);
  const logMesh = new THREE.Mesh(logGeo, logMat);
  logMesh.position.y = 0.42;
  logMesh.castShadow = true;
  logMesh.receiveShadow = true;
  group.add(logMesh);

  // Inner wood cut rings on ends
  const endMat = new THREE.MeshStandardMaterial({ color: 0xc29864, roughness: 0.72 });
  const endGeo = new THREE.CylinderGeometry(0.32, 0.32, logLen + 0.03, 12);
  endGeo.rotateZ(Math.PI / 2);
  const ends = new THREE.Mesh(endGeo, endMat);
  ends.position.y = 0.42;
  group.add(ends);

  // Protruding crimson-tipped thorns
  const thornMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    roughness: 0.35,
    metalness: 0.15,
    emissive: 0x450a0a,
    emissiveIntensity: 0.25,
  });
  const thornGeo = new THREE.ConeGeometry(0.09, 0.34, 6);
  for (let i = 0; i < 10; i++) {
    const t = new THREE.Mesh(thornGeo, thornMat);
    const x = -0.82 + (i / 9) * 1.64;
    const angle = i * 1.45;
    t.position.set(x, 0.42 + Math.cos(angle) * 0.42, Math.sin(angle) * 0.42);
    t.rotation.x = angle;
    t.castShadow = true;
    group.add(t);
  }

  return group;
}

/**
 * Composite Spotted Toadstool Bumper Hazard (Lathe stalk, collar, spotted dome cap, warning ground ring)
 */
export function createToadstoolGroup(textures: ProceduralTexturePack): THREE.Group {
  const group = new THREE.Group();

  const stalkPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.34, 0),
    new THREE.Vector2(0.28, 0.25),
    new THREE.Vector2(0.21, 0.85),
    new THREE.Vector2(0.26, 1.05),
    new THREE.Vector2(0, 1.05),
  ];
  const stalkMat = new THREE.MeshStandardMaterial({
    color: 0xf5ecd7,
    roughness: 0.68,
    metalness: 0.02,
  });
  const stalk = new THREE.Mesh(new THREE.LatheGeometry(stalkPts, 14), stalkMat);
  stalk.castShadow = true;
  stalk.receiveShadow = true;
  group.add(stalk);

  const capPts = [
    new THREE.Vector2(0.01, 1.68),
    new THREE.Vector2(0.45, 1.6),
    new THREE.Vector2(0.84, 1.32),
    new THREE.Vector2(0.95, 1.02),
    new THREE.Vector2(0.85, 0.96),
    new THREE.Vector2(0.24, 0.98),
  ];
  const capMat = new THREE.MeshStandardMaterial({
    map: textures.toadstoolCap,
    roughness: 0.36,
    metalness: 0.06,
  });
  const cap = new THREE.Mesh(new THREE.LatheGeometry(capPts, 18), capMat);
  cap.castShadow = true;
  group.add(cap);

  // Subtle warning ring on ground
  const ringGeo = new THREE.RingGeometry(0.75, 0.92, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.03;
  group.add(ring);

  return group;
}

/**
 * Composite 7-part Red Hornet Predator with Dash Telegraph Ring
 */
export function createHornetGroup(textures: ProceduralTexturePack): HornetRig {
  const group = new THREE.Group();

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 1.2;
  group.add(bodyGroup);

  const abdomenGeo = new THREE.SphereGeometry(0.32, 14, 12);
  abdomenGeo.scale(0.92, 0.88, 1.55);
  const abdomenMat = new THREE.MeshStandardMaterial({
    map: textures.hornetStripe,
    roughness: 0.34,
    metalness: 0.14,
  });
  const abdomen = new THREE.Mesh(abdomenGeo, abdomenMat);
  abdomen.position.set(0, 0, -0.22);
  abdomen.rotation.y = Math.PI / 2;
  abdomen.castShadow = true;
  bodyGroup.add(abdomen);

  // Sharp stinger facing camera (+Z direction of approach)
  const stingerMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.2,
    metalness: 0.6,
  });
  const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 8), stingerMat);
  stinger.rotation.x = -Math.PI / 2;
  stinger.position.set(0, -0.02, -0.76);
  bodyGroup.add(stinger);

  const thorax = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x2c1115, roughness: 0.65 }),
  );
  thorax.position.set(0, 0.03, 0.22);
  thorax.castShadow = true;
  bodyGroup.add(thorax);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x1f0c0f, roughness: 0.45 }),
  );
  head.position.set(0, 0.05, 0.46);
  bodyGroup.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffd600,
    emissive: 0xff6d00,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });
  const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.12, 0.08, 0.56);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.12, 0.08, 0.56);
  bodyGroup.add(eyeL, eyeR);

  const wingGeo = createWingGeometry();
  wingGeo.scale(1.45, 1.45, 1.45);
  const wingMat = new THREE.MeshPhysicalMaterial({
    color: 0xffe4e6,
    roughness: 0.18,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.14, 0.18, 0.15);
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.14, 0.18, 0.15);
  wingL.scale.x = -1;
  bodyGroup.add(wingL, wingR);

  // Telegraph ring on ground
  const ringGeo = new THREE.RingGeometry(0.55, 0.78, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const telegraphMat = new THREE.MeshBasicMaterial({
    color: 0xff3b30,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(ringGeo, telegraphMat);
  telegraphRing.position.y = 0.04;
  group.add(telegraphRing);

  return { group, wingL, wingR, telegraphRing, telegraphMat };
}

/**
 * Grand Milestone Golden Hive Arch spanning the path
 */
export function createMilestoneArchGroup(textures: ProceduralTexturePack): THREE.Group {
  const group = new THREE.Group();

  const pillarMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    roughness: 0.8,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffc107,
    roughness: 0.25,
    metalness: 0.62,
    emissive: 0x7c4a00,
    emissiveIntensity: 0.25,
  });

  const span = 4.65;
  [-span, span].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 4.1, 10), pillarMat);
    pillar.position.set(px, 2.05, 0);
    pillar.castShadow = true;
    group.add(pillar);

    // Hexagonal honeycomb lantern
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.56, 6), goldMat);
    lantern.position.set(px > 0 ? px - 0.45 : px + 0.45, 3.35, 0);
    group.add(lantern);
  });

  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 0.8, 0.42, 0.42), goldMat);
  archBeam.position.set(0, 4.15, 0);
  archBeam.castShadow = true;
  group.add(archBeam);

  // Center hive medallion
  const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.26, 6), goldMat);
  medallion.rotation.x = Math.PI / 2;
  medallion.position.set(0, 4.15, 0.14);
  group.add(medallion);

  return group;
}

/**
 * Composite 4-part Stylized Meadow Tree grounded at y=0 (supports shared biome canopy material)
 */
export function createMeadowTreeGroup(
  textures: ProceduralTexturePack,
  canopyMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    roughness: 0.88,
  });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 2.3, 8), trunkMat);
  trunk.position.y = 1.15;
  trunk.castShadow = true;
  group.add(trunk);

  const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.75, 3.2, 7), canopyMat);
  c1.position.set(0, 3.4, 0);
  c1.castShadow = true;
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.6, 7), canopyMat);
  c2.position.set(0, 5.0, 0);
  c2.castShadow = true;
  group.add(c1, c2);

  return group;
}

export interface SpiderWebRig {
  group: THREE.Group;
  spiderGroup: THREE.Group;
}

/**
 * HD Composite Spider Web Obstacle (2 grounded wooden stakes, suspended dewdrop radial web, hanging 3D spider)
 */
export function createSpiderWebGroup(textures: ProceduralTexturePack): SpiderWebRig {
  const group = new THREE.Group();

  const stakeMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    roughness: 0.86,
    metalness: 0.03,
  });
  const stakeGeo = new THREE.CylinderGeometry(0.055, 0.08, 3.25, 8);
  [-1.55, 1.55].forEach((sx) => {
    const stake = new THREE.Mesh(stakeGeo, stakeMat);
    stake.position.set(sx, 1.625, 0);
    stake.castShadow = true;
    group.add(stake);
  });

  const webMat = new THREE.MeshBasicMaterial({
    map: textures.spiderWeb,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const webMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), webMat);
  webMesh.position.set(0, 1.72, 0);
  webMesh.renderOrder = 2;
  group.add(webMesh);

  // Hanging 3D Spider
  const spiderGroup = new THREE.Group();
  spiderGroup.position.set(0, 2.15, 0.12);
  group.add(spiderGroup);

  const darkPurpleMat = new THREE.MeshStandardMaterial({ color: 0x2b1b3a, roughness: 0.45 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x120a1c, roughness: 0.35 });
  const redMarkMat = new THREE.MeshStandardMaterial({
    color: 0xd32f2f,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });

  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), darkPurpleMat);
  thorax.scale.set(1, 0.82, 1.18);
  thorax.castShadow = true;
  spiderGroup.add(thorax);

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8), blackMat);
  abdomen.scale.set(0.95, 0.82, 1.05);
  abdomen.position.set(0, 0.04, -0.32);
  abdomen.castShadow = true;
  spiderGroup.add(abdomen);

  const hourglass = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 6), redMarkMat);
  hourglass.scale.set(1, 0.4, 1.2);
  hourglass.position.set(0, 0.24, -0.34);
  spiderGroup.add(hourglass);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), darkPurpleMat);
  head.position.set(0, 0.03, 0.24);
  spiderGroup.add(head);

  const eyeGeo = new THREE.SphereGeometry(0.038, 6, 6);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(eyeGeo, redMarkMat);
    eye.position.set(s * 0.06, 0.08, 0.33);
    spiderGroup.add(eye);
  });

  // 8 bent spider legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1c1228, roughness: 0.55 });
  const legSegGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.42, 5);
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 4; i++) {
      const zOff = (i - 1.5) * 0.13;
      const upper = new THREE.Mesh(legSegGeo, legMat);
      upper.position.set(s * 0.26, 0.14, zOff);
      upper.rotation.z = s * -0.95;
      upper.rotation.y = (i - 1.5) * 0.2 * s;
      spiderGroup.add(upper);

      const lower = new THREE.Mesh(legSegGeo, legMat);
      lower.position.set(s * 0.52, -0.04, zOff * 1.3);
      lower.rotation.z = s * 0.32;
      spiderGroup.add(lower);
    }
  });

  // Silk thread suspending the spider
  const silk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.1, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }),
  );
  silk.position.set(0, 0.58, 0);
  spiderGroup.add(silk);

  return { group, spiderGroup };
}

export interface FrogRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
}

/**
 * Composite Hopping Frog Obstacle with Dorsal Spots (body, cream belly, spots, 2 eye domes, 2 pupils, 2 folded hind legs)
 */
export function createFrogGroup(textures: ProceduralTexturePack): FrogRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.48;
  group.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x4caf50,
    roughness: 0.42,
    metalness: 0.05,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xd9f99d,
    roughness: 0.65,
  });
  const spotMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d32,
    roughness: 0.55,
  });

  const bodyGeo = new THREE.SphereGeometry(0.68, 14, 12);
  bodyGeo.scale(1.04, 0.72, 1.15);
  const body = new THREE.Mesh(bodyGeo, skinMat);
  body.castShadow = true;
  bodyGroup.add(body);

  const bellyGeo = new THREE.SphereGeometry(0.54, 12, 10);
  bellyGeo.scale(0.95, 0.48, 0.98);
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.set(0, -0.18, 0.08);
  bodyGroup.add(belly);

  // Dorsal spots
  const spotGeo = new THREE.SphereGeometry(0.13, 8, 6);
  spotGeo.scale(1, 0.35, 1);
  [
    [-0.2, 0.47, -0.1],
    [0.24, 0.44, -0.24],
    [0.04, 0.48, 0.14],
  ].forEach(([sx, sy, sz]) => {
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.position.set(sx, sy, sz);
    bodyGroup.add(spot);
  });

  // Folded hind legs
  const legGeo = new THREE.SphereGeometry(0.28, 10, 8);
  legGeo.scale(0.75, 0.7, 1.45);
  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(legGeo, skinMat);
    leg.position.set(0.56 * side, -0.18, -0.18);
    leg.rotation.y = side * 0.35;
    leg.castShadow = true;
    bodyGroup.add(leg);
  });

  // Raised frog eyes facing oncoming bees (+Z)
  const eyeGeo = new THREE.SphereGeometry(0.18, 10, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18 });
  const pupilGeo = new THREE.SphereGeometry(0.085, 8, 6);
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });

  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0.31 * side, 0.46, 0.38);
    bodyGroup.add(eye);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(0.31 * side, 0.48, 0.52);
    bodyGroup.add(pupil);
  });

  // Soft ground contact shadow under frog
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.75), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);

  return { group, bodyGroup };
}

export interface WaspNestRig {
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
}

/**
 * HD Tapered Papery Wasp Nest Boss (Lathe papery ovoid with scalloped nestPaper texture, branch, stem, entrance rim)
 */
export function createWaspNestGroup(textures: ProceduralTexturePack): WaspNestRig {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    map: textures.nestPaper,
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.02,
  });

  const profile = [
    [0.01, -3.4],
    [0.8, -3.1],
    [1.8, -2.2],
    [2.6, -0.9],
    [3.0, 0.5],
    [2.8, 1.8],
    [2.0, 2.8],
    [1.0, 3.3],
    [0.4, 3.5],
    [0.01, 3.55],
  ].map(([r, y]) => new THREE.Vector2(r, y));

  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 30), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Dark nest entrance cavity + sculpted rim facing the approaching swarm (+Z)
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x0e0703 });
  const holeGeo = new THREE.SphereGeometry(0.84, 14, 12);
  holeGeo.scale(1, 1.1, 0.36);
  const hole = new THREE.Mesh(holeGeo, holeMat);
  hole.position.set(0, -1.45, 2.24);
  group.add(hole);

  const rimMat = new THREE.MeshStandardMaterial({ color: 0x7a5a30, roughness: 0.95 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.17, 8, 22), rimMat);
  rim.position.set(0, -1.45, 2.3);
  group.add(rim);

  // Overhead supporting branch & stem
  const barkMat = new THREE.MeshStandardMaterial({ map: textures.bark, roughness: 0.88 });
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 14, 8), barkMat);
  branch.rotation.z = Math.PI / 2;
  branch.position.y = 4.45;
  branch.castShadow = true;
  group.add(branch);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8), barkMat);
  stem.position.y = 3.85;
  group.add(stem);

  // Ground contact shadow beneath floating nest
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -3.85;
  group.add(shadow);

  return { group, bodyMat };
}

export interface HornetQueenBossRig {
  group: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
}

/**
 * HD Crowned Giant Hornet Queen Boss (striped abdomen, armored thorax, glowing crimson eyes, 5-point royal crown, 6 legs, articulated wings)
 */
export function createHornetQueenBossGroup(): HornetQueenBossRig {
  const group = new THREE.Group();

  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xffc107,
    roughness: 0.35,
    metalness: 0.12,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x1e1e1e,
    roughness: 0.38,
    metalness: 0.18,
  });
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.18,
    metalness: 0.85,
    emissive: 0x7c4a00,
    emissiveIntensity: 0.35,
  });
  const redEyeMat = new THREE.MeshStandardMaterial({
    color: 0xff2a2a,
    emissive: 0xc62828,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });

  const abdGeo = new THREE.SphereGeometry(1.1, 18, 14);
  abdGeo.scale(1, 0.9, 1.5);
  const abd = new THREE.Mesh(abdGeo, yellowMat);
  abd.position.z = -1.0;
  abd.castShadow = true;
  group.add(abd);

  [-0.3, -1.0, -1.7].forEach((z) => {
    const rr = 1.1 * Math.sqrt(Math.max(0.01, 1 - Math.pow((z + 1.0) / 1.65, 2))) + 0.03;
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.12, 8, 22), blackMat);
    stripe.scale.set(1, 0.9, 1);
    stripe.position.z = z;
    group.add(stripe);
  });

  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.76, 12, 10), blackMat);
  thorax.position.set(0, 0.05, 0.25);
  thorax.castShadow = true;
  group.add(thorax);

  const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.72, 10), blackMat);
  stinger.rotation.x = -Math.PI / 2;
  stinger.position.set(0, -0.05, -2.75);
  group.add(stinger);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 12), blackMat);
  head.position.set(0, 0.05, 1.02);
  head.castShadow = true;
  group.add(head);

  // Golden 5-point Royal Crown
  const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 6, 16), crownMat);
  crownBase.rotation.x = Math.PI / 2;
  crownBase.position.set(0, 0.76, 1.02);
  group.add(crownBase);

  const spikeGeo = new THREE.ConeGeometry(0.09, 0.36, 5);
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5;
    const spike = new THREE.Mesh(spikeGeo, crownMat);
    spike.position.set(Math.cos(a) * 0.32, 0.96, 1.02 + Math.sin(a) * 0.32);
    group.add(spike);
  }

  // Crimson Eyes
  const eyeGeo = new THREE.SphereGeometry(0.22, 10, 8);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(eyeGeo, redEyeMat);
    eye.position.set(0.38 * s, 0.22, 1.56);
    group.add(eye);
  });

  // 6 Articulated Legs
  const legGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.95, 6);
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(legGeo, blackMat);
      leg.position.set(s * 0.62, -0.62, 0.05 + i * 0.32);
      leg.rotation.z = s * 0.62;
      group.add(leg);
    }
  });

  const wingMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.16,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wingGeo = new THREE.PlaneGeometry(2.4, 1.2);
  wingGeo.rotateX(-Math.PI / 2);

  const wingL = new THREE.Group();
  const wingR = new THREE.Group();
  [
    [wingL, -1],
    [wingR, 1],
  ].forEach(([grp, s]) => {
    const wingGroup = grp as THREE.Group;
    const side = s as number;
    const w = new THREE.Mesh(wingGeo, wingMat);
    w.position.x = 1.2 * side;
    wingGroup.add(w);
    wingGroup.position.set(0.4 * side, 1.0, -0.1);
    group.add(wingGroup);
  });

  group.scale.setScalar(1.3);
  group.visible = false;

  return { group, wingL, wingR };
}

export interface BirdRig {
  group: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
}

/**
 * Diving Bird Predator (Lv4+): dark aerodynamic body, bright beak, crimson/amber eyes, flapping wings
 */
export function createBirdGroup(): BirdRig {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x3b2f45,
    roughness: 0.45,
    metalness: 0.08,
  });
  const breastMat = new THREE.MeshStandardMaterial({
    color: 0xd97742,
    roughness: 0.65,
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.35,
  });

  const bodyGeo = new THREE.SphereGeometry(0.42, 12, 10);
  bodyGeo.scale(0.88, 0.8, 1.45);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  group.add(body);

  const breast = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), breastMat);
  breast.scale.set(0.85, 0.72, 1.0);
  breast.position.set(0, -0.08, 0.24);
  group.add(breast);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), bodyMat);
  head.position.set(0, 0.14, 0.56);
  head.castShadow = true;
  group.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.32, 6), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.12, 0.85);
  group.add(beak);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 4), bodyMat);
  tail.rotation.x = -Math.PI / 2;
  tail.scale.set(1.2, 1.0, 0.25);
  tail.position.set(0, 0.06, -0.72);
  group.add(tail);

  const wingGeo = new THREE.BoxGeometry(1.15, 0.06, 0.46);
  const wingL = new THREE.Group();
  const wingR = new THREE.Group();
  [
    [wingL, -1],
    [wingR, 1],
  ].forEach(([wg, side]) => {
    const grp = wg as THREE.Group;
    const s = side as number;
    const wingMesh = new THREE.Mesh(wingGeo, bodyMat);
    wingMesh.position.x = s * 0.55;
    wingMesh.castShadow = true;
    grp.add(wingMesh);
    grp.position.set(s * 0.24, 0.12, 0.08);
    group.add(grp);
  });

  return { group, wingL, wingR };
}

/**
 * Rolling Timber Log Hazard (Lv6+): rotates cleanly on Z as it sweeps laterally across the path
 */
export function createRollingLogGroup(textures: ProceduralTexturePack): THREE.Group {
  const group = new THREE.Group();

  const logLen = 1.8;
  const radius = 0.55;
  const barkMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    roughness: 0.88,
    metalness: 0.03,
  });
  const logGeo = new THREE.CylinderGeometry(radius, radius, logLen, 14);
  logGeo.rotateX(Math.PI / 2);
  const logMesh = new THREE.Mesh(logGeo, barkMat);
  logMesh.castShadow = true;
  logMesh.receiveShadow = true;
  group.add(logMesh);

  const cutMat = new THREE.MeshStandardMaterial({ color: 0xd4a36a, roughness: 0.72 });
  const cutGeo = new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, logLen + 0.04, 14);
  cutGeo.rotateX(Math.PI / 2);
  const cut = new THREE.Mesh(cutGeo, cutMat);
  group.add(cut);

  // Subtle knot bumps along circumference so roll rotation is unmistakable
  const knotGeo = new THREE.SphereGeometry(0.14, 7, 6);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const knot = new THREE.Mesh(knotGeo, barkMat);
    knot.position.set(Math.cos(a) * radius, Math.sin(a) * radius, (k % 2 === 0 ? 1 : -1) * 0.36);
    group.add(knot);
  }

  return group;
}



