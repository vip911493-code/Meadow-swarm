export type GamePhase = 'title' | 'playing' | 'winning' | 'paused' | 'victory' | 'gameover';

export type GateOperation = 'add' | 'mul' | 'sub' | 'div';

export type UpgradeId = 'bees' | 'power' | 'tough';

export type UpgradeLevels = Record<UpgradeId, number>;

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  max: number;
  baseCost: number;
}

export const UPGRADE_DEFS: UpgradeDef[] = [
  { id: 'bees', name: 'Starting Bees', desc: '+5 bees at the start', max: 20, baseCost: 15 },
  { id: 'power', name: 'Bee Power', desc: '+10% damage to the nest', max: 20, baseCost: 25 },
  { id: 'tough', name: 'Tough Bees', desc: '-15% bee loss on hit', max: 5, baseCost: 30 },
];

export type BeeTypeId = 'normal' | 'speedy' | 'venom' | 'shield';

export interface BeeTypeDef {
  id: BeeTypeId;
  name: string;
  desc: string;
  cost: number;
  abd: number;
  hex: string;
  dps: number;
  loss: number;
  steer: number;
  start: number;
}

export const BEE_TYPES: Record<BeeTypeId, BeeTypeDef> = {
  normal: {
    id: 'normal',
    name: 'Normal',
    desc: 'Balanced all-rounder',
    cost: 0,
    abd: 0xffc400,
    hex: '#ffc400',
    dps: 1,
    loss: 1,
    steer: 1,
    start: 0,
  },
  speedy: {
    id: 'speedy',
    name: 'Speedy',
    desc: 'Faster steering, +15% dmg',
    cost: 150,
    abd: 0x33c9ff,
    hex: '#33c9ff',
    dps: 1.15,
    loss: 1,
    steer: 1.5,
    start: 0,
  },
  venom: {
    id: 'venom',
    name: 'Venom',
    desc: '+50% damage, -5 start bees',
    cost: 300,
    abd: 0x7ddc3a,
    hex: '#7ddc3a',
    dps: 1.5,
    loss: 1,
    steer: 1,
    start: -5,
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    desc: 'Half the loss from dangers',
    cost: 250,
    abd: 0xb8c4d0,
    hex: '#b8c4d0',
    dps: 0.9,
    loss: 0.5,
    steer: 1,
    start: 0,
  },
};

export const BEE_TYPE_ORDER: BeeTypeId[] = ['normal', 'speedy', 'venom', 'shield'];

export type PickupKind = 'shield' | 'turbo' | 'magnet' | 'honey';

export interface ActivePowerups {
  shield: boolean;
  turbo: number; // seconds left
  magnet: number; // gate pairs remaining
}

export type MissionId = 'good' | 'dodge' | 'win' | 'power' | 'stars' | 'honey';

export interface MissionDef {
  id: MissionId;
  title: string;
  target: number;
  reward: number;
}

export const MISSION_POOL: MissionDef[] = [
  { id: 'good', title: 'Go through 15 good gates', target: 15, reward: 30 },
  { id: 'dodge', title: 'Dodge 20 dangers', target: 20, reward: 35 },
  { id: 'win', title: 'Win 3 levels', target: 3, reward: 50 },
  { id: 'power', title: 'Grab 4 power-ups', target: 4, reward: 30 },
  { id: 'stars', title: 'Earn 5 stars', target: 5, reward: 45 },
  { id: 'honey', title: 'Grab 6 honey pots', target: 6, reward: 30 },
];

export interface MissionSnapshot {
  id: MissionId;
  title: string;
  target: number;
  reward: number;
  progress: number;
  claimed: boolean;
}

export interface DailyGiftInfo {
  canClaim: boolean;
  streak: number;
  nextReward: number;
}

export interface LevelBannerInfo {
  id: number;
  title: string;
  subtitle: string;
  isBoss: boolean;
}

export interface HudSnapshot {
  phase: GamePhase;
  bees: number;
  peakBees: number;
  score: number;
  bestScore: number;
  bestLevel: number;
  distance: number;
  stage: number;
  stageProgress: number; // 0..1 within current stage
  isBossLevel: boolean;
  biomeName: string;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  combo: number;
  surgeCharge: number; // 0..100
  surgeActive: boolean;
  surgeRemaining: number; // 0..1
  honey: number;
  earnedHoney: number;
  earnedStars: number;
  totalStars: number;
  upgrades: UpgradeLevels;
  beeType: BeeTypeId;
  ownedBeeTypes: BeeTypeId[];
  powerups: ActivePowerups;
  dailyGift: DailyGiftInfo;
  missions: MissionSnapshot[];
  tipText: string | null;
  showDragHand: boolean;
  muted: boolean;
  quality: 'high' | 'low';
  hitFlash: boolean;
  levelBanner: LevelBannerInfo | null;
  lastEventText: string | null;
  lastEventTone: 'positive' | 'negative' | 'gold' | null;
  lastEventId: number;
}
