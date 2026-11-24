import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SwarmAudio } from './audio';
import {
  createBirdGroup,
  createBrambleLogGroup,
  createFrogGroup,
  createGateGroup,
  createHornetGroup,
  createHornetQueenBossGroup,
  createInstancedWingGeometry,
  createMeadowTreeGroup,
  createMilestoneArchGroup,
  createPollenBlossomGroup,
  createQueenBeeGroup,
  createRollingLogGroup,
  createSpiderWebGroup,
  createToadstoolGroup,
  createWaspNestGroup,
  type BirdRig,
  type FrogRig,
  type GateVisual,
  type HornetQueenBossRig,
  type HornetRig,
  type PollenVisual,
  type QueenBeeRig,
  type SpiderWebRig,
  type WaspNestRig,
} from './models';
import { createProceduralTexturePack, type ProceduralTexturePack } from './textures';
import {
  BEE_TYPES,
  MISSION_POOL,
  UPGRADE_DEFS,
  type BeeTypeId,
  type GamePhase,
  type GateOperation,
  type HudSnapshot,
  type LevelBannerInfo,
  type MissionDef,
  type MissionId,
  type MissionSnapshot,
  type PickupKind,
  type UpgradeId,
  type UpgradeLevels,
} from './types';

const PATH_HALF_WIDTH = 4.6;
const STEER_LIMIT = 3.65;
const MAX_BEES = 500;
const MAX_RENDER_BEES = 300;
const FLOWER_COUNT = 160;
const TREE_COUNT = 22;
const PARTICLE_POOL_SIZE = 140;
const MAX_LEVEL_PAIRS = 10;
const BOSS_EVERY = 5;
const NEST_STOP_Z = -7.2;
const NEST_Y = 3.9;
const WASP_COUNT = 30;
const CLOUD_COUNT = 9;
const CLOUD_PUFFS = 5;
const AMBIENT_POLLEN_COUNT = 120;
const SPAWN_Z = -88;
const DESPAWN_Z = 14;
const SAVE_KEY = 'meadow_swarm_save_v1';

interface BiomeTheme {
  name: string;
  skyTop: number;
  skyBottom: number;
  groundTint: number;
  pathTint: number;
  sunColor: number;
  leafTint: number;
  cloudColor: number;
  pollenColor: number;
  light: number;
  night: boolean;
}

const BIOME_THEMES: BiomeTheme[] = [
  {
    name: 'Meadow',
    skyTop: 0x3d8fe0,
    skyBottom: 0xcfeaff,
    groundTint: 0xffffff,
    pathTint: 0xffffff,
    sunColor: 0xfff1d0,
    leafTint: 0x3f9a45,
    cloudColor: 0xffffff,
    pollenColor: 0xfff2a0,
    light: 1.0,
    night: false,
  },
  {
    name: 'Sunset',
    skyTop: 0x4d3f9a,
    skyBottom: 0xffb27a,
    groundTint: 0xebd08a,
    pathTint: 0xffe4a0,
    sunColor: 0xffa860,
    leafTint: 0x93b53a,
    cloudColor: 0xffc9a0,
    pollenColor: 0xffd29a,
    light: 0.94,
    night: false,
  },
  {
    name: 'Autumn',
    skyTop: 0x7f9ab8,
    skyBottom: 0xeadfc4,
    groundTint: 0xdca05a,
    pathTint: 0xf0c27a,
    sunColor: 0xffe2b0,
    leafTint: 0xd9822b,
    cloudColor: 0xf4eee4,
    pollenColor: 0xffc070,
    light: 0.95,
    night: false,
  },
  {
    name: 'Night',
    skyTop: 0x050a24,
    skyBottom: 0x1d2a5a,
    groundTint: 0x5c8c7a,
    pathTint: 0x70ab92,
    sunColor: 0xa8bcff,
    leafTint: 0x246b50,
    cloudColor: 0x5a6a9a,
    pollenColor: 0xd8ff70,
    light: 0.68,
    night: true,
  },
];

