import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Gift,
  Magnet,
  MoveHorizontal,
  Pause,
  Play,
  RotateCcw,
  Shield,
  ShoppingBag,
  Star,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  BEE_TYPES,
  BEE_TYPE_ORDER,
  UPGRADE_DEFS,
  type BeeTypeId,
  type HudSnapshot,
  type MissionId,
  type UpgradeId,
} from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  onStart: () => void;
  onRetryLevel: () => void;
  onNextStage: () => void;
  onBuyUpgrade: (id: UpgradeId) => void;
  onSelectBeeType: (id: BeeTypeId) => void;
  onClaimDailyGift: () => void;
  onClaimMission: (id: MissionId) => void;
  onResetProgress: () => void;
  onPause: () => void;
  onResume: () => void;
  onReturnTitle: () => void;
  onToggleMute: () => void;
  onToggleQuality: () => void;
  onTriggerSurge: () => void;
}

function BeeSvgIcon({ className = 'w-5 h-5', color = '#FBBF24' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <ellipse cx="16" cy="18" rx="7" ry="8.5" fill={color} stroke="#291D14" strokeWidth="2" />
      <path d="M9.5 16.5H22.5M9.8 20.5H22.2" stroke="#291D14" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="9" r="4" fill="#291D14" />
      <ellipse
        cx="9.5"
        cy="13"
        rx="4.5"
        ry="2.7"
        transform="rotate(-28 9.5 13)"
        fill="#E0F2FE"
        fillOpacity="0.88"
        stroke="#38BDF8"
        strokeWidth="1.2"
      />
      <ellipse
        cx="22.5"
        cy="13"
        rx="4.5"
        ry="2.7"
        transform="rotate(28 22.5 13)"
        fill="#E0F2FE"
        fillOpacity="0.88"
        stroke="#38BDF8"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function HoneyDropSvgIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5C12 2.5 5.5 10.2 5.5 14.8C5.5 18.5 8.4 21.5 12 21.5C15.6 21.5 18.5 18.5 18.5 14.8C18.5 10.2 12 2.5 12 2.5Z"
        fill="#FBBF24"
        stroke="#78350F"
        strokeWidth="1.8"
      />
      <path d="M9.5 15.2C9.5 16.8 10.6 18 12.2 18.2" stroke="#FEF3C7" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TitleLockupSvg() {
  return (
    <svg
      viewBox="0 0 460 118"
      className="w-[min(430px,88vw)] h-auto drop-shadow-[0_6px_18px_rgba(24,52,18,0.28)]"
      aria-label="Meadow Swarm"
    >
      <g transform="translate(24, 18)">
        <polygon points="40,2 74,21 74,59 40,78 6,59 6,21" fill="#F59E0B" stroke="#FFFBEB" strokeWidth="4" />
        <polygon points="40,11 65,25 65,55 40,69 15,55 15,25" fill="#FDE68A" fillOpacity="0.35" />
        <ellipse cx="40" cy="43" rx="11" ry="13.5" fill="#FBBF24" stroke="#291D14" strokeWidth="2.8" />
        <path d="M30 41H50M31 48H49" stroke="#291D14" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="40" cy="27" r="6" fill="#291D14" />
        <ellipse
          cx="27"
          cy="34"
          rx="8"
          ry="4.5"
          transform="rotate(-25 27 34)"
          fill="#F0F9FF"
          fillOpacity="0.92"
          stroke="#0284C7"
          strokeWidth="1.6"
        />
        <ellipse
          cx="53"
          cy="34"
          rx="8"
          ry="4.5"
          transform="rotate(25 53 34)"
          fill="#F0F9FF"
          fillOpacity="0.92"
          stroke="#0284C7"
          strokeWidth="1.6"
        />
      </g>

      <text
        x="118"
        y="55"
        fill="#1F2937"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="42"
        letterSpacing="-1.2"
      >
        MEADOW
      </text>
      <text
        x="118"
        y="53"
        fill="#FFFBEB"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="42"
        letterSpacing="-1.2"
      >
        MEADOW
      </text>

      <text
        x="118"
        y="99"
        fill="#78350F"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="46"
        letterSpacing="-1"
      >
        SWARM
      </text>
      <text
        x="118"
        y="96"
        fill="#FBBF24"
        stroke="#78350F"
        strokeWidth="2.5"
        paintOrder="stroke"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="46"
        letterSpacing="-1"
      >
        SWARM
      </text>
    </svg>
  );
}

type ShopTab = 'upgrades' | 'bees' | 'missions';

function HiveShopPanel({
  hud,
  onBuyUpgrade,
  onSelectBeeType,
  onClaimMission,
}: {
  hud: HudSnapshot;
  onBuyUpgrade: (id: UpgradeId) => void;
  onSelectBeeType: (id: BeeTypeId) => void;
  onClaimMission: (id: MissionId) => void;
}) {
  const [tab, setTab] = useState<ShopTab>('upgrades');
  const claimableMissions = hud.missions.filter((m) => !m.claimed && m.progress >= m.target).length;

  return (
    <div className="mt-3 rounded-xl border border-amber-300/25 bg-black/35 p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-black/35 p-0.5 text-[11px] font-black">
          <button
            type="button"
            onClick={() => setTab('upgrades')}
            className={`rounded-md px-2 py-1 transition cursor-pointer ${
              tab === 'upgrades' ? 'bg-amber-400 text-amber-950' : 'text-emerald-100/75 hover:text-white'
            }`}
          >
            Upgrades
          </button>
          <button
            type="button"
            onClick={() => setTab('bees')}
            className={`rounded-md px-2 py-1 transition cursor-pointer ${
              tab === 'bees' ? 'bg-amber-400 text-amber-950' : 'text-emerald-100/75 hover:text-white'
            }`}
          >
            Bee Types
          </button>
          <button
            type="button"
            onClick={() => setTab('missions')}
            className={`relative rounded-md px-2 py-1 transition cursor-pointer ${
              tab === 'missions' ? 'bg-amber-400 text-amber-950' : 'text-emerald-100/75 hover:text-white'
            }`}
          >
            Missions
            {claimableMissions > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[9px] font-black text-emerald-950">
                {claimableMissions}
              </span>
            )}
          </button>
        </div>

        <span className="flex items-center gap-1 tabular-nums text-xs font-black text-amber-200">
          <HoneyDropSvgIcon className="h-3.5 w-3.5" />
          {hud.honey}
        </span>
      </div>

      {tab === 'upgrades' && (
        <div className="flex flex-col gap-1.5">
          {UPGRADE_DEFS.map((u) => {
            const lvl = hud.upgrades[u.id] || 0;
            const isMax = lvl >= u.max;
            const cost = u.baseCost * (lvl + 1);
            const canBuy = !isMax && hud.honey >= cost;

            return (
              <div
                key={u.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/6 px-2.5 py-2"
              >
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                    <span>{u.name}</span>
                    <span className="rounded bg-white/12 px-1.5 py-0.5 tabular-nums text-[10px] font-bold text-amber-200">
                      Lv {lvl}/{u.max}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-emerald-100/75">{u.desc}</div>
                </div>

                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => onBuyUpgrade(u.id)}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 tabular-nums text-xs font-black transition ${
                    isMax
                      ? 'bg-emerald-500/25 text-emerald-200 cursor-default'
                      : canBuy
                        ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 active:scale-95 cursor-pointer'
                        : 'bg-white/10 text-white/45 cursor-not-allowed'
                  }`}
                >
                  {isMax ? 'MAX' : `${cost} Honey`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'bees' && (
        <div className="flex flex-col gap-1.5">
          {BEE_TYPE_ORDER.map((id) => {
            const def = BEE_TYPES[id];
            const owned = hud.ownedBeeTypes.includes(id);
            const equipped = hud.beeType === id;
            const canBuy = !owned && hud.honey >= def.cost;

            return (
              <div
                key={id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/6 px-2.5 py-2"
              >
                <div className="flex min-w-0 items-center gap-2 text-left">
                  <BeeSvgIcon className="h-5 w-5 shrink-0" color={def.hex} />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white">{def.name}</div>
                    <div className="truncate text-[11px] font-medium text-emerald-100/75">{def.desc}</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={equipped || (!owned && !canBuy)}
                  onClick={() => onSelectBeeType(id)}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 tabular-nums text-xs font-black transition ${
                    equipped
                      ? 'bg-emerald-500/30 text-emerald-200 cursor-default'
                      : owned
                        ? 'bg-sky-400 text-slate-950 hover:bg-sky-300 active:scale-95 cursor-pointer'
                        : canBuy
                          ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 active:scale-95 cursor-pointer'
                          : 'bg-white/10 text-white/45 cursor-not-allowed'
                  }`}
                >
                  {equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${def.cost} Honey`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'missions' && (
        <div className="flex flex-col gap-1.5">
          {hud.missions.map((m) => {
            const done = m.progress >= m.target;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/6 px-2.5 py-2"
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-xs font-extrabold text-white">{m.title}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/45">
                      <div
                        className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-[10px] font-bold text-amber-200">
                      {m.progress}/{m.target}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!done || m.claimed}
                  onClick={() => onClaimMission(m.id)}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 tabular-nums text-xs font-black transition ${
                    m.claimed
                      ? 'bg-white/10 text-emerald-300/70 cursor-default'
                      : done
                        ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300 active:scale-95 cursor-pointer'
                        : 'bg-white/10 text-white/55 cursor-not-allowed'
                  }`}
                >
                  {m.claimed ? 'CLAIMED' : done ? `CLAIM +${m.reward}` : `+${m.reward}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResetProgressButton({ onResetProgress }: { onResetProgress: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(false), 3200);
    return () => window.clearTimeout(t);
  }, [confirming]);

  return (
    <button
      type="button"
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
        } else {
          setConfirming(false);
          onResetProgress();
        }
      }}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
        confirming
          ? 'bg-rose-600 text-white hover:bg-rose-500'
          : 'text-emerald-200/70 hover:text-rose-200'
      }`}
    >
      {confirming ? 'Tap Again to Confirm Reset' : 'Reset Progress'}
    </button>
  );
}

export function GameHud({
  hud,
  onStart,
  onRetryLevel,
  onNextStage,
  onBuyUpgrade,
  onSelectBeeType,
  onClaimDailyGift,
  onClaimMission,
  onResetProgress,
  onPause,
  onResume,
  onReturnTitle,
  onToggleMute,
  onToggleQuality,
  onTriggerSurge,
}: GameHudProps) {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [titleShopOpen, setTitleShopOpen] = useState(false);
  const [countFlashRed, setCountFlashRed] = useState(false);
  const [visibleBannerId, setVisibleBannerId] = useState<number | null>(null);
  const [visibleToast, setVisibleToast] = useState<{
    id: number;
    text: string;
    tone: 'positive' | 'negative' | 'gold';
  } | null>(null);

  useEffect(() => {
    if (hud.phase !== 'title') {
      setTitleShopOpen(false);
    }
  }, [hud.phase]);

  useEffect(() => {
    if (hud.phase === 'playing' && hud.levelBanner) {
      const id = hud.levelBanner.id;
      setVisibleBannerId(id);
      const timer = window.setTimeout(() => {
        setVisibleBannerId((prev) => (prev === id ? null : prev));
      }, 1900);
      return () => window.clearTimeout(timer);
    }
    setVisibleBannerId(null);
  }, [hud.phase, hud.levelBanner]);

  useEffect(() => {
    if (hud.lastEventText && hud.lastEventTone && hud.lastEventId > 0) {
      setVisibleToast({
        id: hud.lastEventId,
        text: hud.lastEventText,
        tone: hud.lastEventTone,
      });
      if (hud.lastEventTone === 'negative') {
        setCountFlashRed(true);
      }
      const flashTimer =
        hud.lastEventTone === 'negative'
          ? window.setTimeout(() => setCountFlashRed(false), 320)
          : null;
      const timer = window.setTimeout(() => {
        setVisibleToast((prev) => (prev && prev.id === hud.lastEventId ? null : prev));
      }, 1150);
      return () => {
        window.clearTimeout(timer);
        if (flashTimer !== null) window.clearTimeout(flashTimer);
      };
    }
  }, [hud.lastEventId, hud.lastEventText, hud.lastEventTone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH' && !e.repeat && hud.phase === 'playing') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hud.phase]);

  const surgeReady = hud.surgeCharge >= 100 && !hud.surgeActive;
  const activeBeeColor = BEE_TYPES[hud.beeType]?.hex || '#FBBF24';
  const claimableMissions = hud.missions.filter((m) => !m.claimed && m.progress >= m.target).length;
  const hasPowerups = hud.powerups.shield || hud.powerups.turbo > 0 || hud.powerups.magnet > 0;
  const hasProgress =
    hud.stage > 1 ||
    hud.bestLevel > 1 ||
    hud.honey > 0 ||
    hud.totalStars > 0 ||
    hud.bestScore > 0 ||
    hud.upgrades.bees > 0 ||
    hud.upgrades.power > 0 ||
    hud.upgrades.tough > 0 ||
    hud.ownedBeeTypes.length > 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Subtle outer vignette + damage impact edge flash */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.34) 100%)',
        }}
      />
      <div
        className={`pointer-events-none fixed inset-0 -z-10 transition-opacity duration-300 ${
          hud.hitFlash ? 'opacity-90' : 'opacity-0'
        }`}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,40,40,0) 42%, rgba(255,40,40,0.55) 100%)',
        }}
      />

      {/* Top Perimeter Status Bar */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 sm:px-6 sm:pt-4">
        {/* Top-Left: Level, Swarm & Score Cluster */}
        {hud.phase !== 'title' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-white shadow-md ${
                hud.isBossLevel
                  ? 'border-purple-300/75 bg-[#291438]/90'
                  : 'border-white/40 bg-[#183823]/88'
              }`}
            >
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90">
                  {hud.isBossLevel ? 'Boss Level' : 'Level'}
                </div>
                <div className="tabular-nums text-lg font-black leading-none text-amber-300">{hud.stage}</div>
              </div>
              {hud.isBossLevel && (
                <span className="rounded bg-purple-500 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  BOSS
                </span>
              )}
            </div>

            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-md transition-colors duration-150 ${
                countFlashRed
                  ? 'border-rose-300 bg-rose-700/95 text-rose-50'
                  : 'border-amber-300/60 bg-[#2a2115]/88 text-amber-50'
              }`}
            >
              <BeeSvgIcon className="h-5 w-5 shrink-0" color={activeBeeColor} />
              <div className="leading-tight">
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    countFlashRed ? 'text-rose-200' : 'text-amber-300/90'
                  }`}
                >
                  Swarm
                </div>
                <div
                  className={`tabular-nums text-lg font-black leading-none ${
                    countFlashRed ? 'text-rose-100' : 'text-white'
                  }`}
                >
                  {hud.bees}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-emerald-300/40 bg-[#173624]/88 px-3 py-1.5 text-emerald-50 shadow-md">
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90">Nectar</div>
                <div className="tabular-nums text-lg font-black leading-none text-white">{hud.score}</div>
              </div>
              {hud.combo > 1 && (
                <div className="rounded-md bg-amber-400 px-1.5 py-0.5 tabular-nums text-xs font-black text-amber-950">
                  ×{hud.combo}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Top-Center: Wasp Nest HP Bar (during boss approach/fight) or Level Progress */}
        {hud.phase !== 'title' &&
          (hud.bossActive ? (
            <div
              className={`flex flex-col items-center rounded-xl border-2 px-4 py-1.5 text-white shadow-lg ${
                hud.isBossLevel
                  ? 'border-purple-300/80 bg-[#271133]/94'
                  : 'border-rose-300/75 bg-[#2d1215]/92'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                <span className={hud.isBossLevel ? 'text-purple-300' : 'text-rose-300'}>
                  {hud.isBossLevel ? 'Hornet Queen Nest' : 'Wasp Nest'}
                </span>
                <span className="text-white/45">·</span>
                <span className="tabular-nums text-rose-100">
                  {hud.bossHp} / {hud.bossMaxHp}
                </span>
              </div>
              <div className="mt-1 h-2.5 w-36 sm:w-48 overflow-hidden rounded-full bg-black/45">
                <div
                  className={`h-full rounded-full transition-transform duration-75 ease-out ${
                    hud.isBossLevel ? 'bg-purple-500' : 'bg-rose-500'
                  }`}
                  style={{
                    transform: `scaleX(${Math.max(0, Math.min(1, hud.bossHp / Math.max(1, hud.bossMaxHp)))})`,
                    transformOrigin: 'left',
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex flex-col items-center rounded-xl border border-white/40 bg-[#183823]/82 px-3.5 py-1.5 text-white shadow-md">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                <span className="text-amber-300">LEVEL {hud.stage}</span>
                <span className="text-white/50">·</span>
                <span className="text-emerald-200">{hud.biomeName}</span>
                <span className="text-white/50">·</span>
                <span className="tabular-nums">{hud.distance}m</span>
              </div>
              <div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-black/35">
                <div
                  className="h-full rounded-full bg-amber-400 transition-transform duration-150 ease-out"
                  style={{ transform: `scaleX(${hud.stageProgress})`, transformOrigin: 'left' }}
                />
              </div>
            </div>
          ))}

        {/* Top-Right: Honey Stash, Quality, Audio & Pause Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-300/60 bg-[#2a2115]/88 px-3 py-1.5 text-amber-100 shadow-md">
            <HoneyDropSvgIcon className="h-4 w-4 shrink-0" />
            <div className="leading-tight">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-300/85">Honey</div>
              <div className="tabular-nums text-sm font-black leading-none text-amber-300">{hud.honey}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleQuality}
            aria-label={`Graphics quality: ${hud.quality === 'high' ? 'High' : 'Low'}`}
            title="Toggle Graphics Quality"
            className="flex h-10 items-center justify-center rounded-xl border border-white/45 bg-[#1b3622]/85 px-2.5 text-xs font-black uppercase tracking-wider text-emerald-100 shadow-md transition hover:bg-[#23472d] active:scale-95 cursor-pointer"
          >
            {hud.quality === 'high' ? 'HD' : 'LOW'}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
            title={hud.muted ? 'Unmute (M)' : 'Mute (M)'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/45 bg-[#1b3622]/85 text-white shadow-md transition hover:bg-[#23472d] active:scale-95 cursor-pointer"
          >
            {hud.muted ? <VolumeX className="h-5 w-5 text-rose-300" /> : <Volume2 className="h-5 w-5 text-amber-300" />}
          </button>

          {hud.phase === 'playing' && (
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause game"
              title="Pause (Esc)"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/45 bg-[#1b3622]/85 text-white shadow-md transition hover:bg-[#23472d] active:scale-95 cursor-pointer"
            >
              <Pause className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Power-Ups Bar (Shield, Turbo, Magnet) */}
      {(hud.phase === 'playing' || hud.phase === 'winning') && hasPowerups && (
        <div className="pointer-events-none flex justify-center pt-1.5">
          <div className="flex items-center gap-2 rounded-xl border border-white/30 bg-[#102418]/85 px-3 py-1 text-xs font-black text-white shadow-md">
            {hud.powerups.shield && (
              <span className="flex items-center gap-1 text-sky-300">
                <Shield className="h-3.5 w-3.5" /> Shield
              </span>
            )}
            {hud.powerups.turbo > 0 && (
              <span className="flex items-center gap-1 tabular-nums text-amber-300">
                <Zap className="h-3.5 w-3.5" /> Turbo {hud.powerups.turbo}s
              </span>
            )}
            {hud.powerups.magnet > 0 && (
              <span className="flex items-center gap-1 tabular-nums text-rose-300">
                <Magnet className="h-3.5 w-3.5" /> Magnet ×{hud.powerups.magnet}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Center Level / Boss Intro Banner (non-blocking) */}
      {hud.phase === 'playing' && hud.levelBanner && visibleBannerId === hud.levelBanner.id && (
        <div className="pointer-events-none fixed inset-x-0 top-[25%] flex justify-center px-4">
          <div
            className={`rounded-2xl border-2 px-6 py-3 text-center shadow-2xl ${
              hud.levelBanner.isBoss
                ? 'border-purple-300 bg-[#2b103a]/92 text-white'
                : 'border-amber-200/80 bg-[#18331f]/88 text-white'
            }`}
          >
            <div
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                hud.levelBanner.isBoss ? 'text-purple-200' : 'text-amber-300'
              }`}
            >
              {hud.levelBanner.title}
            </div>
            <div className="mt-0.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-100/90">
              {hud.levelBanner.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* Coaching Tip Pill (non-blocking) */}
      {hud.phase === 'playing' && hud.tipText && (
        <div className="pointer-events-none fixed inset-x-0 top-[17%] flex justify-center px-4">
          <div className="rounded-xl border border-amber-200/70 bg-[#18331f]/90 px-4 py-1.5 text-center text-xs sm:text-sm font-extrabold text-amber-100 shadow-lg">
            {hud.tipText}
          </div>
        </div>
      )}

      {/* First-Run Swaying Drag Hand Indicator */}
      {hud.showDragHand && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 rounded-full border border-amber-200/80 bg-[#18331f]/88 px-4 py-2 text-amber-200 shadow-lg animate-bounce">
            <MoveHorizontal className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-wider">Drag to Steer</span>
          </div>
        </div>
      )}

      {/* Center Feedback Toast (non-blocking) */}
      {hud.phase === 'playing' && visibleToast && (
        <div className="pointer-events-none flex justify-center pt-2">
          <div
            className={`rounded-xl border px-3.5 py-1 text-sm font-black tracking-wide shadow-md ${
              visibleToast.tone === 'gold'
                ? 'border-amber-200 bg-amber-500/95 text-amber-950'
                : visibleToast.tone === 'positive'
                  ? 'border-emerald-200 bg-emerald-600/95 text-white'
                  : 'border-rose-200 bg-rose-600/95 text-white'
            }`}
          >
            {visibleToast.text}
          </div>
        </div>
      )}

      {/* TITLE SCREEN */}
      {hud.phase === 'title' && (
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-start pt-4 sm:pt-8 px-4">
          <TitleLockupSvg />

          {hasProgress && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-amber-300/60 bg-[#2a2115]/85 px-3.5 py-1 tabular-nums text-xs font-bold uppercase tracking-wider text-amber-200 shadow">
              <span>
                Level {hud.stage} · {hud.biomeName}
              </span>
              {hud.totalStars > 0 && (
                <span className="flex items-center gap-0.5 text-amber-300">
                  · <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> {hud.totalStars}
                </span>
              )}
              {hud.bestScore > 0 && <span>· Best {hud.bestScore}</span>}
            </div>
          )}

          <div className="pointer-events-auto mt-4 flex flex-col items-center gap-2.5">
            {hud.dailyGift.canClaim && (
              <button
                type="button"
                onClick={onClaimDailyGift}
                className="flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-500 px-5 py-2 text-xs font-black uppercase tracking-wider text-emerald-950 shadow-lg transition hover:bg-emerald-400 active:scale-95 cursor-pointer"
              >
                <Gift className="h-4 w-4" />
                Claim Daily Gift (+{hud.dailyGift.nextReward} Honey · Day {hud.dailyGift.streak})
              </button>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onStart}
                className="flex items-center gap-2.5 rounded-2xl border-2 border-amber-200 bg-amber-400 px-8 py-3.5 text-lg font-black uppercase tracking-wider text-amber-950 shadow-[0_8px_20px_rgba(120,53,15,0.35)] transition hover:bg-amber-300 active:scale-95 cursor-pointer"
              >
                <Play className="h-5 w-5 fill-amber-950" />
                {hud.stage > 1 ? `Continue (Level ${hud.stage})` : 'Start Flight'}
              </button>

              <button
                type="button"
                onClick={() => setTitleShopOpen((v) => !v)}
                className="relative flex items-center gap-2 rounded-2xl border-2 border-amber-300/70 bg-[#1b3622]/92 px-5 py-3.5 text-sm font-black uppercase tracking-wider text-amber-200 shadow-lg transition hover:bg-[#25492e] active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4 text-amber-300" />
                Shop & Missions
                {claimableMissions > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-black text-emerald-950">
                    {claimableMissions}
                  </span>
                )}
              </button>
            </div>

            <div className="rounded-lg bg-[#183823]/78 px-3.5 py-1.5 text-center text-xs font-semibold tracking-wide text-emerald-50 shadow">
              Drag or A / D / ← → to Steer · Grab Shield, Turbo & Magnet · Space Buzz Surge
            </div>
          </div>

          {titleShopOpen && (
            <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/48 px-4 py-4 overflow-y-auto">
              <div className="w-full max-w-sm rounded-2xl border-2 border-amber-300 bg-[#1d2e1b] p-5 text-white shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300">
                    <BeeSvgIcon className="h-6 w-6" color={activeBeeColor} />
                    <h2 className="text-xl font-black tracking-tight">HIVE SHOP & MISSIONS</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTitleShopOpen(false)}
                    aria-label="Close Hive Shop"
                    className="rounded-lg p-1 text-emerald-100/70 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <HiveShopPanel
                  hud={hud}
                  onBuyUpgrade={onBuyUpgrade}
                  onSelectBeeType={onSelectBeeType}
                  onClaimMission={onClaimMission}
                />

                <div className="mt-4 flex items-center justify-between">
                  <ResetProgressButton onResetProgress={onResetProgress} />
                  <button
                    type="button"
                    onClick={() => {
                      setTitleShopOpen(false);
                      onStart();
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black uppercase tracking-wide text-amber-950 hover:bg-amber-300 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-amber-950" />
                    Fly Level {hud.stage}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAUSE MODAL */}
      {hud.phase === 'paused' && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-amber-200/70 bg-[#1c2e20] p-6 text-white shadow-2xl">
            <h2 className="text-center text-2xl font-black tracking-tight text-amber-300">FLIGHT PAUSED</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-black/30 p-3 text-center">
              <div>
                <div className="text-[11px] font-semibold uppercase text-emerald-200/75">Swarm</div>
                <div className="tabular-nums text-lg font-black">{hud.bees}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase text-emerald-200/75">Nectar</div>
                <div className="tabular-nums text-lg font-black">{hud.score}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase text-emerald-200/75">Distance</div>
                <div className="tabular-nums text-lg font-black">{hud.distance}m</div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 font-black uppercase tracking-wide text-amber-950 transition hover:bg-amber-300 active:scale-98 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-amber-950" />
                Resume
              </button>
              <button
                type="button"
                onClick={onRetryLevel}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 py-2.5 font-bold text-white transition hover:bg-white/20 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Restart Level {hud.stage}
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="w-full rounded-xl py-2 text-sm font-semibold text-emerald-200/85 transition hover:text-white cursor-pointer"
              >
                Back to Title
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY MODAL (1-3 Stars + Honey + Shop + Next Level) */}
      {hud.phase === 'victory' && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/48 px-4 py-4 overflow-y-auto">
          <div
            className={`w-full max-w-sm rounded-2xl border-2 p-5 text-white shadow-2xl ${
              hud.isBossLevel ? 'border-purple-300 bg-[#23172d]' : 'border-amber-300 bg-[#1d2e1b]'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-amber-300">
              <BeeSvgIcon className="h-6 w-6" color={activeBeeColor} />
              <h2 className="text-xl font-black tracking-tight">
                {hud.isBossLevel ? 'BOSS DEFEATED!' : `LEVEL ${hud.stage} COMPLETE!`}
              </h2>
            </div>

            {/* 1-3 Stars Rating */}
            <div className="mt-2.5 flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => {
                const earned = s <= hud.earnedStars;
                return (
                  <Star
                    key={s}
                    className={`h-8 w-8 transition-transform ${
                      earned
                        ? 'fill-amber-400 text-amber-200 drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)] scale-105'
                        : 'fill-black/30 text-white/25'
                    }`}
                  />
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-amber-300/40 bg-amber-500/20 px-3 py-1.5 text-sm font-black text-amber-200">
              <HoneyDropSvgIcon className="h-4 w-4" />
              <span className="tabular-nums">
                +{hud.earnedHoney} Honey Earned!{hud.isBossLevel ? ' (Boss Bonus ×2)' : ''}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-black/35 p-2.5 text-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-amber-200/75">Bees Left</div>
                <div className="tabular-nums text-lg font-black text-amber-300">{hud.bees}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-emerald-200/75">Score</div>
                <div className="tabular-nums text-lg font-black text-white">{hud.score}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-emerald-200/75">Total Stars</div>
                <div className="tabular-nums text-lg font-black text-amber-200">{hud.totalStars}</div>
              </div>
            </div>

            <HiveShopPanel
              hud={hud}
              onBuyUpgrade={onBuyUpgrade}
              onSelectBeeType={onSelectBeeType}
              onClaimMission={onClaimMission}
            />

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={onNextStage}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 font-black uppercase tracking-wide text-amber-950 transition hover:bg-amber-300 active:scale-98 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-amber-950" />
                Next Level (Level {hud.stage + 1})
              </button>
              <div className="flex items-center justify-between pt-1">
                <ResetProgressButton onResetProgress={onResetProgress} />
                <button
                  type="button"
                  onClick={onReturnTitle}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-200/85 transition hover:text-white cursor-pointer"
                >
                  Back to Title
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {hud.phase === 'gameover' && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4 py-4 overflow-y-auto">
          <div className="w-full max-w-sm rounded-2xl border-2 border-amber-300/80 bg-[#1f291c] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-amber-300">
              <BeeSvgIcon className="h-6 w-6" color={activeBeeColor} />
              <h2 className="text-xl font-black tracking-tight">SWARM SCATTERED</h2>
            </div>

            <div className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-amber-300/40 bg-amber-500/20 px-3 py-1.5 text-sm font-black text-amber-200">
              <HoneyDropSvgIcon className="h-4 w-4" />
              <span className="tabular-nums">+{hud.earnedHoney} Honey Gathered!</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-black/35 p-2.5 text-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-amber-200/75">Level</div>
                <div className="tabular-nums text-lg font-black text-amber-300">{hud.stage}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-emerald-200/75">Score</div>
                <div className="tabular-nums text-lg font-black text-white">{hud.score}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-emerald-200/75">Best</div>
                <div className="tabular-nums text-lg font-black text-amber-200">{hud.bestScore}</div>
              </div>
            </div>

            <HiveShopPanel
              hud={hud}
              onBuyUpgrade={onBuyUpgrade}
              onSelectBeeType={onSelectBeeType}
              onClaimMission={onClaimMission}
            />

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={onRetryLevel}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 font-black uppercase tracking-wide text-amber-950 transition hover:bg-amber-300 active:scale-98 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Try Level {hud.stage} Again
              </button>
              <div className="flex items-center justify-between pt-1">
                <ResetProgressButton onResetProgress={onResetProgress} />
                <button
                  type="button"
                  onClick={onReturnTitle}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-200/85 transition hover:text-white cursor-pointer"
                >
                  Back to Title
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Playing only) */}
      {hud.phase === 'playing' && (
        <div className="pointer-events-none flex flex-col items-center pb-4">
          <div className="pointer-events-auto flex flex-col items-center">
            <button
              type="button"
              onClick={() => setDockCollapsed((v) => !v)}
              className="mb-1 flex items-center gap-1 rounded-t-lg border border-b-0 border-white/30 bg-[#18331f]/82 px-3 py-0.5 text-[11px] font-bold text-emerald-100 hover:bg-[#22462b] cursor-pointer"
              title="Toggle Controls (H)"
            >
              {dockCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {dockCollapsed ? 'Show Controls' : 'Hide Controls'}
            </button>

            {!dockCollapsed && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/35 bg-[#18331f]/88 px-4 py-2 text-white shadow-lg">
                <button
                  type="button"
                  onClick={onTriggerSurge}
                  disabled={!surgeReady}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider transition ${
                    hud.surgeActive
                      ? 'bg-amber-400 text-amber-950'
                      : surgeReady
                        ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 cursor-pointer'
                        : 'bg-white/10 text-white/70 cursor-default'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  <span>
                    {hud.surgeActive
                      ? 'SURGING!'
                      : surgeReady
                        ? 'BUZZ SURGE (SPACE)'
                        : `SURGE ${hud.surgeCharge}%`}
                  </span>
                </button>

                <div className="h-2.5 w-24 sm:w-32 overflow-hidden rounded-full bg-black/40">
                  <div
                    className={`h-full rounded-full transition-transform duration-100 ease-out ${
                      hud.surgeActive ? 'bg-amber-300' : surgeReady ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{
                      transform: `scaleX(${hud.surgeActive ? hud.surgeRemaining : hud.surgeCharge / 100})`,
                      transformOrigin: 'left',
                    }}
                  />
                </div>

                <span className="hidden md:inline text-[11px] font-medium text-emerald-100/80">
                  Drag / ← → Steer
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
