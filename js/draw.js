// Canvas rendering.
'use strict';

function _drawLerp(a, b, t) { return a + (b - a) * t; }

function boatHullOffset() {
  const boat = Assets.get('boat');
  const drawH = boat ? BOAT_DRAW_W * (boat.height / boat.width) : 68;
  return drawH / 2 - BOAT_DRAW_Y_OFFSET;
}

function draw() {
  if (!G) return;
  const g = G;
  _stateCtx.clearRect(0, 0, g.cW, g.cH);

  drawBackground();
  drawSeabed();

  if (g.phase === PH.INTRO) {
    const waterY = g.boatScreenY + WATER_Y_OFFSET;
    drawWavesFar(waterY);
    drawWavesBack(waterY);
    drawBoat(g.boatScreenY);
    drawWavesMid(waterY);
    drawWavesFront(waterY);
    drawRope(g.boatScreenY, g.hookIntroY);
    drawHook(g.hookIntroY, 1);
  } else if (g.phase === PH.FISHING) {
    drawObjects();
    drawHook(g.HOOK_Y, 1, g.hookX);
    drawDepthGauge();
    drawActivePowerups();
  } else if (g.phase === PH.SURFACE) {
    const waterY = g.boatScreenY + WATER_Y_OFFSET;
    drawWavesFar(waterY);
    drawWavesBack(waterY);
    drawBoat(g.boatScreenY);
    drawWavesMid(waterY);
    drawWavesFront(waterY);
    drawRope(g.boatScreenY, g.hookSurfaceY);
    drawHook(g.hookSurfaceY, 1);
  }

  if (g.isPaused) drawPauseOverlay();
}

let _oceanBgCache = { cW: 0, cH: 0, drawW: 0, drawH: 0, drawX: 0, drawY: 0 };

const _gradCache = {
  bg:      { key: '', grad: null },
  shimmer: { key: '', grad: null },
  sand:    { key: '', grad: null, sy: -1 },
  depth:   { key: '', grad: null },
};

function _getBgGradient(cH, biome, depthT) {
  const dq  = Math.round(depthT * 100);
  const key = cH + '|' + biome.id + '|' + dq;
  if (_gradCache.bg.key === key) return _gradCache.bg.grad;
  const t   = dq / 100;
  const r1  = Math.round(_drawLerp(biome.shallowTop[0], biome.deepTop[0], t));
  const g1  = Math.round(_drawLerp(biome.shallowTop[1], biome.deepTop[1], t));
  const b1  = Math.round(_drawLerp(biome.shallowTop[2], biome.deepTop[2], t));
  const r2  = Math.round(_drawLerp(biome.shallowBot[0], biome.deepBot[0], t));
  const g2  = Math.round(_drawLerp(biome.shallowBot[1], biome.deepBot[1], t));
  const b2  = Math.round(_drawLerp(biome.shallowBot[2], biome.deepBot[2], t));
  const grad = _stateCtx.createLinearGradient(0, 0, 0, cH);
  grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
  grad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
  _gradCache.bg.key = key;
  _gradCache.bg.grad = grad;
  return grad;
}