interface SavedProgress {
  honey: number;
  level: number;
  best: number;
  bestScore: number;
  quality?: 'high' | 'low';
  up: UpgradeLevels;
  type?: BeeTypeId;
  owned?: BeeTypeId[];
  stars?: Record<string, number>;
  daily?: { last: string; streak: number };
  mis?: { day: string; p: Record<string, number>; c: MissionId[] };
  tut?: boolean;
  tips?: string[];
}

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getTodaysMissionDefs(day: string): MissionDef[] {
  let hash = 2166136261;
  for (let i = 0; i < day.length; i++) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const pool = [...MISSION_POOL];
  const out: MissionDef[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0;
    const idx = hash % pool.length;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function getBiomeTheme(level: number): BiomeTheme {
  return BIOME_THEMES[Math.floor((Math.max(1, level) - 1) / 3) % BIOME_THEMES.length];
}

function getLevelConfig(level: number) {
  const n = Math.max(0, level - 1);
  const boss = level % BOSS_EVERY === 0;
  const baseHp = n <= 30 ? 60 + 35 * n : 1110 + 8 * (n - 30);
  return {
    boss,
    pairs: Math.min(3 + Math.floor(level / 2), MAX_LEVEL_PAIRS),
    obsProb: Math.min(0.5 + 0.05 * n, 0.95),
    bothBadProb: level >= 3 ? Math.min(0.15 + 0.02 * (level - 3), 0.45) : 0,
    movingProb: level >= 8 ? 0.6 : 0,
    gateAmp: level >= 8 ? Math.min(0.5 + 0.08 * (level - 8), 1.3) : 0,
    nestHp: Math.round(baseHp * (boss ? 1.5 : 1)),
    waspKills: Math.min(7 + 1.6 * n, 55) * (boss ? 1.2 : 1),
    speed: 9.0 + 0.4 * Math.min(n, 20),
    webLoss: Math.min(12 + Math.floor(level / 3), 30),
    frogLoss: Math.min(18 + Math.floor(level / 3), 45),
    frogSwing: Math.min(1.6 + 0.03 * n, 2.6),
  };
}

// Pre-allocated math helpers (zero GC inside tick loop)
const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

interface GateEntity {
  active: boolean;
  triggered: boolean;
  x: number;
  laneOffset: number;
  pairCenterX: number;
  pairAmp: number;
  pairPhase: number;
  z: number;
  op: GateOperation;
  value: number;
  visual: GateVisual;
}

interface PollenEntity {
  active: boolean;
  x: number;
  z: number;
  phase: number;
  visual: PollenVisual;
}

interface PickupEntity {
  active: boolean;
  kind: PickupKind;
  x: number;
  z: number;
  phase: number;
  sprite: THREE.Sprite;
  shadow: THREE.Mesh;
}

type HazardKind = 'web' | 'frog' | 'toadstool' | 'bramble' | 'hornet' | 'bird' | 'log';

interface HazardEntity {
  active: boolean;
  hit: boolean;
  dodged: boolean;
  kind: HazardKind;
  x: number;
  baseX: number;
  z: number;
  phase: number;
  radius: number;
  halfWidth: number;
  dashDir: number;
  dashed: boolean;
  group: THREE.Group;
  hornetRig?: HornetRig;
  frogRig?: FrogRig;
  spiderRig?: SpiderWebRig;
  birdRig?: BirdRig;
}

interface MilestoneEntity {
  active: boolean;
  triggered: boolean;
  z: number;
  stageNumber: number;
  group: THREE.Group;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  colorHex: number;
}

interface BeeOffset {
  x: number;
  y: number;
  z: number;
  phase: number;
}

function detectSoftwareWebGL(): boolean {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param) || '');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export class SwarmEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private audio: SwarmAudio;

  private isSoftwareGl: boolean;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private textures!: ProceduralTexturePack;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;

  // Lighting, Sky & Biome Surfaces
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private skyMat!: THREE.ShaderMaterial;
  private sunSprite!: THREE.Sprite;
  private stars!: THREE.Points;
  private cloudMat!: THREE.MeshBasicMaterial;
  private cloudMesh!: THREE.InstancedMesh;
  private clouds: {
    x: number;
    y: number;
    z: number;
    puffs: { dx: number; dy: number; dz: number; sx: number; sy: number; sz: number }[];
  }[] = [];
  private ambientPollenGeo!: THREE.BufferGeometry;
  private ambientPollenPositions!: Float32Array;
  private ambientPollenMat!: THREE.PointsMaterial;
  private ambientPollenMesh!: THREE.Points;
  private treeCanopyMat!: THREE.MeshStandardMaterial;
  private groundMat!: THREE.MeshStandardMaterial;
  private pathMat!: THREE.MeshStandardMaterial;

  // World & Swarm
  private queen!: QueenBeeRig;
  private swarmShadow!: THREE.Mesh;
  private shieldBubble!: THREE.Mesh;
  private beeBodyMat!: THREE.MeshStandardMaterial;
  private beeBodyMesh!: THREE.InstancedMesh;
  private beeHeadMesh!: THREE.InstancedMesh;
  private beeWingMesh!: THREE.InstancedMesh;
  private beeOffsets: BeeOffset[] = [];

  private flowerMesh!: THREE.InstancedMesh;
  private flowers: { x: number; z: number; scale: number; phase: number }[] = [];
  private trees: { group: THREE.Group; x: number; z: number }[] = [];

  // Boss Nest, Hornet Queen Boss, Strike Telegraph & Orbiting Guard Wasps
  private nestRig!: WaspNestRig;
  private nestBaseTint = new THREE.Color(0xffffff);
  private bossQueen!: HornetQueenBossRig;
  private warnMesh!: THREE.Mesh;
  private warnMat!: THREE.MeshBasicMaterial;
  private waspMesh!: THREE.InstancedMesh;
  private waspWingMesh!: THREE.InstancedMesh;
  private waspData: { angle: number; radius: number; height: number; speed: number }[] = [];

  // Particle Pool
  private particleMesh!: THREE.InstancedMesh;
  private particles: Particle[] = [];

  // Entity Pools
  private gates: GateEntity[] = [];
  private pollens: PollenEntity[] = [];
  private pickups: PickupEntity[] = [];
  private hazards: HazardEntity[] = [];
  private milestones: MilestoneEntity[] = [];

  // Simulation & Progression state
  private phase: GamePhase = 'title';
  private quality: 'high' | 'low' = 'high';
  private beeCount = 20;
  private peakBees = 20;
  private score = 0;
  private bestScore = 0;
  private bestLevel = 1;
  private distance = 0;
  private stage = 1;
  private unlockedLevel = 1;
  private honey = 0;
  private earnedHoney = 0;
  private bonusRunHoney = 0;
  private earnedStars = 0;
  private upgrades: UpgradeLevels = { bees: 0, power: 0, tough: 0 };
  private beeType: BeeTypeId = 'normal';
  private ownedBeeTypes: BeeTypeId[] = ['normal'];
  private bestStars: Record<string, number> = {};
  private dailyState: { last: string; streak: number } = { last: '', streak: 0 };
  private missionState: { day: string; p: Record<string, number>; c: MissionId[] } = {
    day: '',
    p: {},
    c: [],
  };
  private tutDone = false;
  private seenTips = new Set<string>();
  private tipText: string | null = null;
  private tipTimer = 0;
  private hasSteeredThisRun = false;

  // Power-ups & Boss Strike & Slow-mo Win
  private shieldActive = false;
  private turboTimer = 0;
  private magnetCharges = 0;
  private fightStartBees = 20;
  private warnActive = false;
  private warnX = 0;
  private warnTimer = 0;
  private warnCooldown = 1.8;
  private winTimer = 0;
  private winBoomDone = false;
  private winFireworkAccum = 0;

  private gatesSpawnedInStage = 0;
  private gatesClearedInStage = 0;
  private nestActive = false;
  private bossFight = false;
  private nestZ = SPAWN_Z;
  private nestHp = 150;
  private nestMaxHp = 150;
  private fightBees = 20;
  private bossSparkAccum = 0;
  private combo = 0;
  private comboTimer = 0;
  private surgeCharge = 50;
  private surgeActive = false;
  private surgeTimer = 0;
  private invulnTimer = 0;
  private hitstopTimer = 0;
  private hitFlashTimer = 0;
  private cameraTrauma = 0;
  private swarmPopScale = 1;

  private targetX = 0;
  private swarmX = 0;
  private swarmYOffset = 0;
  private swarmZOffset = 0;
  private prevSwarmX = 0;
  private bankAngle = 0;

  private spawnDistanceAccum = 0;
  private waveIndex = 0;

  private levelBanner: LevelBannerInfo | null = null;
  private levelBannerId = 0;
  private lastEventText: string | null = null;
  private lastEventTone: 'positive' | 'negative' | 'gold' | null = null;
  private lastEventId = 0;

  // Input state
  private heldKeys = new Set<string>();
  private pointerId: number | null = null;
  private lastPointerX = 0;

  // Loop & timing
  private frameId = 0;
  private disposed = false;
  private prevTime = 0;
  private simTime = 0;
  private hudEmitAccum = 0;

  // Bound event listeners
  private handleResizeBound: () => void;
  private handleKeyDownBound: (e: KeyboardEvent) => void;
  private handleKeyUpBound: (e: KeyboardEvent) => void;
  private handleBlurBound: () => void;
  private handlePointerDownBound: (e: PointerEvent) => void;
  private handlePointerMoveBound: (e: PointerEvent) => void;
  private handlePointerUpBound: (e: PointerEvent) => void;

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.audio = new SwarmAudio();
    this.isSoftwareGl = detectSoftwareWebGL();

    this.loadProgress();
    this.ensureMissionDay();
    this.stage = this.unlockedLevel;
    this.beeCount = this.getStartBees();
    this.peakBees = this.beeCount;

    this.handleResizeBound = this.onResize.bind(this);
    this.handleKeyDownBound = this.onKeyDown.bind(this);
    this.handleKeyUpBound = this.onKeyUp.bind(this);
    this.handleBlurBound = this.onWindowBlur.bind(this);
    this.handlePointerDownBound = this.onPointerDown.bind(this);
    this.handlePointerMoveBound = this.onPointerMove.bind(this);
    this.handlePointerUpBound = this.onPointerUp.bind(this);

    this.initScene();
    this.initPools();
    this.applyBeeTypeVisuals();
    this.bindEvents();
    this.emitHud(true);

    this.prevTime = performance.now();
    this.tick();
  }

  private getStartBees(): number {
    const classDelta = BEE_TYPES[this.beeType]?.start ?? 0;
    return Math.min(MAX_BEES, Math.max(5, 20 + this.upgrades.bees * 5 + classDelta));
  }

  private ensureMissionDay(): void {
    const today = dayKey();
    if (this.missionState.day !== today) {
      this.missionState = { day: today, p: {}, c: [] };
      this.saveProgress();
    }
  }

  private addMissionProgress(id: MissionId, amount = 1): void {
    this.ensureMissionDay();
    const cur = this.missionState.p[id] || 0;
    this.missionState.p[id] = cur + amount;
  }

  private loadProgress(): void {
    let legacyBest = 0;
    try {
      legacyBest = Number(window.localStorage.getItem('meadow_swarm_best') || '0') || 0;
    } catch {
      legacyBest = 0;
    }

    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SavedProgress>;
        this.honey = Math.max(0, Math.floor(Number(parsed.honey) || 0));
        this.unlockedLevel = Math.max(1, Math.floor(Number(parsed.level) || 1));
        this.bestLevel = Math.max(this.unlockedLevel, Math.floor(Number(parsed.best) || 1));
        this.bestScore = Math.max(legacyBest, Math.floor(Number(parsed.bestScore) || 0));
        this.quality = parsed.quality === 'low' ? 'low' : 'high';
        const up = parsed.up;
        this.upgrades = {
          bees: THREE.MathUtils.clamp(Math.floor(Number(up?.bees) || 0), 0, 20),
          power: THREE.MathUtils.clamp(Math.floor(Number(up?.power) || 0), 0, 20),
          tough: THREE.MathUtils.clamp(Math.floor(Number(up?.tough) || 0), 0, 5),
        };
        const ownedRaw = Array.isArray(parsed.owned)
          ? parsed.owned.filter((t): t is BeeTypeId => t in BEE_TYPES)
          : ['normal' as BeeTypeId];
        this.ownedBeeTypes = ownedRaw.includes('normal') ? ownedRaw : ['normal', ...ownedRaw];
        this.beeType =
          parsed.type && parsed.type in BEE_TYPES && this.ownedBeeTypes.includes(parsed.type)
            ? parsed.type
            : 'normal';
        this.bestStars = parsed.stars && typeof parsed.stars === 'object' ? { ...parsed.stars } : {};
        this.dailyState =
          parsed.daily && typeof parsed.daily === 'object'
            ? {
                last: String(parsed.daily.last || ''),
                streak: Math.max(0, Math.floor(Number(parsed.daily.streak) || 0)),
              }
            : { last: '', streak: 0 };
        this.missionState =
          parsed.mis && typeof parsed.mis === 'object'
            ? {
                day: String(parsed.mis.day || ''),
                p: parsed.mis.p && typeof parsed.mis.p === 'object' ? { ...parsed.mis.p } : {},
                c: Array.isArray(parsed.mis.c) ? [...parsed.mis.c] : [],
              }
            : { day: dayKey(), p: {}, c: [] };
        this.tutDone = Boolean(parsed.tut);
        this.seenTips = new Set(Array.isArray(parsed.tips) ? parsed.tips : []);
        return;
      }
    } catch {
      // ignore corrupted save
    }

    this.honey = 0;
    this.unlockedLevel = 1;
    this.bestLevel = 1;
    this.bestScore = legacyBest;
    this.quality = 'high';
    this.upgrades = { bees: 0, power: 0, tough: 0 };
    this.beeType = 'normal';
    this.ownedBeeTypes = ['normal'];
    this.bestStars = {};
    this.dailyState = { last: '', streak: 0 };
    this.missionState = { day: dayKey(), p: {}, c: [] };
    this.tutDone = false;
    this.seenTips = new Set();
  }

  private saveProgress(): void {
    const payload: SavedProgress = {
      honey: this.honey,
      level: this.unlockedLevel,
      best: Math.max(this.bestLevel, this.unlockedLevel),
      bestScore: this.bestScore,
      quality: this.quality,
      up: { ...this.upgrades },
      type: this.beeType,
      owned: [...this.ownedBeeTypes],
      stars: { ...this.bestStars },
      daily: { ...this.dailyState },
      mis: {
        day: this.missionState.day,
        p: { ...this.missionState.p },
        c: [...this.missionState.c],
      },
      tut: this.tutDone,
      tips: Array.from(this.seenTips),
    };
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      window.localStorage.setItem('meadow_swarm_best', String(this.bestScore));
    } catch {
      // ignore storage error
    }
  }

  private applyQualitySetting(): void {
    const isHigh = this.quality === 'high' && !this.isSoftwareGl;
    if (this.renderer) {
      this.renderer.setPixelRatio(isHigh ? Math.min(window.devicePixelRatio, 2) : 1);
      const width = Math.max(1, this.container.clientWidth || window.innerWidth);
      const height = Math.max(1, this.container.clientHeight || window.innerHeight);
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = isHigh;
    }
    if (this.sunLight) this.sunLight.castShadow = isHigh;
    if (this.ambientPollenMesh) this.ambientPollenMesh.visible = this.quality === 'high';
  }

  private applyBiomeTheme(level: number): BiomeTheme {
    const theme = getBiomeTheme(level);
    if (this.scene) {
      this.scene.background = new THREE.Color(theme.skyBottom);
      if (this.scene.fog instanceof THREE.Fog) {
        this.scene.fog.color.setHex(theme.skyBottom);
      }
    }
    if (this.skyMat) {
      (this.skyMat.uniforms.top.value as THREE.Color).setHex(theme.skyTop);
      (this.skyMat.uniforms.bottom.value as THREE.Color).setHex(theme.skyBottom);
    }
    if (this.sunSprite) {
      (this.sunSprite.material as THREE.SpriteMaterial).color.setHex(theme.sunColor);
      this.sunSprite.scale.setScalar(theme.night ? 34 : 72);
    }
    if (this.stars) this.stars.visible = theme.night;
    if (this.cloudMat) this.cloudMat.color.setHex(theme.cloudColor);
    if (this.treeCanopyMat) this.treeCanopyMat.color.setHex(theme.leafTint);
    if (this.ambientPollenMat) {
      this.ambientPollenMat.color.setHex(theme.pollenColor);
      this.ambientPollenMat.size = theme.night ? 0.5 : 0.24;
    }
    if (this.groundMat) this.groundMat.color.setHex(theme.groundTint);
    if (this.pathMat) this.pathMat.color.setHex(theme.pathTint);
    if (this.hemiLight) this.hemiLight.intensity = 0.95 * theme.light;
    if (this.sunLight) {
      this.sunLight.color.setHex(theme.sunColor);
      this.sunLight.intensity = 1.45 * theme.light;
    }
    if (this.rimLight) this.rimLight.intensity = 0.45 * theme.light;
    return theme;
  }

  private initScene(): void {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcfeaff);
    this.scene.fog = new THREE.Fog(0xcfeaff, 34, 98);

    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 220);
    this.camera.position.set(0, 4.6, 8.6);
    this.camera.lookAt(0, 1.2, -12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // Mandatory studio environment reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    pmrem.dispose();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTexturePack(maxAniso);

    // Gradient Sky Dome + Sun Glow Sprite + Night Stars + Drifting Clouds
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color(0x3d8fe0) },
        bottom: { value: new THREE.Color(0xcfeaff) },
      },
      vertexShader:
        'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ float k = clamp(h*1.6,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(k,0.7)),1.0); }',
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 16), this.skyMat);
    skyDome.frustumCulled = false;
    skyDome.renderOrder = -2;
    this.scene.add(skyDome);

    this.sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.textures.glow,
        color: 0xfff1d0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        transparent: true,
      }),
    );
    this.sunSprite.position.set(-45, 48, -130);
    this.sunSprite.scale.setScalar(72);
    this.sunSprite.renderOrder = -1;
    this.scene.add(this.sunSprite);

    const starPos: number[] = [];
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2;
      const elev = 0.15 + Math.random() * 1.2;
      starPos.push(
        Math.cos(a) * Math.cos(elev) * 140,
        Math.sin(elev) * 140,
        Math.sin(a) * Math.cos(elev) * 140,
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 2.2,
        sizeAttenuation: false,
        color: 0xffffff,
        fog: false,
        depthWrite: false,
      }),
    );
    this.stars.visible = false;
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -1;
    this.scene.add(this.stars);

    this.cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      fog: false,
      depthWrite: false,
    });
    this.cloudMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      this.cloudMat,
      CLOUD_COUNT * CLOUD_PUFFS,
    );
    this.cloudMesh.frustumCulled = false;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const puffs = [];
      for (let k = 0; k < CLOUD_PUFFS; k++) {
        puffs.push({
          dx: (k - 2) * 5 + Math.random() * 3,
          dy: Math.random() * 2,
          dz: Math.random() * 3,
          sx: 5 + Math.random() * 4,
          sy: 2.5 + Math.random() * 1.5,
          sz: 3 + Math.random() * 2,
        });
      }
      this.clouds.push({
        x: -100 + Math.random() * 200,
        y: 28 + Math.random() * 18,
        z: -75 - Math.random() * 65,
        puffs,
      });
    }
    this.scene.add(this.cloudMesh);

    // Warm/Cool 3-point sunlit outdoor lighting rig
    this.hemiLight = new THREE.HemisphereLight(0xdff4ff, 0x3f7533, 0.95);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1cf, 1.45);
    this.sunLight.position.set(12, 22, 14);
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 55;
    this.sunLight.shadow.camera.left = -16;
    this.sunLight.shadow.camera.right = 16;
    this.sunLight.shadow.camera.top = 16;
    this.sunLight.shadow.camera.bottom = -16;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0xbbe6ff, 0.45);
    this.rimLight.position.set(-10, 8, -14);
    this.scene.add(this.rimLight);

    // Rolling Meadow Ground, Flight Path & Dirt Edges
    const groundGeo = new THREE.PlaneGeometry(240, 220);
    this.groundMat = new THREE.MeshStandardMaterial({
      map: this.textures.meadowGround,
      roughness: 0.92,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -40);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const pathGeo = new THREE.PlaneGeometry(PATH_HALF_WIDTH * 2, 220);
    this.pathMat = new THREE.MeshStandardMaterial({
      map: this.textures.pathSurface,
      roughness: 0.86,
      metalness: 0.0,
    });
    const path = new THREE.Mesh(pathGeo, this.pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.025, -40);
    path.receiveShadow = true;
    this.scene.add(path);

    const edgeGeo = new THREE.PlaneGeometry(0.65, 220);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      transparent: true,
      opacity: 0.28,
      roughness: 1,
    });
    [-1, 1].forEach((side) => {
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(side * (PATH_HALF_WIDTH + 0.08), 0.032, -40);
      this.scene.add(edge);
    });

    // Ambient Floating Pollen / Night Fireflies
    this.ambientPollenPositions = new Float32Array(AMBIENT_POLLEN_COUNT * 3);
    for (let i = 0; i < AMBIENT_POLLEN_COUNT; i++) {
      this.ambientPollenPositions[i * 3] = (Math.random() - 0.5) * 26;
      this.ambientPollenPositions[i * 3 + 1] = 0.5 + Math.random() * 6.5;
      this.ambientPollenPositions[i * 3 + 2] = -60 + Math.random() * 72;
    }
    this.ambientPollenGeo = new THREE.BufferGeometry();
    this.ambientPollenGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.ambientPollenPositions, 3),
    );
    this.ambientPollenMat = new THREE.PointsMaterial({
      size: 0.24,
      map: this.textures.glow,
      color: 0xfff2a0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ambientPollenMesh = new THREE.Points(this.ambientPollenGeo, this.ambientPollenMat);
    this.ambientPollenMesh.frustumCulled = false;
    this.scene.add(this.ambientPollenMesh);

    // Meadow Wildflowers (InstancedMesh with +/-15% scale & vibrant palette)
    const flowerGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.02,
    });
    this.flowerMesh = new THREE.InstancedMesh(flowerGeo, flowerMat, FLOWER_COUNT);
    this.flowerMesh.frustumCulled = false;
    const palette = [0xff5c8a, 0xfff8e7, 0xb36bff, 0xff9f43, 0xffe047];
    for (let i = 0; i < FLOWER_COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.flowers.push({
        x: side * (5.2 + Math.random() * 26),
        z: SPAWN_Z + Math.random() * (DESPAWN_Z - SPAWN_Z),
        scale: 0.85 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
      _color.setHex(palette[i % palette.length]);
      this.flowerMesh.setColorAt(i, _color);
    }
    if (this.flowerMesh.instanceColor) this.flowerMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.flowerMesh);

    // Perimeter Meadow Trees (shared biome-tintable canopy material)
    this.treeCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x3f9a45,
      roughness: 0.8,
      metalness: 0.02,
      flatShading: true,
    });
    for (let i = 0; i < TREE_COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (8.5 + (i % 5) * 3.8 + Math.random() * 2.5);
      const z = SPAWN_Z + (i / TREE_COUNT) * (DESPAWN_Z - SPAWN_Z);
      const tree = createMeadowTreeGroup(this.textures, this.treeCanopyMat);
      const sc = 0.85 + (i % 4) * 0.16;
      tree.scale.setScalar(sc);
      tree.position.set(x, 0, z);
      tree.rotation.y = (i * 1.7) % (Math.PI * 2);
      this.scene.add(tree);
      this.trees.push({ group: tree, x, z });
    }

    this.applyBiomeTheme(this.stage);
    this.applyQualitySetting();

    // Queen Bee Hero + Ground Contact Shadow
    this.queen = createQueenBeeGroup(this.textures);
    this.queen.group.position.set(0, 1.38, 0.35);
    this.scene.add(this.queen.group);

    // Ground contact shadow & 3D Shield Bubble
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.textures.contactShadow,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.swarmShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.swarmShadow.rotation.x = -Math.PI / 2;
    this.swarmShadow.position.set(0, 0.035, 0.3);
    this.scene.add(this.swarmShadow);

    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    this.shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), bubbleMat);
    this.shieldBubble.visible = false;
    this.scene.add(this.shieldBubble);

    // Instanced Worker Bees (3 synchronized parts: striped body, dark head, flapping wings)
    const bodyGeo = new THREE.SphereGeometry(0.15, 10, 8);
    bodyGeo.scale(0.9, 0.85, 1.32);
    this.beeBodyMat = new THREE.MeshStandardMaterial({
      map: this.textures.beeStripe,
      roughness: 0.4,
      metalness: 0.08,
    });
    this.beeBodyMesh = new THREE.InstancedMesh(bodyGeo, this.beeBodyMat, MAX_RENDER_BEES);
    this.beeBodyMesh.castShadow = !this.isSoftwareGl;
    this.beeBodyMesh.frustumCulled = false;

    const headGeo = new THREE.SphereGeometry(0.095, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x221914,
      roughness: 0.32,
      metalness: 0.18,
    });
    this.beeHeadMesh = new THREE.InstancedMesh(headGeo, headMat, MAX_RENDER_BEES);
    this.beeHeadMesh.frustumCulled = false;

    const wingGeo = createInstancedWingGeometry();
    const wingMat = new THREE.MeshPhysicalMaterial({
      color: 0xeaf7ff,
      roughness: 0.15,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.beeWingMesh = new THREE.InstancedMesh(wingGeo, wingMat, MAX_RENDER_BEES);
    this.beeWingMesh.frustumCulled = false;

    this.scene.add(this.beeBodyMesh, this.beeHeadMesh, this.beeWingMesh);

    // Vogel phyllotaxis swarm offsets (supports up to 300 bees tightly packed)
    for (let i = 0; i < MAX_RENDER_BEES; i++) {
      const r = 0.165 * Math.sqrt(i + 1.5);
      const a = i * 2.39996;
      this.beeOffsets.push({
        x: Math.cos(a) * r,
        y: ((i % 5) - 2) * 0.1,
        z: Math.sin(a) * r * 0.92 + 0.35,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Pooled 3D Particle Bursts
    const partGeo = new THREE.OctahedronGeometry(0.11, 0);
    const partMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      emissive: 0x332200,
      emissiveIntensity: 0.25,
    });
    this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, PARTICLE_POOL_SIZE);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -20,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        size: 1,
        colorHex: 0xffd54f,
      });
      _color.setHex(0xffd54f);
      this.particleMesh.setColorAt(i, _color);
    }
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);

    // Wasp Nest + Giant Hornet Queen Boss + Orbiting Guard Wasps
    this.nestRig = createWaspNestGroup(this.textures);
    this.nestRig.group.visible = false;
    this.nestRig.group.position.set(0, NEST_Y, SPAWN_Z);
    this.scene.add(this.nestRig.group);

    this.bossQueen = createHornetQueenBossGroup();
    this.bossQueen.group.visible = false;
    this.scene.add(this.bossQueen.group);

    // Boss Danger Strike Lane Warning Mesh
    this.warnMat = new THREE.MeshBasicMaterial({
      color: 0xff2a2a,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const warnGeo = new THREE.PlaneGeometry(2.6, 13);
    warnGeo.rotateX(-Math.PI / 2);
    this.warnMesh = new THREE.Mesh(warnGeo, this.warnMat);
    this.warnMesh.position.set(0, 0.045, -3.5);
    this.warnMesh.visible = false;
    this.scene.add(this.warnMesh);

    const waspGeo = new THREE.SphereGeometry(0.22, 8, 8);
    waspGeo.scale(0.85, 0.85, 1.35);
    const waspMat = new THREE.MeshStandardMaterial({
      map: this.textures.hornetStripe,
      roughness: 0.36,
      metalness: 0.14,
    });
    this.waspMesh = new THREE.InstancedMesh(waspGeo, waspMat, WASP_COUNT);
    this.waspMesh.frustumCulled = false;
    this.waspMesh.visible = false;
    this.waspWingMesh = new THREE.InstancedMesh(wingGeo, wingMat, WASP_COUNT);
    this.waspWingMesh.frustumCulled = false;
    this.waspWingMesh.visible = false;
    for (let i = 0; i < WASP_COUNT; i++) {
      this.waspData.push({
        angle: Math.random() * Math.PI * 2,
        radius: 3.7 + Math.random() * 1.3,
        height: (Math.random() - 0.5) * 4.0,
        speed: 1.0 + Math.random() * 1.0,
      });
    }
    this.scene.add(this.waspMesh, this.waspWingMesh);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private initPools(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    for (let i = 0; i < 8; i++) {
      const visual = createGateGroup(this.textures, maxAniso);
      visual.group.visible = false;
      this.scene.add(visual.group);
      this.gates.push({
        active: false,
        triggered: false,
        x: 0,
        laneOffset: 0,
        pairCenterX: 0,
        pairAmp: 0,
        pairPhase: 0,
        z: 0,
        op: 'add',
        value: 8,
        visual,
      });
    }

    for (let i = 0; i < 24; i++) {
      const visual = createPollenBlossomGroup();
      visual.group.visible = false;
      this.scene.add(visual.group);
      this.pollens.push({
        active: false,
        x: 0,
        z: 0,
        phase: i * 0.7,
        visual,
      });
    }

    const pShadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
    pShadowGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.textures.pickups.shield,
          transparent: true,
          depthWrite: false,
        }),
      );
      sprite.scale.setScalar(1.45);
      sprite.visible = false;
      this.scene.add(sprite);

      const shadow = new THREE.Mesh(
        pShadowGeo,
        new THREE.MeshBasicMaterial({
          map: this.textures.contactShadow,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        }),
      );
      shadow.visible = false;
      this.scene.add(shadow);

      this.pickups.push({
        active: false,
        kind: 'shield',
        x: 0,
        z: 0,
        phase: i * 0.9,
        sprite,
        shadow,
      });
    }

    const hazardRoster: HazardKind[] = [
      'web', 'web', 'web', 'web', 'web', 'web', 'web', 'web',
      'frog', 'frog', 'frog', 'frog', 'frog', 'frog', 'frog', 'frog',
      'toadstool', 'toadstool', 'toadstool', 'toadstool',
      'bramble', 'bramble', 'bramble', 'bramble',
      'hornet', 'hornet', 'hornet', 'hornet',
      'bird', 'bird', 'bird', 'bird', 'bird', 'bird',
      'log', 'log', 'log', 'log', 'log', 'log',
    ];

    for (let i = 0; i < hazardRoster.length; i++) {
      const kind = hazardRoster[i];
      let group: THREE.Group;
      let hornetRig: HornetRig | undefined;
      let frogRig: FrogRig | undefined;
      let spiderRig: SpiderWebRig | undefined;
      let birdRig: BirdRig | undefined;
      let radius = 0.82;
      let halfWidth = 0.8;

      if (kind === 'web') {
        spiderRig = createSpiderWebGroup(this.textures);
        group = spiderRig.group;
        radius = 0.65;
        halfWidth = 1.45;
      } else if (kind === 'frog') {
        frogRig = createFrogGroup(this.textures);
        group = frogRig.group;
        radius = 0.82;
        halfWidth = 0.85;
      } else if (kind === 'toadstool') {
        group = createToadstoolGroup(this.textures);
        radius = 0.85;
        halfWidth = 0.85;
      } else if (kind === 'bramble') {
        group = createBrambleLogGroup(this.textures);
        radius = 0.52;
        halfWidth = 1.05;
      } else if (kind === 'bird') {
        birdRig = createBirdGroup();
        group = birdRig.group;
        radius = 0.85;
        halfWidth = 0.95;
      } else if (kind === 'log') {
        group = createRollingLogGroup(this.textures);
        radius = 0.72;
        halfWidth = 0.95;
      } else {
        hornetRig = createHornetGroup(this.textures);
        group = hornetRig.group;
        radius = 0.72;
        halfWidth = 0.72;
      }

      group.visible = false;
      this.scene.add(group);
      this.hazards.push({
        active: false,
        hit: false,
        dodged: false,
        kind,
        x: 0,
        baseX: 0,
        z: 0,
        phase: i * 1.15,
        radius,
        halfWidth,
        dashDir: 1,
        dashed: false,
        group,
        hornetRig,
        frogRig,
        spiderRig,
        birdRig,
      });
    }

    for (let i = 0; i < 2; i++) {
      const group = createMilestoneArchGroup(this.textures);
      group.visible = false;
      this.scene.add(group);
      this.milestones.push({
        active: false,
        triggered: false,
        z: 0,
        stageNumber: 1,
        group,
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResizeBound);
    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    window.addEventListener('blur', this.handleBlurBound);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDownBound);
    window.addEventListener('pointermove', this.handlePointerMoveBound);
    window.addEventListener('pointerup', this.handlePointerUpBound);
    window.addEventListener('pointercancel', this.handlePointerUpBound);
  }

  private onResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.applyQualitySetting();
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.audio.unlock();
    this.heldKeys.add(e.code);

    if (e.code === 'Space' && !e.repeat) {
      if (this.phase === 'title') {
        e.preventDefault();
        this.startNewRun();
        return;
      }
      if (this.phase === 'gameover') {
        e.preventDefault();
        this.retryLevel();
        return;
      }
      if (this.phase === 'victory') {
        e.preventDefault();
        this.advanceNextStage();
        return;
      }
      if (this.phase === 'playing') {
        e.preventDefault();
        this.triggerSurge();
        return;
      }
    }

    if (e.code === 'Enter' && !e.repeat) {
      if (this.phase === 'title') {
        e.preventDefault();
        this.startNewRun();
        return;
      }
      if (this.phase === 'gameover') {
        e.preventDefault();
        this.retryLevel();
        return;
      }
      if (this.phase === 'victory') {
        e.preventDefault();
        this.advanceNextStage();
        return;
      }
    }

    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      if (this.phase === 'playing') {
        this.pauseGame();
      } else if (this.phase === 'paused') {
        this.resumeGame();
      }
    }

    if (e.code === 'KeyM' && !e.repeat) {
      this.toggleMute();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.heldKeys.delete(e.code);
  }

  private onWindowBlur(): void {
    this.heldKeys.clear();
    this.pointerId = null;
  }

  private onPointerDown(e: PointerEvent): void {
    this.audio.unlock();
    if (this.phase !== 'playing') return;
    this.pointerId = e.pointerId;
    this.lastPointerX = e.clientX;
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.pointerId !== e.pointerId || this.phase !== 'playing') return;
    const dx = e.clientX - this.lastPointerX;
    this.lastPointerX = e.clientX;
    if (Math.abs(dx) > 1.5) {
      this.markSteered();
    }
    const steerMult = BEE_TYPES[this.beeType]?.steer ?? 1;
    const sensitivity = (10.5 * steerMult) / Math.max(320, window.innerWidth);
    this.targetX = THREE.MathUtils.clamp(this.targetX + dx * sensitivity * 1.15, -STEER_LIMIT, STEER_LIMIT);
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.pointerId === e.pointerId) {
      this.pointerId = null;
    }
  }

  private markSteered(): void {
    this.hasSteeredThisRun = true;
    if (!this.tutDone) {
      this.tutDone = true;
      this.saveProgress();
    }
  }

  private showTip(id: string, text: string, duration = 3.2, forceRepeat = false): void {
    if (!forceRepeat && this.seenTips.has(id)) return;
    if (!forceRepeat) {
      this.seenTips.add(id);
      this.saveProgress();
    }
    this.tipText = text;
    this.tipTimer = duration;
  }

  private applyBeeTypeVisuals(): void {
    const tex = this.textures.beeStripes[this.beeType] || this.textures.beeStripe;
    if (this.beeBodyMat) {
      this.beeBodyMat.map = tex;
      this.beeBodyMat.needsUpdate = true;
    }
    if (this.queen?.abdomen) {
      const mat = this.queen.abdomen.material as THREE.MeshStandardMaterial;
      mat.map = tex;
      mat.needsUpdate = true;
    }
  }

  public startNewRun(): void {
    this.audio.unlock();
    this.phase = 'playing';
    this.stage = this.unlockedLevel;
    this.beeCount = this.getStartBees();
    this.peakBees = this.beeCount;
    this.score = 0;
    this.distance = 0;
    this.earnedHoney = 0;
    this.bonusRunHoney = 0;
    this.earnedStars = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.surgeCharge = 50;
    this.surgeActive = false;
    this.surgeTimer = 0;
    this.hasSteeredThisRun = false;
    this.setupStageRun(true);
    this.audio.setMusicState(true, false);
    this.emitHud(true);
  }

  public retryLevel(): void {
    this.audio.unlock();
    this.phase = 'playing';
    this.stage = this.unlockedLevel;
    this.beeCount = this.getStartBees();
    this.peakBees = this.beeCount;
    this.score = 0;
    this.distance = 0;
    this.earnedHoney = 0;
    this.bonusRunHoney = 0;
    this.earnedStars = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.surgeCharge = 50;
    this.surgeActive = false;
    this.surgeTimer = 0;
    this.hasSteeredThisRun = false;
    this.setupStageRun(true);
    this.audio.setMusicState(true, false);
    this.emitHud(true);
  }

  public advanceNextStage(): void {
    this.audio.unlock();
    this.stage = this.unlockedLevel;
    this.beeCount = this.getStartBees();
    this.peakBees = Math.max(this.peakBees, this.beeCount);
    this.earnedHoney = 0;
    this.bonusRunHoney = 0;
    this.earnedStars = 0;
    this.phase = 'playing';
    this.setupStageRun(false);
    this.audio.setMusicState(true, false);
    this.emitHud(true);
  }

  public buyUpgrade(id: UpgradeId): void {
    this.audio.unlock();
    const def = UPGRADE_DEFS.find((u) => u.id === id);
    if (!def) return;
    const lvl = this.upgrades[id];
    const cost = def.baseCost * (lvl + 1);
    if (lvl >= def.max || this.honey < cost) return;

    this.honey -= cost;
    this.upgrades = { ...this.upgrades, [id]: lvl + 1 };
    if (this.phase === 'title') {
      this.beeCount = this.getStartBees();
      this.peakBees = this.beeCount;
    }
    this.saveProgress();
    this.audio.playUpgrade();
    this.emitHud(true);
  }

  public buyOrEquipBeeType(id: BeeTypeId): void {
    this.audio.unlock();
    const def = BEE_TYPES[id];
    if (!def) return;
    if (this.ownedBeeTypes.includes(id)) {
      if (this.beeType === id) return;
      this.beeType = id;
      this.audio.playClick();
    } else {
      if (this.honey < def.cost) return;
      this.honey -= def.cost;
      this.ownedBeeTypes = [...this.ownedBeeTypes, id];
      this.beeType = id;
      this.audio.playUpgrade();
    }
    this.applyBeeTypeVisuals();
    if (this.phase === 'title') {
      this.beeCount = this.getStartBees();
      this.peakBees = this.beeCount;
    }
    this.saveProgress();
    this.emitHud(true);
  }

  public claimDailyGift(): void {
    this.audio.unlock();
    const today = dayKey();
    if (this.dailyState.last === today) return;

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const prevKey = dayKey(yest);
    const nextStreak = this.dailyState.last === prevKey ? Math.min(7, this.dailyState.streak + 1) : 1;
    const reward = 30 + 10 * (nextStreak - 1);

    this.dailyState = { last: today, streak: nextStreak };
    this.honey += reward;
    this.saveProgress();
    this.audio.playMilestone();
    this.emitHud(true);
  }

  public claimMission(id: MissionId): void {
    this.audio.unlock();
    this.ensureMissionDay();
    const defs = getTodaysMissionDefs(this.missionState.day);
    const def = defs.find((m) => m.id === id);
    if (!def) return;
    const progress = this.missionState.p[id] || 0;
    if (progress < def.target || this.missionState.c.includes(id)) return;

    this.missionState.c = [...this.missionState.c, id];
    this.honey += def.reward;
    this.saveProgress();
    this.audio.playUpgrade();
    this.emitHud(true);
  }

  public resetProgress(): void {
    this.audio.unlock();
    this.honey = 0;
    this.earnedHoney = 0;
    this.bonusRunHoney = 0;
    this.earnedStars = 0;
    this.unlockedLevel = 1;
    this.bestLevel = 1;
    this.stage = 1;
    this.bestScore = 0;
    this.upgrades = { bees: 0, power: 0, tough: 0 };
    this.beeType = 'normal';
    this.ownedBeeTypes = ['normal'];
    this.bestStars = {};
    this.dailyState = { last: '', streak: 0 };
    this.missionState = { day: dayKey(), p: {}, c: [] };
    this.tutDone = false;
    this.seenTips.clear();
    this.applyBeeTypeVisuals();
    this.saveProgress();
    if (this.phase === 'title') {
      this.applyBiomeTheme(1);
      this.beeCount = this.getStartBees();
      this.peakBees = this.beeCount;
      this.emitHud(true);
    } else {
      this.startNewRun();
    }
  }

  private setupStageRun(isFirstStage: boolean): void {
    const cfg = getLevelConfig(this.stage);
    const theme = this.applyBiomeTheme(this.stage);

    this.gatesSpawnedInStage = 1;
    this.gatesClearedInStage = 0;
    this.nestActive = false;
    this.bossFight = false;
    this.nestZ = SPAWN_Z;
    this.nestMaxHp = cfg.nestHp;
    this.nestHp = this.nestMaxHp;
    this.nestRig.group.visible = false;
    this.nestBaseTint.setHex(cfg.boss ? 0xd8907e : 0xffffff);
    this.nestRig.bodyMat.color.copy(this.nestBaseTint);
    this.bossQueen.group.visible = false;
    this.waspMesh.count = cfg.boss ? WASP_COUNT : 18;
    this.waspMesh.visible = false;
    this.waspWingMesh.count = this.waspMesh.count;
    this.waspWingMesh.visible = false;

    this.levelBannerId += 1;
    if (cfg.boss) {
      this.levelBanner = {
        id: this.levelBannerId,
        title: 'BOSS: Hornet Queen',
        subtitle: `Level ${this.stage} · ${theme.name}`,
        isBoss: true,
      };
      this.audio.playBossIntro();
    } else {
      this.levelBanner = {
        id: this.levelBannerId,
        title: `Level ${this.stage}`,
        subtitle: theme.name,
        isBoss: false,
      };
    }

    this.invulnTimer = 0;
    this.hitstopTimer = 0;
    this.hitFlashTimer = 0;
    this.cameraTrauma = 0;
    this.swarmPopScale = 1.18;
    this.shieldActive = false;
    this.turboTimer = 0;
    this.magnetCharges = 0;
    this.warnActive = false;
    this.warnTimer = 0;
    this.warnCooldown = 1.8;
    this.warnMesh.visible = false;
    this.shieldBubble.visible = false;
    this.tipText = null;
    this.tipTimer = 0;
    this.targetX = 0;
    this.swarmX = 0;
    this.swarmYOffset = 0;
    this.swarmZOffset = 0;
    this.prevSwarmX = 0;
    this.bankAngle = 0;
    this.spawnDistanceAccum = 0;
    this.waveIndex = 3;
    if (isFirstStage) {
      this.lastEventText = null;
      this.lastEventTone = null;
    }

    this.clearEntities();
    this.spawnPollenArc(-22, 0);
    this.spawnGatePair(-42);
    this.spawnHazardWave(-56);
    this.spawnHazardWave(-69);
    this.spawnHazardWave(-82);

    if (!this.tutDone) {
      this.showTip('drag', 'Drag left or right to steer your swarm!', 3.2);
    }
  }

  public pauseGame(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.heldKeys.clear();
    this.pointerId = null;
    this.audio.updateHum(false, this.beeCount, 0, false);
    this.audio.setMusicState(false, false);
    this.emitHud(true);
  }

  public resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.audio.unlock();
    this.phase = 'playing';
    this.prevTime = performance.now();
    this.audio.setMusicState(true, this.bossFight);
    this.emitHud(true);
  }

  public returnToTitle(): void {
    this.phase = 'title';
    this.stage = this.unlockedLevel;
    this.applyBiomeTheme(this.stage);
    this.beeCount = this.getStartBees();
    this.peakBees = this.beeCount;
    this.earnedHoney = 0;
    this.bonusRunHoney = 0;
    this.earnedStars = 0;
    this.levelBanner = null;
    this.tipText = null;
    this.tipTimer = 0;
    this.targetX = 0;
    this.swarmYOffset = 0;
    this.swarmZOffset = 0;
    this.surgeActive = false;
    this.shieldActive = false;
    this.turboTimer = 0;
    this.magnetCharges = 0;
    this.warnActive = false;
    this.warnMesh.visible = false;
    this.shieldBubble.visible = false;
    this.nestActive = false;
    this.bossFight = false;
    this.nestRig.group.visible = false;
    this.bossQueen.group.visible = false;
    this.waspMesh.visible = false;
    this.waspWingMesh.visible = false;
    this.clearEntities();
    this.audio.updateHum(false, this.beeCount, 0, false);
    this.audio.setMusicState(false, false);
    this.emitHud(true);
  }

  public toggleMute(): void {
    this.audio.unlock();
    this.audio.toggleMute();
    this.emitHud(true);
  }

  public toggleQuality(): void {
    this.audio.unlock();
    this.audio.playClick();
    this.quality = this.quality === 'high' ? 'low' : 'high';
    this.saveProgress();
    this.applyQualitySetting();
    this.emitHud(true);
  }

  public triggerSurge(): void {
    if (this.phase !== 'playing' || this.surgeActive || this.surgeCharge < 100) return;
    this.surgeCharge = 0;
    this.surgeActive = true;
    this.surgeTimer = 4.6;
    this.swarmPopScale = 1.28;
    this.cameraTrauma = Math.max(this.cameraTrauma, 0.22);
    this.audio.playSurge();
    this.spawnBurst(this.swarmX, 1.35, 0.35, 26, 0xffd740);
    this.pushEvent('BUZZ SURGE!', 'gold');
    this.emitHud(true);
  }

  private clearEntities(): void {
    for (const g of this.gates) {
      g.active = false;
      g.visual.group.visible = false;
    }
    for (const p of this.pollens) {
      p.active = false;
      p.visual.group.visible = false;
    }
    for (const pk of this.pickups) {
      pk.active = false;
      pk.sprite.visible = false;
      pk.shadow.visible = false;
    }
    for (const h of this.hazards) {
      h.active = false;
      h.group.visible = false;
    }
    for (const m of this.milestones) {
      m.active = false;
      m.group.visible = false;
    }
    for (const pt of this.particles) {
      pt.active = false;
      pt.y = -20;
    }
  }

  private pushEvent(text: string, tone: 'positive' | 'negative' | 'gold'): void {
    this.lastEventText = text;
    this.lastEventTone = tone;
    this.lastEventId += 1;
  }

  private getCurrentSpeed(): number {
    const base = getLevelConfig(this.stage).speed;
    const mult = this.turboTimer > 0 ? 1.6 : this.surgeActive ? 1.34 : 1.0;
    return base * mult;
  }

  private spawnGatePair(z: number): void {
    const freeGates = this.gates.filter((g) => !g.active);
    if (freeGates.length < 2) return;

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const pairLeft = freeGates[0];
    const pairRight = freeGates[1];

    const cfg = getLevelConfig(this.stage);
    const goodPool: { op: GateOperation; val: number }[] = [
      { op: 'mul', val: 2 },
      { op: 'add', val: 10 },
      { op: 'add', val: 20 },
    ];
    if (this.stage >= 8) goodPool.push({ op: 'add', val: 30 });
    if (this.stage >= 16) goodPool.push({ op: 'mul', val: 3 });

    const badPool: { op: GateOperation; val: number }[] = [
      { op: 'sub', val: 10 },
      { op: 'div', val: 2 },
      { op: 'sub', val: 20 },
      { op: 'div', val: 3 },
    ];
    if (this.stage >= 10) badPool.push({ op: 'sub', val: 30 });
    if (this.stage >= 20) badPool.push({ op: 'sub', val: 40 });

    const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    let leftChoice: { op: GateOperation; val: number };
    let rightChoice: { op: GateOperation; val: number };

    if (Math.random() < cfg.bothBadProb) {
      leftChoice = pickOne(badPool);
      rightChoice = pickOne(badPool);
    } else {
      const goodOnLeft = Math.random() < 0.5;
      leftChoice = goodOnLeft ? pickOne(goodPool) : pickOne(badPool);
      rightChoice = goodOnLeft ? pickOne(badPool) : pickOne(goodPool);
    }

    const moving = cfg.movingProb > 0 && Math.random() < cfg.movingProb;
    const amp = moving ? cfg.gateAmp : 0;
    const phase = Math.random() * Math.PI * 2;

    const setupGate = (ent: GateEntity, laneOffset: number, choice: { op: GateOperation; val: number }) => {
      ent.active = true;
      ent.triggered = false;
      ent.laneOffset = laneOffset;
      ent.pairCenterX = 0;
      ent.pairAmp = amp;
      ent.pairPhase = phase;
      ent.x = laneOffset;
      ent.z = z;
      ent.op = choice.op;
      ent.value = choice.val;

      const positive = choice.op === 'add' || choice.op === 'mul';
      const isMult = choice.op === 'mul';
      const prefix =
        choice.op === 'add'
          ? '+'
          : choice.op === 'mul'
            ? '×'
            : choice.op === 'sub'
              ? '−'
              : '÷';
      const label = `${prefix}${choice.val}`;

      ent.visual.setLabel(label, positive, isMult, maxAniso);
      ent.visual.barrier.visible = true;
      ent.visual.group.position.set(laneOffset, 0, z);
      ent.visual.group.visible = true;
    };

    setupGate(pairLeft, -2.25, leftChoice);
    setupGate(pairRight, 2.25, rightChoice);
  }

  private spawnPickup(z: number): void {
    if (Math.random() > 0.55) return;
    const pk = this.pickups.find((p) => !p.active);
    if (!pk) return;

    const r = Math.random();
    const kind: PickupKind =
      r < 0.3 ? 'shield' : r < 0.5 ? 'turbo' : r < 0.75 ? 'magnet' : 'honey';
    pk.active = true;
    pk.kind = kind;
    pk.x = (Math.random() - 0.5) * 6.0;
    pk.z = z;
    pk.phase = Math.random() * Math.PI * 2;
    (pk.sprite.material as THREE.SpriteMaterial).map = this.textures.pickups[kind];
    (pk.sprite.material as THREE.SpriteMaterial).needsUpdate = true;
    pk.sprite.position.set(pk.x, 1.45, pk.z);
    pk.sprite.visible = true;
    pk.shadow.position.set(pk.x, 0.036, pk.z);
    pk.shadow.visible = true;
  }

  private spawnPollenArc(startZ: number, centerLaneX: number): void {
    const count = 4;
    let spawned = 0;
    for (const p of this.pollens) {
      if (p.active) continue;
      const offsetX = THREE.MathUtils.clamp(
        centerLaneX + Math.sin(spawned * 0.85) * 1.2,
        -STEER_LIMIT + 0.3,
        STEER_LIMIT - 0.3,
      );
      p.active = true;
      p.x = offsetX;
      p.z = startZ - spawned * 3.1;
      p.visual.group.position.set(p.x, 0, p.z);
      p.visual.group.visible = true;
      spawned++;
      if (spawned >= count) break;
    }
  }

  private spawnHazardWave(z: number): void {
    const cfg = getLevelConfig(this.stage);
    const lanes = [-2.7, 0, 2.7];
    const openLane = Math.floor(Math.random() * lanes.length);
    const maxHazardsInWave = 2;
    let placed = 0;
    let spawnedLog = false;

    for (let i = 0; i < lanes.length && placed < maxHazardsInWave; i++) {
      if (i === openLane) continue;
      if (Math.random() > cfg.obsProb) continue;

      const r = Math.random();
      let desiredKind: HazardKind;
      if (this.stage >= 6 && !spawnedLog && r < 0.16) {
        desiredKind = 'log';
        spawnedLog = true;
      } else if (this.stage >= 4 && r < 0.34) {
        desiredKind = 'bird';
      } else if (this.stage >= 2 && r < 0.48) {
        desiredKind = 'hornet';
      } else if (r < 0.72) {
        desiredKind = 'web';
      } else if (r < 0.90) {
        desiredKind = 'frog';
      } else if (r < 0.95) {
        desiredKind = 'toadstool';
      } else {
        desiredKind = 'bramble';
      }

      const ent =
        this.hazards.find((h) => !h.active && h.kind === desiredKind) ||
        this.hazards.find((h) => !h.active);
      if (!ent) break;

      ent.active = true;
      ent.hit = false;
      ent.dodged = false;
      ent.dashed = false;
      ent.phase = Math.random() * Math.PI * 2;
      ent.x = lanes[i] + (Math.random() - 0.5) * 0.4;
      ent.baseX = ent.x;
      ent.z = z - placed * 1.4;
      ent.dashDir = ent.x > 0 ? -1 : 1;
      ent.group.position.set(ent.x, ent.kind === 'log' ? 0.55 : 0, ent.z);
      ent.group.rotation.set(0, 0, 0);
      ent.group.scale.setScalar(1);
      ent.group.visible = true;
      if (ent.hornetRig) {
        ent.hornetRig.telegraphMat.opacity = 0.28;
        ent.hornetRig.telegraphRing.scale.setScalar(1);
      }
      placed++;
    }
  }

  private spawnMilestone(z: number, stageNum: number): void {
    const m = this.milestones.find((item) => !item.active);
    if (!m) return;
    m.active = true;
    m.triggered = false;
    m.z = z;
    m.stageNumber = stageNum;
    m.group.position.set(0, 0, z);
    m.group.visible = true;
  }

  private spawnBurst(x: number, y: number, z: number, count: number, colorHex: number): void {
    const targetCount = this.quality === 'low' ? Math.ceil(count * 0.5) : count;
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.6;
      p.y = y + (Math.random() - 0.5) * 0.4;
      p.z = z + (Math.random() - 0.5) * 0.6;
      const angle = Math.random() * Math.PI * 2;
      const spd = 2.4 + Math.random() * 4.5;
      p.vx = Math.cos(angle) * spd;
      p.vy = 2.2 + Math.random() * 4.2;
      p.vz = Math.sin(angle) * spd * 0.7;
      p.maxLife = 0.35 + Math.random() * 0.35;
      p.life = p.maxLife;
      p.size = 0.7 + Math.random() * 0.85;
      p.colorHex = colorHex;
      spawned++;
      if (spawned >= targetCount) break;
    }
  }

  private getSwarmRadius(): number {
    return 0.45 + Math.sqrt(Math.min(this.beeCount, MAX_RENDER_BEES)) * 0.11;
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.prevTime) / 1000;
    this.prevTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.stepSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private stepSimulation(dt: number): void {
    if (this.phase === 'paused') {
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateParticles(dt * 0.25);
      this.updateCamera(dt);
      return;
    }

    const isWinning = this.phase === 'winning';
    const simDt = isWinning ? dt * 0.3 : dt;

    this.simTime += simDt;
    const t = this.simTime;

    const isPlaying = this.phase === 'playing';
    const isRunning = isPlaying && !this.bossFight;
    const worldSpeed = isRunning ? this.getCurrentSpeed() : isPlaying || isWinning ? 0 : 7.0;

    // Keyboard lateral steering (works both during flight and boss strike dodging)
    if (isPlaying) {
      let moveDir = 0;
      if (this.heldKeys.has('ArrowLeft') || this.heldKeys.has('KeyA')) moveDir -= 1;
      if (this.heldKeys.has('ArrowRight') || this.heldKeys.has('KeyD')) moveDir += 1;
      if (moveDir !== 0) {
        this.markSteered();
        const steerMult = BEE_TYPES[this.beeType]?.steer ?? 1;
        this.targetX = THREE.MathUtils.clamp(
          this.targetX + moveDir * 11.2 * steerMult * simDt,
          -STEER_LIMIT,
          STEER_LIMIT,
        );
      }
    } else if (this.phase === 'title') {
      this.targetX = Math.sin(t * 0.65) * 1.85;
    }

    // Magnet Power-Up: auto-steer toward the better upcoming gate pair!
    if (isRunning && this.magnetCharges > 0) {
      let bestGate: GateEntity | null = null;
      let bestZ = -Infinity;
      let bestScore = -Infinity;
      for (const g of this.gates) {
        if (!g.active || g.triggered || g.z >= -0.4 || g.z < -42) continue;
        const gain =
          g.op === 'add'
            ? g.value
            : g.op === 'mul'
              ? this.beeCount * (g.value - 1)
              : g.op === 'sub'
                ? -g.value
                : Math.ceil(this.beeCount / g.value) - this.beeCount;
        // Prefer closest pair first, then highest gain within that pair
        if (g.z > bestZ + 1.5 || (Math.abs(g.z - bestZ) <= 1.5 && gain > bestScore)) {
          bestZ = g.z;
          bestScore = gain;
          bestGate = g;
        }
      }
      if (bestGate) {
        this.targetX = THREE.MathUtils.damp(this.targetX, bestGate.x, 8.5, simDt);
      }
    }

    // Smooth exponential damping for lateral swarm motion & boss flight offsets
    this.prevSwarmX = this.swarmX;
    this.swarmX = THREE.MathUtils.damp(this.swarmX, this.targetX, this.bossFight ? 7.5 : 11.5, simDt);
    const targetSwarmY = this.bossFight || isWinning ? 1.35 : 0;
    const targetSwarmZ = this.bossFight || isWinning ? -4.5 : 0;
    this.swarmYOffset = THREE.MathUtils.damp(this.swarmYOffset, targetSwarmY, 4.0, simDt);
    this.swarmZOffset = THREE.MathUtils.damp(this.swarmZOffset, targetSwarmZ, 4.0, simDt);

    const vx = (this.swarmX - this.prevSwarmX) / Math.max(0.0001, simDt);
    this.bankAngle = THREE.MathUtils.damp(
      this.bankAngle,
      THREE.MathUtils.clamp(-vx * 0.055, -0.42, 0.42),
      14,
      simDt,
    );

    // Timers & pop decay
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.tipTimer > 0) {
      this.tipTimer -= dt;
      if (this.tipTimer <= 0) {
        this.tipTimer = 0;
        this.tipText = null;
      }
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.surgeActive) {
      this.surgeTimer -= dt;
      if (this.surgeTimer <= 0) {
        this.surgeActive = false;
        this.surgeTimer = 0;
      }
    }
    if (this.turboTimer > 0) {
      this.turboTimer = Math.max(0, this.turboTimer - dt);
    }
    this.swarmPopScale = THREE.MathUtils.damp(this.swarmPopScale, 1, 10, simDt);

    // Scroll meadow & path textures smoothly
    this.textures.meadowGround.offset.y -= (worldSpeed * simDt) / 14;
    this.textures.pathSurface.offset.y -= (worldSpeed * simDt) / 14;

    // Drift sky clouds
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const c = this.clouds[i];
      c.x += 1.4 * simDt;
      if (c.x > 110) c.x = -110;
      for (let k = 0; k < CLOUD_PUFFS; k++) {
        const pf = c.puffs[k];
        _vec3.set(c.x + pf.dx, c.y + pf.dy, c.z + pf.dz);
        _quat.identity();
        _scale.set(pf.sx, pf.sy, pf.sz);
        _mat4.compose(_vec3, _quat, _scale);
        this.cloudMesh.setMatrixAt(i * CLOUD_PUFFS + k, _mat4);
      }
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;

    // Drift ambient pollen / night fireflies
    if (this.ambientPollenMesh.visible) {
      for (let i = 0; i < AMBIENT_POLLEN_COUNT; i++) {
        this.ambientPollenPositions[i * 3 + 2] += (worldSpeed * 0.85 + 0.35) * simDt;
        this.ambientPollenPositions[i * 3] += Math.sin(t * 0.8 + i) * 0.4 * simDt;
        this.ambientPollenPositions[i * 3 + 1] += Math.cos(t * 0.9 + i * 1.7) * 0.3 * simDt;
        if (this.ambientPollenPositions[i * 3 + 2] > DESPAWN_Z) {
          this.ambientPollenPositions[i * 3 + 2] = -65;
        }
      }
      (this.ambientPollenGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // Scroll perimeter flowers & trees
    for (let i = 0; i < FLOWER_COUNT; i++) {
      const f = this.flowers[i];
      f.z += worldSpeed * simDt;
      if (f.z > DESPAWN_Z) {
        f.z = SPAWN_Z - Math.random() * 6;
      }
      _vec3.set(f.x, 0.22 + Math.sin(t * 3 + f.phase) * 0.03, f.z);
      _euler.set(0, t * 0.4 + f.phase, 0);
      _quat.setFromEuler(_euler);
      _scale.setScalar(f.scale);
      _mat4.compose(_vec3, _quat, _scale);
      this.flowerMesh.setMatrixAt(i, _mat4);
    }
    this.flowerMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.trees.length; i++) {
      const tr = this.trees[i];
      tr.z += worldSpeed * simDt;
      if (tr.z > DESPAWN_Z + 4) {
        tr.z = SPAWN_Z - 6;
      }
      tr.group.position.z = tr.z;
    }

    // Update Queen Bee, Swarm Instances & 3D Shield Bubble
    this.updateSwarmVisuals(t, simDt);

    if (isWinning) {
      this.winTimer += dt;
      this.winFireworkAccum += dt;
      if (this.winFireworkAccum >= 0.14) {
        this.winFireworkAccum = 0;
        const fwPalette = [0xffd740, 0x38bdf8, 0x34d399, 0xf472b6, 0xfb923c];
        const col = fwPalette[Math.floor(Math.random() * fwPalette.length)];
        this.spawnBurst(
          (Math.random() - 0.5) * 6.5,
          2.2 + Math.random() * 3.8,
          this.nestZ + (Math.random() - 0.5) * 3.0,
          14,
          col,
        );
      }
      if (!this.winBoomDone && this.winTimer >= 0.3) {
        this.winBoomDone = true;
        this.audio.playBoom();
        this.cameraTrauma = 0.72;
        this.nestRig.group.visible = false;
        this.bossQueen.group.visible = false;
        this.waspMesh.visible = false;
        this.waspWingMesh.visible = false;
        const cfg = getLevelConfig(this.stage);
        this.spawnBurst(0, NEST_Y, this.nestZ, 60, cfg.boss ? 0xd946ef : 0xffd740);
      }
      if (this.winTimer >= 1.8) {
        this.triggerVictory();
        return;
      }
    } else if (isPlaying) {
      if (!this.bossFight) {
        const stepDist = worldSpeed * dt;
        this.distance += stepDist;
        this.score += stepDist * (1 + this.beeCount * 0.04);
        this.surgeCharge = Math.min(100, this.surgeCharge + dt * 4.2);

        // Dynamic wave spawning: 3 obstacle slots between gate pairs, then summon the Wasp Nest Boss!
        const cfg = getLevelConfig(this.stage);
        this.spawnDistanceAccum += stepDist;
        const waveSpacing = Math.max(11.5, 14.5 - this.stage * 0.45);
        if (this.spawnDistanceAccum >= waveSpacing) {
          this.spawnDistanceAccum = 0;
          this.waveIndex++;

          if (this.gatesSpawnedInStage < cfg.pairs) {
            if (this.waveIndex % 4 === 0) {
              this.spawnGatePair(SPAWN_Z);
              this.gatesSpawnedInStage += 1;
              this.showTip('gate', 'Pick green or gold gates to grow your swarm!', 2.6);
            } else {
              this.spawnHazardWave(SPAWN_Z);
              if (this.waveIndex % 4 === 2) {
                this.spawnPickup(SPAWN_Z - 6);
              }
              if (Math.random() < 0.85) {
                const safeX = (Math.random() - 0.5) * 5.2;
                this.spawnPollenArc(SPAWN_Z - 4, safeX);
              }
              this.showTip('hazard', 'Dodge spider webs, frogs, and predators!', 2.5);
            }
          } else if (!this.nestActive) {
            const anyFarGate = this.gates.some((g) => g.active && g.z < -42);
            if (!anyFarGate) {
              this.nestActive = true;
              this.nestZ = SPAWN_Z - 8;
              this.nestRig.group.visible = true;
              this.bossQueen.group.visible = cfg.boss;
              this.waspMesh.count = cfg.boss ? WASP_COUNT : 18;
              this.waspMesh.visible = true;
              this.pushEvent(cfg.boss ? 'HORNET QUEEN AHEAD!' : 'WASP NEST AHEAD!', 'negative');
              this.emitHud(true);
            }
          }
        }

        if (this.nestActive) {
          this.nestZ += worldSpeed * dt;
          if (this.nestZ >= NEST_STOP_Z) {
            this.nestZ = NEST_STOP_Z;
            this.bossFight = true;
            this.fightStartBees = this.beeCount;
            this.fightBees = this.beeCount;
            this.warnActive = false;
            this.warnTimer = 0;
            this.warnCooldown = 1.6;
            this.audio.setMusicState(true, true);
            this.pushEvent(cfg.boss ? 'BOSS BATTLE!' : 'SWARM ATTACK!', 'gold');
            if (cfg.boss) {
              this.showTip('boss', 'Steer away when the red strike lane appears!', 3.0, true);
            }
            this.emitHud(true);
          }
        }

        this.updateEntities(dt, worldSpeed, t);
      } else {
        // Boss Showdown: Bees assault the Wasp Nest while guard wasps fight back & Queen strikes!
        const cfg = getLevelConfig(this.stage);
        const surgeMult = this.surgeActive ? 1.75 : 1.0;
        const powerMult = 1 + 0.1 * this.upgrades.power;
        const typeDps = BEE_TYPES[this.beeType]?.dps ?? 1;
        const beeDps = 1.2 * powerMult * surgeMult * typeDps;
        const waspAttrition = cfg.waspKills;

        this.nestHp -= this.fightBees * beeDps * dt;
        this.fightBees -= waspAttrition * dt;
        this.beeCount = Math.max(0, Math.ceil(this.fightBees));
        this.score += dt * 45;
        this.surgeCharge = Math.min(100, this.surgeCharge + dt * 6);

        // Hornet Queen Boss Red Strike Lane Mechanic
        if (cfg.boss) {
          if (!this.warnActive) {
            this.warnCooldown -= dt;
            if (this.warnCooldown <= 0) {
              this.warnActive = true;
              this.warnTimer = 1.3;
              this.warnX = THREE.MathUtils.clamp(this.swarmX + (Math.random() - 0.5) * 1.4, -2.5, 2.5);
              this.warnMesh.position.set(this.warnX, 0.045, -3.5);
              this.warnMesh.visible = true;
              this.audio.playWarn();
              this.showTip('boss_warn', 'Dodge the red strike!', 1.5, true);
            }
          } else {
            this.warnTimer -= dt;
            this.warnMat.opacity = 0.34 + 0.34 * Math.sin(t * 28);
            if (this.warnTimer <= 0) {
              this.warnActive = false;
              this.warnMesh.visible = false;
              this.warnCooldown = 2.4;
              this.audio.playStrike();
              this.cameraTrauma = Math.max(this.cameraTrauma, 0.38);
              this.spawnBurst(this.warnX, 1.4, -4.0, 36, 0xef4444);

              const swarmRadius = this.getSwarmRadius();
              if (Math.abs(this.swarmX - this.warnX) < 1.4 + swarmRadius * 0.45) {
                if (this.shieldActive) {
                  this.shieldActive = false;
                  this.audio.playShieldBreak();
                  this.spawnBurst(this.swarmX, 1.5, this.swarmZOffset + 0.3, 24, 0x38bdf8);
                  this.pushEvent('SHIELD BLOCKED STRIKE!', 'gold');
                } else {
                  const typeLoss = BEE_TYPES[this.beeType]?.loss ?? 1;
                  const strikeLoss = Math.max(6, Math.round(this.fightBees * 0.14 * typeLoss));
                  this.fightBees = Math.max(0, this.fightBees - strikeLoss);
                  this.beeCount = Math.max(0, Math.ceil(this.fightBees));
                  this.hitFlashTimer = 0.28;
                  this.swarmPopScale = 0.8;
                  this.pushEvent(`BOSS STRIKE −${strikeLoss}!`, 'negative');
                }
                this.emitHud(true);
              }
            }
          }
        }

        this.bossSparkAccum += dt;
        if (this.bossSparkAccum >= 0.14) {
          this.bossSparkAccum = 0;
          this.spawnBurst(
            (Math.random() - 0.5) * 2.4,
            NEST_Y + (Math.random() - 0.5) * 1.6,
            this.nestZ + 2.2,
            6,
            this.surgeActive ? 0xffd740 : cfg.boss ? 0xd946ef : 0xff9800,
          );
        }

        if (this.nestHp <= 0) {
          this.nestHp = 0;
          this.beeCount = Math.max(1, this.beeCount);
          this.beginWinCelebration();
          return;
        }
        if (this.fightBees <= 0) {
          this.beeCount = 0;
          this.bossFight = false;
          this.warnActive = false;
          this.warnMesh.visible = false;
          this.triggerGameOver();
          return;
        }
      }
    }

    // Update Nest, Hornet Queen Boss & Orbiting Guard Wasps visuals
    if (this.nestActive && !this.winBoomDone) {
      const cfg = getLevelConfig(this.stage);
      const nestShake = this.bossFight ? Math.sin(t * 50) * 0.085 : 0;
      this.nestRig.group.position.set(nestShake, NEST_Y, this.nestZ);
      this.nestRig.group.visible = true;

      // Progressive scorched darkening on papery nest as HP drops
      const dmg = 1 - Math.max(0, this.nestHp) / Math.max(1, this.nestMaxHp);
      this.nestRig.bodyMat.color.setRGB(
        this.nestBaseTint.r * (1 - 0.3 * dmg),
        this.nestBaseTint.g * (1 - 0.5 * dmg),
        this.nestBaseTint.b * (1 - 0.5 * dmg),
      );

      this.bossQueen.group.visible = cfg.boss;
      if (cfg.boss) {
        this.bossQueen.group.position.set(
          Math.sin(t * 1.5) * 1.2,
          NEST_Y + 3.4 + Math.sin(t * 3.0) * 0.3,
          this.nestZ + 1.4,
        );
        this.bossQueen.wingL.rotation.z = Math.sin(t * 40) * 0.5;
        this.bossQueen.wingR.rotation.z = -Math.sin(t * 40) * 0.5;
      }

      const activeWasps = cfg.boss ? WASP_COUNT : 18;
      this.waspMesh.count = activeWasps;
      this.waspMesh.visible = true;
      this.waspWingMesh.count = activeWasps;
      this.waspWingMesh.visible = true;

      const waspSpeed = this.bossFight ? 3.2 : 1.1;
      const waspWingFlap = Math.sin(t * 50) * 0.42;
      for (let i = 0; i < activeWasps; i++) {
        const w = this.waspData[i];
        const a = w.angle + t * w.speed * waspSpeed;
        const wx = Math.cos(a) * w.radius;
        const wy = NEST_Y + w.height + Math.sin(t * 3.5 + i) * 0.35;
        const wz = this.nestZ + Math.sin(a) * w.radius;
        _vec3.set(wx, wy, wz);
        _euler.set(0, -a, 0);
        _quat.setFromEuler(_euler);
        _scale.setScalar(1.3);
        _mat4.compose(_vec3, _quat, _scale);
        this.waspMesh.setMatrixAt(i, _mat4);

        _euler.set(waspWingFlap * (i % 2 === 0 ? 1 : -1), -a, waspWingFlap * 0.5);
        _quat.setFromEuler(_euler);
        _mat4.compose(_vec3, _quat, _scale);
        this.waspWingMesh.setMatrixAt(i, _mat4);
      }
      this.waspMesh.instanceMatrix.needsUpdate = true;
      this.waspWingMesh.instanceMatrix.needsUpdate = true;
    } else if (!this.nestActive || this.winBoomDone) {
      this.nestRig.group.visible = false;
      this.bossQueen.group.visible = false;
      this.waspMesh.visible = false;
      this.waspWingMesh.visible = false;
    }

    this.updateParticles(simDt);
    this.updateCamera(simDt);

    // Update Web Audio hum
    const speedFactor = Math.min(1, (worldSpeed - 10) / 10);
    this.audio.updateHum(isPlaying, this.beeCount, speedFactor, this.surgeActive || this.turboTimer > 0);

    // Throttled HUD updates (~15Hz during gameplay, instant on events)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.066) {
      this.hudEmitAccum = 0;
      this.emitHud(false);
    }
  }

  private updateSwarmVisuals(t: number, dt: number): void {
    const swarmRadius = this.getSwarmRadius();
    const queenLunge = this.bossFight ? -(Math.sin(t * 10) + 1) * 0.35 : 0;
    const queenY = 1.38 + this.swarmYOffset + Math.sin(t * 6.5) * 0.1;
    this.queen.group.position.set(this.swarmX, queenY, 0.3 + this.swarmZOffset + queenLunge);
    this.queen.group.rotation.set(0.08, this.bankAngle * 0.6, this.bankAngle);
    const queenScale = this.swarmPopScale * (this.surgeActive || this.turboTimer > 0 ? 1.18 : 1.0);
    this.queen.group.scale.setScalar(queenScale);

    // Queen wing flutter
    const flap = Math.sin(t * 48) * 0.58;
    this.queen.wingL.rotation.z = -flap - 0.2;
    this.queen.wingR.rotation.z = flap + 0.2;

    // Hit flash tint on Queen abdomen
    const abdomenMat = this.queen.abdomen.material as THREE.MeshStandardMaterial;
    if (this.hitFlashTimer > 0) {
      abdomenMat.emissive.setHex(0xff2222);
      abdomenMat.emissiveIntensity = 0.85;
    } else if (this.surgeActive || this.turboTimer > 0) {
      abdomenMat.emissive.setHex(this.turboTimer > 0 ? 0xfacc15 : 0xffb300);
      abdomenMat.emissiveIntensity = 0.45;
    } else {
      abdomenMat.emissive.setHex(0x000000);
      abdomenMat.emissiveIntensity = 0;
    }

    // 3D Shield Bubble around swarm
    if (this.shieldActive && (this.phase === 'playing' || this.phase === 'winning')) {
      this.shieldBubble.visible = true;
      this.shieldBubble.position.set(this.swarmX, 1.32 + this.swarmYOffset, 0.35 + this.swarmZOffset);
      const bScale = swarmRadius * 1.18 + Math.sin(t * 5.2) * 0.05;
      this.shieldBubble.scale.setScalar(bScale);
    } else {
      this.shieldBubble.visible = false;
    }

    // Ground contact shadow beneath swarm
    this.swarmShadow.position.set(this.swarmX, 0.035, 0.35 + this.swarmZOffset);
    const shadowScale = THREE.MathUtils.clamp(swarmRadius * 1.15, 0.8, 2.2);
    this.swarmShadow.scale.setScalar(shadowScale);

    // Worker bees (up to MAX_RENDER_BEES = 300)
    const visibleCount = Math.min(MAX_RENDER_BEES, Math.max(0, this.beeCount - 1));
    this.beeBodyMesh.count = visibleCount;
    this.beeHeadMesh.count = visibleCount;
    this.beeWingMesh.count = visibleCount;
    const wingFlap = Math.sin(t * 52) * 0.35;

    for (let i = 0; i < visibleCount; i++) {
      const o = this.beeOffsets[i];
      const lunge = this.bossFight ? -(Math.sin(t * 14 + o.phase) + 1) * 0.55 : 0;
      const bx = this.swarmX + o.x * this.swarmPopScale + Math.sin(t * 7 + o.phase) * 0.08;
      const by = 1.24 + this.swarmYOffset + o.y + Math.sin(t * 8.5 + o.phase) * 0.12;
      const bz = this.swarmZOffset + o.z + Math.cos(t * 6 + o.phase) * 0.08 + lunge;

      _vec3.set(bx, by, bz);
      _euler.set(0, this.bankAngle * 0.5, this.bankAngle);
      _quat.setFromEuler(_euler);
      _scale.setScalar(this.surgeActive || this.turboTimer > 0 ? 1.12 : 1.0);
      _mat4.compose(_vec3, _quat, _scale);
      this.beeBodyMesh.setMatrixAt(i, _mat4);

      // Head sits slightly forward (-Z)
      _vec3.set(bx, by + 0.02, bz - 0.17);
      _mat4.compose(_vec3, _quat, _scale);
      this.beeHeadMesh.setMatrixAt(i, _mat4);

      // Wings flap
      _vec3.set(bx, by + 0.06, bz - 0.02);
      _euler.set(
        wingFlap * (i % 2 === 0 ? 1 : -1),
        this.bankAngle * 0.5,
        this.bankAngle + wingFlap * 0.5,
      );
      _quat.setFromEuler(_euler);
      _mat4.compose(_vec3, _quat, _scale);
      this.beeWingMesh.setMatrixAt(i, _mat4);
    }

    this.beeBodyMesh.instanceMatrix.needsUpdate = true;
    this.beeHeadMesh.instanceMatrix.needsUpdate = true;
    this.beeWingMesh.instanceMatrix.needsUpdate = true;
    void dt;
  }

  private updateEntities(dt: number, worldSpeed: number, t: number): void {
    const swarmRadius = this.getSwarmRadius();

    // 1. Gates (supports Lv8+ oscillating pairs)
    for (const g of this.gates) {
      if (!g.active) continue;
      g.z += worldSpeed * dt;
      if (g.pairAmp > 0) {
        g.pairCenterX = g.pairAmp * Math.sin(t * 1.3 + g.pairPhase);
        g.x = g.pairCenterX + g.laneOffset;
      } else {
        g.pairCenterX = 0;
      }
      g.visual.group.position.set(g.x, 0, g.z);

      if (!g.triggered && g.z >= 0.0 && g.z <= 1.2) {
        const pickedSide = this.swarmX < g.pairCenterX ? g.laneOffset < 0 : g.laneOffset >= 0;
        if (pickedSide) {
          g.triggered = true;
          g.visual.barrier.visible = false;

          // Also disable paired sibling gate so you don't double-dip on the exact same row
          for (const other of this.gates) {
            if (other !== g && other.active && Math.abs(other.z - g.z) < 0.8) {
              other.triggered = true;
            }
          }
          if (this.magnetCharges > 0) {
            this.magnetCharges -= 1;
          }
          this.gatesClearedInStage = Math.min(getLevelConfig(this.stage).pairs, this.gatesClearedInStage + 1);

          const prevBees = this.beeCount;
          if (g.op === 'add') this.beeCount += g.value;
          else if (g.op === 'mul') this.beeCount *= g.value;
          else if (g.op === 'sub') this.beeCount = Math.max(0, this.beeCount - g.value);
          else if (g.op === 'div') this.beeCount = Math.max(1, Math.ceil(this.beeCount / g.value));

          this.beeCount = Math.min(MAX_BEES, this.beeCount);
          const positive = g.op === 'add' || g.op === 'mul';
          const isMult = g.op === 'mul';

          if (positive) {
            this.addMissionProgress('good', 1);
            const deltaBees = this.beeCount - prevBees;
            this.peakBees = Math.max(this.peakBees, this.beeCount);
            this.score += 60 + deltaBees * 8;
            this.surgeCharge = Math.min(100, this.surgeCharge + (isMult ? 26 : 16));
            this.swarmPopScale = isMult ? 1.32 : 1.2;
            this.cameraTrauma = Math.max(this.cameraTrauma, isMult ? 0.2 : 0.09);
            this.audio.playGate(true, isMult);
            this.spawnBurst(g.x, 1.4, g.z, isMult ? 28 : 18, isMult ? 0xfbbf24 : 0x34d399);
            this.pushEvent(`${isMult ? '×' : '+'}${g.value} SWARM!`, isMult ? 'gold' : 'positive');
          } else {
            this.swarmPopScale = 0.84;
            this.cameraTrauma = Math.max(this.cameraTrauma, 0.26);
            this.audio.playGate(false, false);
            this.spawnBurst(g.x, 1.4, g.z, 18, 0xef4444);
            this.pushEvent(`${g.op === 'sub' ? '−' : '÷'}${g.value} BEES`, 'negative');
            if (this.beeCount <= 0) {
              this.triggerGameOver();
              return;
            }
          }
          this.emitHud(true);
        }
      }

      if (g.z > DESPAWN_Z) {
        g.active = false;
        g.visual.group.visible = false;
      }
    }

    // 2. Power-Up Pickups (Shield, Turbo, Magnet, Honey)
    for (const pk of this.pickups) {
      if (!pk.active) continue;
      pk.z += worldSpeed * dt;
      const hoverY = 1.45 + Math.sin(t * 4.2 + pk.phase) * 0.16;
      pk.sprite.position.set(pk.x, hoverY, pk.z);
      pk.shadow.position.set(pk.x, 0.036, pk.z);

      if (Math.abs(pk.z - 0.3) < 1.25 && Math.abs(this.swarmX - pk.x) < 1.15 + swarmRadius * 0.45) {
        pk.active = false;
        pk.sprite.visible = false;
        pk.shadow.visible = false;
        this.audio.playPickup();
        this.addMissionProgress('power', 1);

        if (pk.kind === 'shield') {
          this.shieldActive = true;
          this.spawnBurst(pk.x, 1.4, pk.z, 18, 0x38bdf8);
          this.pushEvent('SHIELD READY!', 'positive');
          this.showTip('shield', 'Shield blocks your next collision!', 2.6);
        } else if (pk.kind === 'turbo') {
          this.turboTimer = 5.0;
          this.spawnBurst(pk.x, 1.4, pk.z, 22, 0xfacc15);
          this.pushEvent('TURBO 5s!', 'gold');
          this.showTip('turbo', 'Turbo Boost smashes straight through dangers!', 2.6);
        } else if (pk.kind === 'magnet') {
          this.magnetCharges = 2;
          this.spawnBurst(pk.x, 1.4, pk.z, 18, 0xfb7185);
          this.pushEvent('GATE MAGNET!', 'positive');
          this.showTip('magnet', 'Magnet steers toward the best gates!', 2.6);
        } else {
          this.bonusRunHoney += 3;
          this.honey += 3;
          this.addMissionProgress('honey', 1);
          this.saveProgress();
          this.spawnBurst(pk.x, 1.4, pk.z, 20, 0xfbbf24);
          this.pushEvent('+3 HONEY POT!', 'gold');
        }
        this.emitHud(true);
      } else if (pk.z > DESPAWN_Z) {
        pk.active = false;
        pk.sprite.visible = false;
        pk.shadow.visible = false;
      }
    }

    // 3. Pollen Blossoms (magnetic pull + combo chime)
    const magnetRange = this.surgeActive || this.turboTimer > 0 ? 5.8 : 2.3 + swarmRadius * 0.55;
    for (const p of this.pollens) {
      if (!p.active) continue;
      p.z += worldSpeed * dt;
      p.visual.halo.rotation.y = t * 3.2 + p.phase;
      p.visual.halo.rotation.x = Math.sin(t * 2 + p.phase) * 0.45;
      p.visual.blossomHead.position.y = 0.92 + Math.sin(t * 4.5 + p.phase) * 0.08;

      const dx = this.swarmX - p.x;
      const dz = 0.3 - p.z;
      const dist = Math.hypot(dx, dz);

      if (dist < magnetRange) {
        const pullSpeed = this.surgeActive || this.turboTimer > 0 ? 18 : 11;
        p.x += (dx / Math.max(0.1, dist)) * pullSpeed * dt;
        p.z += (dz / Math.max(0.1, dist)) * pullSpeed * dt;
      }

      p.visual.group.position.set(p.x, 0, p.z);

      if (dist < 0.95 + swarmRadius * 0.35) {
        p.active = false;
        p.visual.group.visible = false;
        this.combo += 1;
        this.comboTimer = 2.6;
        const pts = 25 + Math.min(75, this.combo * 5);
        this.score += pts;
        this.surgeCharge = Math.min(100, this.surgeCharge + 9);
        this.audio.playPollen(this.combo - 1);
        this.spawnBurst(p.x, 1.0, p.z, 10, 0xffe066);
        if (this.combo % 5 === 0) {
          this.beeCount = Math.min(MAX_BEES, this.beeCount + 1);
          this.peakBees = Math.max(this.peakBees, this.beeCount);
          this.swarmPopScale = 1.15;
          this.pushEvent(`POLLEN COMBO ×${this.combo} (+1 BEE)`, 'gold');
        }
        this.emitHud(true);
      } else if (p.z > DESPAWN_Z) {
        p.active = false;
        p.visual.group.visible = false;
      }
    }

    // 4. Hazards (Web, Frog, Toadstool, Bramble, Hornet, Lv4+ Bird, Lv6+ Rolling Log)
    for (const h of this.hazards) {
      if (!h.active) continue;
      h.z += worldSpeed * dt;
      let hy = 0;

      if (h.kind === 'hornet' && h.hornetRig) {
        const flap = Math.sin(t * 58) * 0.65;
        h.hornetRig.wingL.rotation.z = -flap - 0.15;
        h.hornetRig.wingR.rotation.z = flap + 0.15;

        if (h.z > -32 && h.z < -18 && !h.dashed) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 22);
          h.hornetRig.telegraphMat.opacity = 0.35 + pulse * 0.55;
          h.hornetRig.telegraphRing.scale.setScalar(1 + pulse * 0.35);
        } else if (h.z >= -18 && !h.dashed) {
          h.dashed = true;
          h.hornetRig.telegraphMat.opacity = 0.75;
        }

        if (h.dashed) {
          h.x = THREE.MathUtils.clamp(h.x + h.dashDir * 5.2 * dt, -STEER_LIMIT, STEER_LIMIT);
        }
      } else if (h.kind === 'web' && h.spiderRig) {
        h.group.rotation.z = Math.sin(t * 2 + h.phase) * 0.03;
        h.spiderRig.spiderGroup.position.y = 2.15 + Math.sin(t * 3 + h.phase) * 0.15;
      } else if (h.kind === 'frog' && h.frogRig) {
        const lvlCfg = getLevelConfig(this.stage);
        h.x = THREE.MathUtils.clamp(
          h.baseX + Math.sin(t * 2.0 + h.phase) * lvlCfg.frogSwing,
          -4.0,
          4.0,
        );
        const hopSin = Math.abs(Math.sin(t * 4.2 + h.phase));
        const hopY = hopSin * 0.62;
        h.frogRig.bodyGroup.position.y = 0.48 + hopY;
        const stretch = 1 + hopSin * 0.16;
        h.frogRig.bodyGroup.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
        h.frogRig.bodyGroup.rotation.z = Math.cos(t * 2 + h.phase) * 0.14;
      } else if (h.kind === 'bird' && h.birdRig) {
        const dive = THREE.MathUtils.clamp(-h.z / 48, 0, 1);
        hy = 1.3 + dive * 5.2;
        if (h.z < -4) {
          h.x += (this.swarmX - h.x) * 0.85 * dt;
        }
        const bFlap = Math.sin(t * 16 + h.phase) * 0.52;
        h.birdRig.wingL.rotation.z = bFlap;
        h.birdRig.wingR.rotation.z = -bFlap;
      } else if (h.kind === 'log') {
        hy = 0.55;
        h.x = Math.sin(t * 1.4 + h.phase) * 3.4;
        h.group.rotation.z = -h.x / 0.55;
      }

      h.group.position.set(h.x, hy, h.z);

      if (!h.hit && !h.dodged && h.z > 2.2) {
        h.dodged = true;
        this.addMissionProgress('dodge', 1);
      }

      if (!h.hit && Math.abs(h.z - 0.3) < h.radius + 0.45) {
        const latDist = Math.abs(this.swarmX - h.x);
        const hitThreshold = h.halfWidth + Math.min(1.05, swarmRadius * 0.42);

        if (latDist < hitThreshold) {
          h.hit = true;
          if (this.surgeActive || this.turboTimer > 0) {
            // Buzz Surge or Turbo smashes right through hazards!
            h.active = false;
            h.group.visible = false;
            this.score += 75;
            this.cameraTrauma = Math.max(this.cameraTrauma, 0.25);
            this.audio.playGate(true, false);
            this.spawnBurst(h.x, 1.1, h.z, 22, 0xffd54f);
            this.pushEvent('SMASHED +75!', 'gold');
            this.emitHud(true);
          } else if (this.shieldActive) {
            this.shieldActive = false;
            h.active = false;
            h.group.visible = false;
            this.invulnTimer = 0.55;
            this.swarmPopScale = 1.16;
            this.cameraTrauma = Math.max(this.cameraTrauma, 0.18);
            this.audio.playShieldBreak();
            this.spawnBurst(h.x, 1.3, h.z, 24, 0x38bdf8);
            this.pushEvent('SHIELD BLOCKED!', 'gold');
            this.emitHud(true);
          } else if (this.invulnTimer <= 0) {
            const lvlCfg = getLevelConfig(this.stage);
            const rawLoss =
              h.kind === 'frog'
                ? lvlCfg.frogLoss
                : h.kind === 'web'
                  ? lvlCfg.webLoss
                  : h.kind === 'bird'
                    ? Math.ceil((lvlCfg.webLoss + lvlCfg.frogLoss) * 0.575)
                    : h.kind === 'log'
                      ? Math.ceil(lvlCfg.frogLoss * 1.2)
                      : h.kind === 'bramble'
                        ? Math.min(10 + Math.floor(this.stage / 3), 26)
                        : h.kind === 'hornet'
                          ? Math.min(12 + Math.floor(this.stage / 3), 28)
                          : Math.min(9 + Math.floor(this.stage / 4), 22);
            const toughMult = Math.max(0.25, 1 - 0.15 * this.upgrades.tough);
            const typeLoss = BEE_TYPES[this.beeType]?.loss ?? 1;
            const loss = Math.min(this.beeCount, Math.ceil(rawLoss * toughMult * typeLoss));

            if (h.kind === 'web' || h.kind === 'frog' || h.kind === 'bird') {
              h.active = false;
              h.group.visible = false;
            }

            if (loss <= 0) {
              this.invulnTimer = 0.55;
              this.swarmPopScale = 1.15;
              this.cameraTrauma = Math.max(this.cameraTrauma, 0.16);
              this.audio.playGate(true, false);
              this.spawnBurst(h.x, 1.15, h.z, 16, 0xffd54f);
              this.pushEvent('TOUGH BEES SHIELDED!', 'gold');
              this.emitHud(true);
            } else {
              this.beeCount = Math.max(0, this.beeCount - loss);
              this.combo = 0;
              this.invulnTimer = 0.55;
              this.hitstopTimer = 0.045;
              this.hitFlashTimer = 0.22;
              this.cameraTrauma = Math.max(this.cameraTrauma, 0.52);
              this.swarmPopScale = 0.78;
              this.audio.playImpact(loss >= 9);
              this.spawnBurst(h.x, 1.15, h.z, 20, h.kind === 'web' ? 0xf8fafc : 0xef4444);
              this.pushEvent(`−${loss} BEES!`, 'negative');

              if (this.beeCount <= 0) {
                this.triggerGameOver();
                return;
              }
              this.emitHud(true);
            }
          }
        }
      }

      if (h.z > DESPAWN_Z) {
        h.active = false;
        h.group.visible = false;
      }
    }

    // 5. Milestone Golden Hive Arches
    for (const m of this.milestones) {
      if (!m.active) continue;
      m.z += worldSpeed * dt;
      m.group.position.z = m.z;

      if (!m.triggered && m.z >= 0.0) {
        m.triggered = true;
        this.beeCount = Math.min(999, this.beeCount + 6);
        this.peakBees = Math.max(this.peakBees, this.beeCount);
        this.score += 180 * this.stage;
        this.surgeCharge = Math.min(100, this.surgeCharge + 35);
        this.swarmPopScale = 1.25;
        this.audio.playMilestone();
        this.spawnBurst(this.swarmX, 2.2, 0.5, 34, 0xffd740);
        this.pushEvent('BONUS HIVE +6 BEES!', 'gold');
        this.emitHud(true);
      }

      if (m.z > DESPAWN_Z + 4) {
        m.active = false;
        m.group.visible = false;
      }
    }
  }

  private updateParticles(dt: number): void {
    let anyDirty = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) {
        _vec3.set(0, -50, 0);
        _quat.identity();
        _scale.setScalar(0.001);
        _mat4.compose(_vec3, _quat, _scale);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }

      anyDirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.vy -= 11.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.08) {
        p.y = 0.08;
        p.vy *= -0.45;
      }

      const lifeRatio = p.life / p.maxLife;
      _vec3.set(p.x, p.y, p.z);
      _euler.set(p.life * 8, p.life * 11, 0);
      _quat.setFromEuler(_euler);
      _scale.setScalar(p.size * lifeRatio);
      _mat4.compose(_vec3, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);

      _color.setHex(p.colorHex);
      this.particleMesh.setColorAt(i, _color);
    }

    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (anyDirty && this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateCamera(dt: number): void {
    const targetCamX = this.swarmX * 0.42;
    const targetFov =
      this.turboTimer > 0 ? 68 : this.surgeActive ? 65 : 58 + Math.min(5, (this.stage - 1) * 1.1);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }

    const baseCamX = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 6.5, dt);
    const baseCamY = this.phase === 'title' ? 4.2 : 4.65;
    const baseCamZ = this.phase === 'title' ? 7.8 : 8.7;

    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.9);
    const shake = this.cameraTrauma * this.cameraTrauma * 0.45;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    this.camera.position.set(baseCamX + sx, baseCamY + sy, baseCamZ);
    this.camera.lookAt(this.swarmX * 0.28, 1.25, -12);
  }

  private beginWinCelebration(): void {
    this.phase = 'winning';
    this.bossFight = false;
    this.warnActive = false;
    this.warnMesh.visible = false;
    this.winTimer = 0;
    this.winBoomDone = false;
    this.winFireworkAccum = 0;
    this.heldKeys.clear();
    this.pointerId = null;
    this.audio.updateHum(false, 0, 0, false);
    this.audio.setMusicState(false, false);
    this.emitHud(true);
  }

  private triggerVictory(): void {
    const cfg = getLevelConfig(this.stage);
    this.phase = 'victory';
    this.bossFight = false;
    this.nestActive = false;
    this.nestRig.group.visible = false;
    this.bossQueen.group.visible = false;
    this.warnMesh.visible = false;
    this.waspMesh.visible = false;
    this.waspWingMesh.visible = false;
    this.shieldBubble.visible = false;
    this.heldKeys.clear();
    this.pointerId = null;

    const ratio = this.beeCount / Math.max(1, this.fightStartBees);
    this.earnedStars = ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1;
    const prevStars = this.bestStars[String(this.stage)] || 0;
    if (this.earnedStars > prevStars) {
      this.bestStars[String(this.stage)] = this.earnedStars;
    }

    this.addMissionProgress('win', 1);
    this.addMissionProgress('stars', this.earnedStars);

    this.score += (cfg.boss ? 900 : 500) * this.stage;
    const finalScore = Math.floor(this.score);
    if (finalScore > this.bestScore) {
      this.bestScore = finalScore;
    }

    const starBonus = (this.earnedStars - 1) * 5;
    const levelHoney = (15 + this.stage * 5 + Math.floor(this.beeCount / 4)) * (cfg.boss ? 2 : 1) + starBonus;
    this.earnedHoney = levelHoney + this.bonusRunHoney;
    this.honey += levelHoney;
    this.unlockedLevel = this.stage + 1;
    this.bestLevel = Math.max(this.bestLevel, this.unlockedLevel);
    this.saveProgress();

    this.audio.playMilestone();
    for (let s = 0; s < this.earnedStars; s++) {
      window.setTimeout(() => {
        if (!this.disposed) this.audio.playStar(s);
      }, 180 + s * 170);
    }
    this.emitHud(true);
  }

  private triggerGameOver(): void {
    this.phase = 'gameover';
    this.bossFight = false;
    this.warnActive = false;
    this.warnMesh.visible = false;
    this.shieldBubble.visible = false;
    this.heldKeys.clear();
    this.pointerId = null;
    const finalScore = Math.floor(this.score);
    if (finalScore > this.bestScore) {
      this.bestScore = finalScore;
    }

    const consolation = 5 + this.stage * 2;
    this.earnedHoney = consolation + this.bonusRunHoney;
    this.honey += consolation;
    this.saveProgress();

    this.audio.updateHum(false, 0, 0, false);
    this.audio.setMusicState(false, false);
    this.audio.playGameOver();
    this.emitHud(true);
  }

  private emitHud(force: boolean): void {
    void force;
    const cfg = getLevelConfig(this.stage);
    const theme = getBiomeTheme(this.stage);
    const stageProgress = THREE.MathUtils.clamp(this.gatesClearedInStage / cfg.pairs, 0, 1);
    const currentScore = Math.floor(this.score);
    const best = Math.max(this.bestScore, currentScore);

    this.ensureMissionDay();
    const today = this.missionState.day;
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const prevKey = dayKey(yest);
    const canClaimDaily = this.dailyState.last !== today;
    const projectedStreak =
      this.dailyState.last === today
        ? this.dailyState.streak
        : this.dailyState.last === prevKey
          ? Math.min(7, this.dailyState.streak + 1)
          : 1;

    const missions: MissionSnapshot[] = getTodaysMissionDefs(today).map((def) => ({
      id: def.id,
      title: def.title,
      target: def.target,
      reward: def.reward,
      progress: Math.min(def.target, this.missionState.p[def.id] || 0),
      claimed: this.missionState.c.includes(def.id),
    }));

    const totalStars = Object.values(this.bestStars).reduce((acc, s) => acc + (Number(s) || 0), 0);

    this.onHudUpdate({
      phase: this.phase,
      bees: this.beeCount,
      peakBees: this.peakBees,
      score: currentScore,
      bestScore: best,
      bestLevel: Math.max(this.bestLevel, this.stage),
      distance: Math.floor(this.distance),
      stage: this.stage,
      stageProgress,
      isBossLevel: cfg.boss,
      biomeName: theme.name,
      bossActive: this.bossFight || this.nestActive,
      bossHp: Math.max(0, Math.ceil(this.nestHp)),
      bossMaxHp: this.nestMaxHp,
      combo: this.combo,
      surgeCharge: Math.floor(this.surgeCharge),
      surgeActive: this.surgeActive,
      surgeRemaining: this.surgeActive ? THREE.MathUtils.clamp(this.surgeTimer / 4.6, 0, 1) : 0,
      honey: this.honey,
      earnedHoney: this.earnedHoney,
      earnedStars: this.earnedStars,
      totalStars,
      upgrades: { ...this.upgrades },
      beeType: this.beeType,
      ownedBeeTypes: [...this.ownedBeeTypes],
      powerups: {
        shield: this.shieldActive,
        turbo: this.turboTimer > 0 ? Number(this.turboTimer.toFixed(1)) : 0,
        magnet: this.magnetCharges,
      },
      dailyGift: {
        canClaim: canClaimDaily,
        streak: canClaimDaily ? projectedStreak : this.dailyState.streak,
        nextReward: 30 + 10 * (projectedStreak - 1),
      },
      missions,
      tipText: this.tipText,
      showDragHand: this.phase === 'playing' && !this.tutDone && !this.hasSteeredThisRun,
      muted: this.audio.isMuted(),
      quality: this.quality,
      hitFlash: this.hitFlashTimer > 0,
      levelBanner: this.levelBanner,
      lastEventText: this.lastEventText,
      lastEventTone: this.lastEventTone,
      lastEventId: this.lastEventId,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResizeBound);
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    window.removeEventListener('blur', this.handleBlurBound);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDownBound);
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerup', this.handlePointerUpBound);
    window.removeEventListener('pointercancel', this.handlePointerUpBound);

    this.audio.dispose();
    this.textures.dispose();
    this.envRenderTarget?.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
