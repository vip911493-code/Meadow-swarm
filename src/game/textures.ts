import * as THREE from 'three';
import { BEE_TYPES, type BeeTypeId, type PickupKind } from './types';

export interface ProceduralTexturePack {
  meadowGround: THREE.CanvasTexture;
  pathSurface: THREE.CanvasTexture;
  beeStripe: THREE.CanvasTexture;
  beeStripes: Record<BeeTypeId, THREE.CanvasTexture>;
  pickups: Record<PickupKind, THREE.CanvasTexture>;
  hornetStripe: THREE.CanvasTexture;
  bark: THREE.CanvasTexture;
  toadstoolCap: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  spiderWeb: THREE.CanvasTexture;
  nestPaper: THREE.CanvasTexture;
  glow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(px + r, py);
  ctx.arcTo(px + w, py, px + w, py + h, r);
  ctx.arcTo(px + w, py + h, px, py + h, r);
  ctx.arcTo(px, py + h, px, py, r);
  ctx.arcTo(px, py, px + w, py, r);
  ctx.closePath();
}

function configureColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function createBeeStripeTexture(baseColor: string, maxAnisotropy: number): THREE.CanvasTexture {
  const [bCanvas, bCtx] = makeCanvas(256, 256);
  bCtx.fillStyle = baseColor;
  bCtx.fillRect(0, 0, 256, 256);
  const bBands = [
    { x: 38, w: 34, c: '#231b15' },
    { x: 102, w: 36, c: '#231b15' },
    { x: 168, w: 36, c: '#231b15' },
    { x: 226, w: 30, c: '#1a130e' },
  ];
  bBands.forEach((b) => {
    bCtx.fillStyle = b.c;
    bCtx.fillRect(b.x, 0, b.w, 256);
  });
  const bHighlight = bCtx.createLinearGradient(0, 0, 0, 256);
  bHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  bHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  bHighlight.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
  bCtx.fillStyle = bHighlight;
  bCtx.fillRect(0, 0, 256, 256);
  return configureColorTexture(bCanvas, maxAnisotropy);
}

function createPickupBadgeTexture(kind: PickupKind, maxAnisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(192, 192);
  const cx = 96;
  const cy = 96;

  const palette: Record<PickupKind, { halo: string; fillA: string; fillB: string; ring: string }> = {
    shield: { halo: 'rgba(56, 189, 248, 0.45)', fillA: '#38bdf8', fillB: '#0369a1', ring: '#e0f2fe' },
    turbo: { halo: 'rgba(250, 204, 21, 0.48)', fillA: '#fde047', fillB: '#ea580c', ring: '#fef9c3' },
    magnet: { halo: 'rgba(244, 63, 94, 0.45)', fillA: '#fb7185', fillB: '#be123c', ring: '#ffe4e6' },
    honey: { halo: 'rgba(245, 158, 11, 0.48)', fillA: '#fcd34d', fillB: '#b45309', ring: '#fef3c7' },
  };
  const pal = palette[kind];

  const halo = ctx.createRadialGradient(cx, cy, 34, cx, cy, 92);
  halo.addColorStop(0, pal.halo);
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 192, 192);

  const disc = ctx.createLinearGradient(0, 32, 0, 160);
  disc.addColorStop(0, pal.fillA);
  disc.addColorStop(1, pal.fillB);
  ctx.beginPath();
  ctx.arc(cx, cy, 58, 0, Math.PI * 2);
  ctx.fillStyle = disc;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = pal.ring;
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (kind === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(25, -18);
    ctx.lineTo(22, 10);
    ctx.quadraticCurveTo(0, 32, 0, 34);
    ctx.quadraticCurveTo(0, 32, -22, 10);
    ctx.lineTo(-25, -18);
    ctx.closePath();
    ctx.fillStyle = '#f0f9ff';
    ctx.fill();
    ctx.strokeStyle = '#075985';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (kind === 'turbo') {
    ctx.beginPath();
    ctx.moveTo(6, -32);
    ctx.lineTo(-18, 4);
    ctx.lineTo(-2, 4);
    ctx.lineTo(-8, 32);
    ctx.lineTo(20, -4);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fillStyle = '#fffbeb';
    ctx.fill();
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 3.5;
    ctx.stroke();
  } else if (kind === 'magnet') {
    ctx.beginPath();
    ctx.arc(0, 4, 21, Math.PI, 0, false);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#fff1f2';
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-28, -22, 14, 16);
    ctx.fillRect(14, -22, 14, 16);
  } else {
    // Honey pot
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(0, 8, 25, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, -13, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-8, -4, 6, 0, Math.PI);
    ctx.arc(5, -2, 7, 0, Math.PI);
    ctx.fill();
  }

  ctx.restore();
  return configureColorTexture(c, maxAnisotropy);
}

