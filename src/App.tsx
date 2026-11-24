import { useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { SwarmEngine } from './game/SwarmEngine';
import type { HudSnapshot } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  bees: 20,
  peakBees: 20,
  score: 0,
  bestScore: 0,
  bestLevel: 1,
  distance: 0,
  stage: 1,
  stageProgress: 0,
  isBossLevel: false,
  biomeName: 'Meadow',
  bossActive: false,
  bossHp: 150,
  bossMaxHp: 150,
  combo: 0,
  surgeCharge: 50,
  surgeActive: false,
  surgeRemaining: 0,
  honey: 0,
  earnedHoney: 0,
  earnedStars: 0,
  totalStars: 0,
  upgrades: { bees: 0, power: 0, tough: 0 },
  beeType: 'normal',
  ownedBeeTypes: ['normal'],
  powerups: { shield: false, turbo: 0, magnet: 0 },
  dailyGift: { canClaim: false, streak: 1, nextReward: 30 },
  missions: [],
  tipText: null,
  showDragHand: false,
  muted: false,
  quality: 'high',
  hitFlash: false,
  levelBanner: null,
  lastEventText: null,
  lastEventTone: null,
  lastEventId: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SwarmEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new SwarmEngine(mountEl, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#9fd8ff]">
      {/* Isolated WebGL canvas container so React HUD updates never tear down the 3D scene */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      <GameHud
        hud={hud}
        onStart={() => engineRef.current?.startNewRun()}
        onRetryLevel={() => engineRef.current?.retryLevel()}
        onNextStage={() => engineRef.current?.advanceNextStage()}
        onBuyUpgrade={(id) => engineRef.current?.buyUpgrade(id)}
        onSelectBeeType={(id) => engineRef.current?.buyOrEquipBeeType(id)}
        onClaimDailyGift={() => engineRef.current?.claimDailyGift()}
        onClaimMission={(id) => engineRef.current?.claimMission(id)}
        onResetProgress={() => engineRef.current?.resetProgress()}
        onPause={() => engineRef.current?.pauseGame()}
        onResume={() => engineRef.current?.resumeGame()}
        onReturnTitle={() => engineRef.current?.returnToTitle()}
        onToggleMute={() => engineRef.current?.toggleMute()}
        onToggleQuality={() => engineRef.current?.toggleQuality()}
        onTriggerSurge={() => engineRef.current?.triggerSurge()}
      />
    </main>
  );
}