function _getShimmerGradient(cH, depthT) {
  const dq  = Math.round(depthT * 100);
  const key = cH + '|' + dq;
  if (_gradCache.shimmer.key === key) return _gradCache.shimmer.grad;
  const a = 0.10 * (1 - (dq / 100) / 0.6);
  const grad = _stateCtx.createLinearGradient(0, 0, 0, cH * 0.3);
  grad.addColorStop(0, `rgba(255,255,255,${a})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  _gradCache.shimmer.key = key;
  _gradCache.shimmer.grad = grad;
  return grad;
}

function _getSandGradient(sy, floorH, biome) {
  // Built in local coords; translated by caller so cache survives sy changes.
  const key = biome.id + '|' + floorH;
  if (_gradCache.sand.key === key) { _gradCache.sand.sy = sy; return _gradCache.sand.grad; }
  const grad = _stateCtx.createLinearGradient(0, 0, 0, floorH);
  grad.addColorStop(0,   `rgba(${biome.sandRGB},.85)`);
  grad.addColorStop(0.3, `rgba(${biome.sandRGB},.75)`);
  grad.addColorStop(1,   `rgba(${biome.sandRGB},.90)`);
  _gradCache.sand.key = key;
  _gradCache.sand.grad = grad;
  _gradCache.sand.sy = sy;
  return grad;
}

// Invalidate gradient caches on canvas resize.
function _invalidateGradientCache() {
  _gradCache.bg.key = '';
  _gradCache.shimmer.key = '';
  _gradCache.sand.key = '';
  _gradCache.depth.key = '';
  _depthBarGradKey = '';
  _seabedDecoCache.key = '';
}

function _updateOceanBgCache(cW, cH, oceanBg) {
  if (_oceanBgCache.cW === cW && _oceanBgCache.cH === cH) return;
  const imgR = oceanBg.width / oceanBg.height, canR = cW / cH;
  if (canR > imgR) {
    _oceanBgCache.drawW = cW; _oceanBgCache.drawH = cW / imgR;
    _oceanBgCache.drawX = 0;  _oceanBgCache.drawY = cH - _oceanBgCache.drawH;
  } else {
    _oceanBgCache.drawH = cH; _oceanBgCache.drawW = cH * imgR;
    _oceanBgCache.drawX = (cW - _oceanBgCache.drawW) / 2; _oceanBgCache.drawY = 0;
  }
  _oceanBgCache.cW = cW; _oceanBgCache.cH = cH;
}

// Sky cover-scale: bottom edge snapped to waterY, centred horizontally, clipped.
function _computeSkyRect(cW, waterY, skyImg) {
  const scale = Math.max(cW / skyImg.width, waterY / skyImg.height);
  const drawW = skyImg.width  * scale;
  const drawH = skyImg.height * scale;
  const dX    = (cW - drawW) / 2;
  const dY    = waterY - drawH;
  return { dX, dY, drawW, drawH };
}

function drawBackground() {
  const g = G, cH = g.cH, cW = g.cW;
  const biome   = BIOMES[g.cfg.biome] || BIOMES.ocean;
  // Prefer biome-specific background; fall back to ocean.
  const bgKey   = (typeof resolveSkin === 'function') ? resolveSkin(biome.id, 'bg') : 'bg';
  const oceanBg = Assets.get(bgKey) || Assets.get('oceanBg');
  const depthT  = _getDepthProgress(g);

  _stateCtx.fillStyle = _getBgGradient(cH, biome, depthT);

  if (oceanBg && g.phase === PH.FISHING) {
    _stateCtx.globalAlpha = 0.4; _stateCtx.fillRect(0, 0, cW, cH); _stateCtx.globalAlpha = 1;
  } else {
    _stateCtx.fillRect(0, 0, cW, cH);
  }

  if (oceanBg) {
    _updateOceanBgCache(cW, cH, oceanBg);
    const aboveWater = (g.phase === PH.INTRO || g.phase === PH.SURFACE);
    const waterY = aboveWater ? g.boatScreenY + WATER_Y_OFFSET : 0;

    // Sky: draw only when boat is visible (INTRO / SURFACE).
    if (aboveWater && waterY > 0) {
      const skyKey = (typeof resolveSkin === 'function') ? resolveSkin(biome.id, 'sky') : 'oceanSky';
      const skyImg = Assets.get(skyKey) || Assets.get('oceanSky');
      if (skyImg) {
        const r = _computeSkyRect(cW, waterY, skyImg);
        _stateCtx.save();
        _stateCtx.beginPath(); _stateCtx.rect(0, 0, cW, waterY); _stateCtx.clip();
        _stateCtx.drawImage(skyImg, r.dX, r.dY, r.drawW, r.drawH);
        _stateCtx.restore();
      }
    }

    // Underwater.
    _stateCtx.save();
    _stateCtx.beginPath(); _stateCtx.rect(0, waterY, cW, cH - waterY); _stateCtx.clip();
    _stateCtx.globalAlpha = 0.35;
    _stateCtx.drawImage(oceanBg, _oceanBgCache.drawX, _oceanBgCache.drawY,
      _oceanBgCache.drawW, _oceanBgCache.drawH);
    _stateCtx.restore();
  }

  if (depthT < 0.6) {
    _stateCtx.fillStyle = _getShimmerGradient(cH, depthT);
    _stateCtx.fillRect(0, 0, cW, cH * 0.3);
  }
}

// Seabed deco cached to offscreen canvas; each frame just blits it.
const _seabedDecoCache = { key: '', canvas: null };
const _SEABED_DECO_POS = [
  { x: 0.08, y: 6, sz: 22 }, { x: 0.22, y: 10, sz: 20 },
  { x: 0.35, y: 20, sz: 14 }, { x: 0.48, y: 4,  sz: 24 },
  { x: 0.58, y: 22, sz: 14 }, { x: 0.72, y: 8,  sz: 22 },
  { x: 0.88, y: 5,  sz: 20 }, { x: 0.95, y: 18, sz: 12 },
];
function _getSeabedDecoSprite(cW, biome) {
  const key = cW + '|' + biome.id;
  if (_seabedDecoCache.key === key) return _seabedDecoCache.canvas;
  const h = 40;
  const off = document.createElement('canvas');
  off.width = cW; off.height = h;
  const octx = off.getContext('2d');
  // Elliptical sand grains.
  octx.globalAlpha = 0.45;
  [0.12, 0.25, 0.38, 0.52, 0.65, 0.78, 0.88].forEach((t, i) => {
    const px = t * cW + Math.sin(i * 3.7) * 15;
    const py = 15 + Math.sin(i * 2.3) * 8;
    const pr = 3 + (i % 3) * 1.5;
    octx.fillStyle = i % 2 === 0 ? `rgba(${biome.sandRGB},.5)` : `rgba(${biome.sandRGB},.4)`;
    octx.beginPath();
    octx.ellipse(px, py, pr, pr * 0.65, Math.sin(i) * 0.3, 0, Math.PI * 2);
    octx.fill();
  });
  // Deco emoji.
  octx.globalAlpha = 0.7 * 0.6;
  octx.textAlign = 'center'; octx.textBaseline = 'middle';
  const deco = biome.seabedDeco;
  _SEABED_DECO_POS.forEach((d, i) => {
    octx.font = `${d.sz}px serif`;
    octx.fillText(deco[i % deco.length], d.x * cW, d.y);
  });
  _seabedDecoCache.key = key;
  _seabedDecoCache.canvas = off;
  return off;
}

function drawSeabed() {
  const g = G;
  if (g.phase !== PH.FISHING && g.phase !== PH.INTRO) return;
  const biome = BIOMES[g.cfg.biome] || BIOMES.ocean;
  const ctx = _stateCtx;

  const floorH = 80;
  const sy = g.cH - floorH + Math.abs(g.worldOffset);
  if (sy > g.cH + 10) return;

  ctx.save();
  ctx.translate(0, sy);
  ctx.fillStyle = _getSandGradient(sy, floorH, biome);
  ctx.fillRect(0, 0, g.cW, floorH + 30);
  ctx.translate(0, -sy);

  ctx.drawImage(_getSeabedDecoSprite(g.cW, biome), 0, sy);

  ctx.restore();
}

function drawObjects() {
  const g = G;
  const cH = g.cH;
  const ctx = _stateCtx;
  const objs = g.objects;
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    const sy = o.y;
    if (sy < -60 || sy > cH + 60) continue;
    _drawObjectSprite(g, o, sy);
  }
}

function _drawObjectSprite(g, o, sy) {
  const ctx = _stateCtx;
  if (o.sprite) {
    const img = Assets.get(o.sprite);
    if (img) {
      const rot = Math.sin(o.wb) * 0.08;
      const scale = SPRITE_SCALE[o.sprite] || 1;
      const sz = o.sz * scale;
      const ratio = img.width / img.height;
      const drawW = ratio >= 1 ? sz : sz * ratio;
      const drawH = ratio >= 1 ? sz / ratio : sz;
      ctx.globalAlpha = o.alpha;
      if (rot) {
        ctx.save();
        ctx.translate(o.x, sy);
        ctx.rotate(rot);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      } else {
        ctx.drawImage(img, o.x - drawW / 2, sy - drawH / 2, drawW, drawH);
      }
      ctx.globalAlpha = 1;
      return;
    }
    drawEmoji('\u{1F41F}', o.x, sy, o.sz, o.alpha, Math.sin(o.wb) * 0.08);
    return;
  }
  drawEmoji(o.em, o.x, sy, o.sz, o.alpha, Math.sin(o.wb) * 0.08);
}

function drawHook(screenY, alpha, overrideCx) {
  const g  = G, cx = overrideCx || g.cW / 2;
  const hW = g.HOOK_W, hookH = g.HOOK_H;
  const showRope = (g.phase === PH.FISHING);
  _stateCtx.save();

  if (showRope) {
    _stateCtx.strokeStyle = '#c8a96e';
    _stateCtx.lineWidth = 2; _stateCtx.globalAlpha = 0.7 * alpha;
    _stateCtx.beginPath(); _stateCtx.moveTo(cx, screenY); _stateCtx.lineTo(cx, 0); _stateCtx.stroke();
  }

  const hook = Assets.get('hook');
  if (hook) {
    const drawH = hookH + 10, drawW = drawH * (hook.width / hook.height);
    _stateCtx.globalAlpha = alpha;
    if (g.hookPunch > 0) {
      const punchScale = 1 + (g.hookPunch / 8) * 0.25;
      _stateCtx.translate(cx, screenY + drawH / 2);
      _stateCtx.scale(punchScale, punchScale);
      _stateCtx.drawImage(hook, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      _stateCtx.drawImage(hook, cx - drawW / 2, screenY, drawW, drawH);
    }
  } else {
    drawEmoji('\u{1FA9D}', cx, screenY + hookH / 2, 40, alpha);
  }

  if (g.caught > 0) {
    _stateCtx.globalAlpha = 0.85 * alpha; _stateCtx.font = '700 16px "Pixelify Sans", system-ui, sans-serif';
    _stateCtx.textAlign = 'center'; _stateCtx.textBaseline = 'middle'; _stateCtx.fillStyle = '#ffd166';
    _stateCtx.fillText(`\u00D7${g.caught}`, cx, screenY + hookH + 16);
  }

  _stateCtx.restore();
}

function drawBoat(boatY) {
  const g = G, cx = g.cW / 2;
  const bob = (g.phase === PH.INTRO || g.phase === PH.SURFACE)
    ? Math.sin(g.frame * 0.06) * 2.5 : 0;
  const boat = Assets.get('boat');
  if (boat) {
    const drawW = BOAT_DRAW_W, drawH = drawW * (boat.height / boat.width);
    // Sprite's geometric centre isn't the waterline — nudge up by BOAT_DRAW_Y_OFFSET.
    _stateCtx.drawImage(boat, cx - drawW / 2, boatY + bob - drawH / 2 - BOAT_DRAW_Y_OFFSET, drawW, drawH);
  } else {
    drawEmoji('\u26F5', cx, boatY + bob, 72);
  }
}

function _biomeWaveKey(suffix) {
  const biomeId = (G && G.cfg && G.cfg.biome) ? G.cfg.biome : 'ocean';
  return biomeId + '_' + suffix;
}

function drawWavesFar(waterY) {
  drawWaveLayer(_biomeWaveKey('wave_far'),   waterY, -36, 0.15, -0.8);
}
function drawWavesBack(waterY) {
  drawWaveLayer(_biomeWaveKey('wave_back'),  waterY, -27, 0.3, -0.5);
}
function drawWavesMid(waterY) {
  drawWaveLayer(_biomeWaveKey('wave_mid'),   waterY, -18, 0.6, -0.25);
}
function drawWavesFront(waterY) {
  drawWaveLayer(_biomeWaveKey('wave_front'), waterY,  -9, 1.0,  0.0);
}


function drawWaveLayer(assetKey, waterY, yOffset, speed, bobPhase) {
  const tex = Assets.get(assetKey);
  if (!tex) return;
  const g   = G;
  const bob = Math.sin(g.frame * 0.04 + bobPhase) * 3;
  const y   = waterY + yOffset + bob;
  const tileW  = tex._tileW || tex.width;
  const offset = ((g.frame * speed) % tileW + tileW) % tileW;

  _stateCtx.drawImage(tex, offset, y);
  _stateCtx.drawImage(tex, offset - tileW, y);
}

// INTRO / SURFACE: single rope from boat centre to hook.
function drawRope(boatY, hookY) {
  const g = G;
  const ropeX = g.cW / 2;
  const ropeStartY = boatY + boatHullOffset();
  if (hookY <= ropeStartY) return;
  _stateCtx.save();
  _stateCtx.strokeStyle = '#c8a96e';
  _stateCtx.lineWidth   = 2;
  _stateCtx.globalAlpha = 0.75;
  _stateCtx.beginPath();
  _stateCtx.moveTo(ropeX, ropeStartY);
  _stateCtx.lineTo(ropeX, hookY);
  _stateCtx.stroke();
  _stateCtx.restore();
}

// Depth gauge gradient cached in local coords; caller translates.
let _depthBarGrad = null;
let _depthBarGradKey = '';
function _getDepthBarGradient(barY, barH) {
  const key = barY + '|' + barH;
  if (_depthBarGradKey === key) return _depthBarGrad;
  const grad = _stateCtx.createLinearGradient(0, barH, 0, 0);
  grad.addColorStop(0, '#0077b6');
  grad.addColorStop(1, '#00ffe7');
  _depthBarGrad = grad;
  _depthBarGradKey = key;
  return grad;
}

function drawDepthGauge() {
  const g = G;
  const progress     = _getDepthProgress(g);
  const currentDepth = Math.round(g.cfg.depthM * (1 - progress));
  const maxDepth     = g.cfg.depthM;
  const ctx = _stateCtx;

  ctx.save();

  const barX = 12, barY = 70, barH = g.cH * 0.45, barW = 5;

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#5bc8ef';
  _drawRoundRect(barX, barY, barW, barH, 3); ctx.fill();

  ctx.globalAlpha = 0.8;
  const fillH = barH * progress;
  if (fillH > 0) {
    ctx.save();
    ctx.translate(barX, barY);
    ctx.fillStyle = _getDepthBarGradient(0, barH);
    _drawRoundRect(0, barH - fillH, barW, fillH, 3); ctx.fill();
    ctx.restore();
  }

  const indicatorY = barY + barH - fillH;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#00ffe7';
  ctx.beginPath();
  ctx.arc(barX + barW / 2, Math.max(indicatorY, barY + 3), 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 1px offset outline — much cheaper than shadowBlur.
  ctx.font = '11px "Press Start 2P", system-ui, monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const ty = Math.max(indicatorY, barY + 3);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(`${currentDepth}m`, barX + 15, ty + 1);
  ctx.fillStyle = '#00ffe7';
  ctx.fillText(`${currentDepth}m`, barX + 14, ty);

  ctx.globalAlpha = 0.45;
  ctx.font = '11px "Pixelify Sans", system-ui, sans-serif';
  ctx.fillStyle = '#5bc8ef';
  ctx.fillText('0m', barX + 14, barY - 6);
  ctx.fillText(`${maxDepth}m`, barX + 14, barY + barH + 12);

  ctx.restore();
}

function drawActivePowerups() {
  const g = G;
  const items = [];
  if (g.shieldActive) items.push({ kind: 'img', asset: 'iconShield' });
  if (g.wormActive) items.push({ kind: 'img', asset: 'iconWorm' });
  if (!items.length) return;
  _stateCtx.save();
  _stateCtx.globalAlpha = 0.85;
  const size = 22;
  const rightEdge = g.cW - 10;
  items.forEach((it, i) => {
    const img = Assets.get(it.asset);
    if (img) {
      const y = 56 + i * (size + 6);
      _stateCtx.drawImage(img, rightEdge - size, y, size, size);
    }
  });
  _stateCtx.restore();
}

function drawPauseOverlay() {
  const g = G;
  const ctx = _stateCtx;
  ctx.save();
  ctx.fillStyle = 'rgba(4,13,26,0.60)'; ctx.fillRect(0, 0, g.cW, g.cH);
  ctx.font = '32px "Press Start 2P", system-ui, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Offset-draw outline is ~5-10x cheaper than shadowBlur.
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText('PAUSED', g.cW / 2 + 2, g.cH / 2 - 8);
  ctx.fillStyle = '#ffd166';
  ctx.fillText('PAUSED', g.cW / 2, g.cH / 2 - 10);
  ctx.font = '700 16px "Pixelify Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText('Press ESC to resume', g.cW / 2 + 1, g.cH / 2 + 31);
  ctx.fillStyle = '#f0faff';
  ctx.fillText('Press ESC to resume', g.cW / 2, g.cH / 2 + 30);
  ctx.restore();
}

function _getDepthProgress(g) {
  if (g.phase === PH.SURFACE || g.phase === PH.RESULT) return 1;
  if (g.phase === PH.FISHING) return Math.min(-g.worldOffset / g.WORLD_H, 1);
  return 0;
}

function _drawRoundRect(x, y, w, h, r) {
  if (w <= 0) return;
  _stateCtx.beginPath();
  _stateCtx.moveTo(x + r, y); _stateCtx.lineTo(x + w - r, y); _stateCtx.quadraticCurveTo(x + w, y, x + w, y + r);
  _stateCtx.lineTo(x + w, y + h - r); _stateCtx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  _stateCtx.lineTo(x + r, y + h); _stateCtx.quadraticCurveTo(x, y + h, x, y + h - r);
  _stateCtx.lineTo(x, y + r); _stateCtx.quadraticCurveTo(x, y, x + r, y); _stateCtx.closePath();
}

function drawEmoji(em, x, y, sz, alpha, rot) {
  if (alpha === undefined) alpha = 1;
  if (rot === undefined) rot = 0;
  _stateCtx.save(); _stateCtx.globalAlpha = alpha; _stateCtx.translate(x, y);
  if (rot) _stateCtx.rotate(rot);
  _stateCtx.font = `${sz}px serif`; _stateCtx.textAlign = 'center'; _stateCtx.textBaseline = 'middle';
  _stateCtx.fillText(em, 0, 0); _stateCtx.restore();
}