export function createProceduralTexturePack(maxAnisotropy: number): ProceduralTexturePack {
  // 1. Lush Meadow Ground with crisp grass blades
  const [gCanvas, gCtx] = makeCanvas(512, 512);
  gCtx.fillStyle = '#4aa84f';
  gCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) {
    const x = ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1) * 512;
    const y = ((((Math.sin(i * 78.233) * 19341.123) % 1) + 1) % 1) * 512;
    const r = 10 + (i % 24);
    gCtx.fillStyle =
      i % 3 === 0
        ? 'rgba(116, 206, 98, 0.24)'
        : i % 3 === 1
          ? 'rgba(54, 134, 62, 0.22)'
          : 'rgba(148, 220, 110, 0.16)';
    gCtx.beginPath();
    gCtx.arc(x, y, r, 0, Math.PI * 2);
    gCtx.fill();
  }
  gCtx.strokeStyle = 'rgba(38, 108, 46, 0.34)';
  gCtx.lineWidth = 2;
  for (let i = 0; i < 650; i++) {
    const x = ((((Math.sin(i * 41.7) * 9137.3) % 1) + 1) % 1) * 504 + 4;
    const y = ((((Math.sin(i * 17.3) * 6143.9) % 1) + 1) % 1) * 504 + 4;
    gCtx.beginPath();
    gCtx.moveTo(x, y);
    gCtx.lineTo(x + ((i % 5) - 2) * 2.2, y - 6 - (i % 6));
    gCtx.stroke();
  }
  const meadowGround = configureColorTexture(gCanvas, maxAnisotropy, 14, 18);

  // 2. Meadow Flight Path (clear runway with bright borders & organic pebbles)
  const [pCanvas, pCtx] = makeCanvas(512, 512);
  const pGrad = pCtx.createLinearGradient(0, 0, 512, 0);
  pGrad.addColorStop(0, '#5dc258');
  pGrad.addColorStop(0.06, '#a7e883');
  pGrad.addColorStop(0.1, '#79d166');
  pGrad.addColorStop(0.5, '#86db71');
  pGrad.addColorStop(0.9, '#79d166');
  pGrad.addColorStop(0.94, '#a7e883');
  pGrad.addColorStop(1, '#5dc258');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 512, 512);

  pCtx.fillStyle = 'rgba(255, 252, 224, 0.24)';
  for (let y = 16; y < 512; y += 64) {
    pCtx.fillRect(170, y, 6, 30);
    pCtx.fillRect(336, y, 6, 30);
  }
  for (let i = 0; i < 320; i++) {
    const x = 40 + ((i * 73) % 432);
    const y = (i * 41) % 512;
    pCtx.fillStyle = i % 2 === 0 ? 'rgba(255, 248, 200, 0.16)' : 'rgba(72, 165, 76, 0.2)';
    pCtx.beginPath();
    pCtx.ellipse(x, y, 3 + (i % 5), 2 + (i % 4), (i % 6) * 0.5, 0, Math.PI * 2);
    pCtx.fill();
  }
  const pathSurface = configureColorTexture(pCanvas, maxAnisotropy, 1, 16);

  // 3. Bee Class Stripes (Normal, Speedy, Venom, Shield)
  const beeStripes: Record<BeeTypeId, THREE.CanvasTexture> = {
    normal: createBeeStripeTexture(BEE_TYPES.normal.hex, maxAnisotropy),
    speedy: createBeeStripeTexture(BEE_TYPES.speedy.hex, maxAnisotropy),
    venom: createBeeStripeTexture(BEE_TYPES.venom.hex, maxAnisotropy),
    shield: createBeeStripeTexture(BEE_TYPES.shield.hex, maxAnisotropy),
  };
  const beeStripe = beeStripes.normal;

  // 3b. Power-up Badges
  const pickups: Record<PickupKind, THREE.CanvasTexture> = {
    shield: createPickupBadgeTexture('shield', maxAnisotropy),
    turbo: createPickupBadgeTexture('turbo', maxAnisotropy),
    magnet: createPickupBadgeTexture('magnet', maxAnisotropy),
    honey: createPickupBadgeTexture('honey', maxAnisotropy),
  };

  // 4. Hornet Crimson-Black Stripes
  const [hCanvas, hCtx] = makeCanvas(256, 256);
  hCtx.fillStyle = '#e83e2b';
  hCtx.fillRect(0, 0, 256, 256);
  [36, 102, 170, 224].forEach((x) => {
    hCtx.fillStyle = '#1d1418';
    hCtx.fillRect(x, 0, 34, 256);
  });
  const hornetStripe = configureColorTexture(hCanvas, maxAnisotropy);

  // 5. Bark Texture
  const [kCanvas, kCtx] = makeCanvas(256, 256);
  kCtx.fillStyle = '#6c492e';
  kCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 65; i++) {
    const x = (i * 19) % 256;
    kCtx.fillStyle = i % 2 === 0 ? '#553720' : '#80593a';
    kCtx.fillRect(x, 0, 6 + (i % 5), 256);
  }
  const bark = configureColorTexture(kCanvas, maxAnisotropy, 1, 2);

  // 6. Toadstool Spotted Cap
  const [tCanvas, tCtx] = makeCanvas(256, 256);
  tCtx.fillStyle = '#e53935';
  tCtx.fillRect(0, 0, 256, 256);
  tCtx.fillStyle = '#fff8e8';
  const spots = [
    [40, 48, 22], [125, 38, 25], [210, 56, 20],
    [76, 128, 26], [174, 126, 24], [32, 198, 18],
    [130, 208, 24], [220, 196, 20],
  ];
  spots.forEach(([sx, sy, sr]) => {
    tCtx.beginPath();
    tCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    tCtx.fill();
  });
  const toadstoolCap = configureColorTexture(tCanvas, maxAnisotropy);

  // 7. Radial Contact Shadow
  const [sCanvas, sCtx] = makeCanvas(128, 128);
  const rad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
  rad.addColorStop(0, 'rgba(18, 42, 16, 0.55)');
  rad.addColorStop(0.55, 'rgba(18, 42, 16, 0.24)');
  rad.addColorStop(1, 'rgba(18, 42, 16, 0)');
  sCtx.fillStyle = rad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadow = configureColorTexture(sCanvas, maxAnisotropy);

  // 8. HD Radial Spider Web (12 spokes, catenary sag, morning dewdrops)
  const [wCanvas, wCtx] = makeCanvas(512, 512);
  wCtx.clearRect(0, 0, 512, 512);
  wCtx.save();
  wCtx.translate(256, 256);
  wCtx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  wCtx.lineWidth = 3.5;
  wCtx.lineCap = 'round';
  const spokes = 12;
  const maxR = 240;
  for (let i = 0; i < spokes; i++) {
    const a = (i * Math.PI * 2) / spokes;
    wCtx.beginPath();
    wCtx.moveTo(0, 0);
    wCtx.lineTo(Math.cos(a) * maxR, Math.sin(a) * maxR);
    wCtx.stroke();
  }
  for (let r = 36; r <= maxR; r += 34) {
    wCtx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i * Math.PI * 2) / spokes;
      const a0 = ((i - 1) * Math.PI * 2) / spokes;
      if (i === 0) {
        wCtx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        continue;
      }
      const midA = (a + a0) / 2;
      const sag = r * 0.88;
      wCtx.quadraticCurveTo(Math.cos(midA) * sag, Math.sin(midA) * sag, Math.cos(a) * r, Math.sin(a) * r);
    }
    wCtx.stroke();
  }
  wCtx.fillStyle = 'rgba(200, 240, 255, 0.9)';
  for (let k = 0; k < 26; k++) {
    const a = (k * 2.39996) % (Math.PI * 2);
    const r = 42 + ((k * 37) % 185);
    wCtx.beginPath();
    wCtx.arc(Math.cos(a) * r, Math.sin(a) * r, 2.5 + (k % 3), 0, Math.PI * 2);
    wCtx.fill();
  }
  wCtx.restore();
  const spiderWeb = configureColorTexture(wCanvas, maxAnisotropy);

  // 9. HD Scalloped Papery Wasp Nest Texture
  const [nCanvas, nCtx] = makeCanvas(512, 256);
  nCtx.fillStyle = '#b89560';
  nCtx.fillRect(0, 0, 512, 256);
  const paperPalette = ['#c9a874', '#a88650', '#d8bc86', '#9a7a48'];
  for (let j = 0; j < 14; j++) {
    nCtx.fillStyle = paperPalette[j % paperPalette.length];
    for (let i = -1; i < 9; i++) {
      nCtx.beginPath();
      nCtx.ellipse(i * 64 + (j % 2) * 32, j * 19 + 10, 40, 13, 0, 0, Math.PI * 2);
      nCtx.fill();
    }
  }
  for (let i = 0; i < 900; i++) {
    const x = (i * 89) % 512;
    const y = (i * 53) % 256;
    nCtx.fillStyle = `rgba(60, 40, 20, ${0.04 + (i % 5) * 0.02})`;
    nCtx.fillRect(x, y, 3 + (i % 9), 1.5);
  }
  const nestPaper = configureColorTexture(nCanvas, maxAnisotropy, 2, 1);

  // 10. Soft Radial Glow Texture (Sun, ambient fireflies/pollen, gate pads)
  const [glCanvas, glCtx] = makeCanvas(128, 128);
  const glGrad = glCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  glGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  glGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.55)');
  glGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  glCtx.fillStyle = glGrad;
  glCtx.fillRect(0, 0, 128, 128);
  const glow = configureColorTexture(glCanvas, maxAnisotropy);

  return {
    meadowGround,
    pathSurface,
    beeStripe,
    beeStripes,
    pickups,
    hornetStripe,
    bark,
    toadstoolCap,
    contactShadow,
    spiderWeb,
    nestPaper,
    glow,
    dispose: () => {
      meadowGround.dispose();
      pathSurface.dispose();
      Object.values(beeStripes).forEach((t) => t.dispose());
      Object.values(pickups).forEach((t) => t.dispose());
      hornetStripe.dispose();
      bark.dispose();
      toadstoolCap.dispose();
      contactShadow.dispose();
      spiderWeb.dispose();
      nestPaper.dispose();
      glow.dispose();
    },
  };
}

export function createGateSignTexture(
  label: string,
  positive: boolean,
  isMultiplier: boolean,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(384, 200);
  const w = canvas.width;
  const h = canvas.height;

  const bgTop = positive ? (isMultiplier ? '#ffd24d' : '#55e68a') : '#ff7a7a';
  const bgBot = positive ? (isMultiplier ? '#d97706' : '#12803f') : '#a31515';

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bgTop);
  grad.addColorStop(1, bgBot);
  drawRoundedRect(ctx, 6, 6, w - 12, h - 12, 24);
  ctx.fillStyle = grad;
  ctx.fill();

  // Top glossy sheen
  const sheen = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.36)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  drawRoundedRect(ctx, 14, 14, w - 28, h * 0.42, 18);
  ctx.fillStyle = sheen;
  ctx.fill();

  // Outer border frame
  ctx.strokeStyle = positive ? '#fffbeb' : '#fee2e2';
  ctx.lineWidth = 8;
  drawRoundedRect(ctx, 6, 6, w - 12, h - 12, 24);
  ctx.stroke();

  // Crisp outlined label
  ctx.font = '900 104px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.strokeText(label, w / 2, h / 2 + 5);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, w / 2, h / 2 + 5);

  return configureColorTexture(canvas, maxAnisotropy);
}
