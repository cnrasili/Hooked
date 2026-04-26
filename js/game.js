// Canvas setup, state, game loop, phase transitions.
'use strict';

function screenTransition(onMid) {
  onMid();
  return Promise.resolve();
}

// Animated transition used only when entering a level.
const _levelTransOverlay = document.getElementById('levelTransOverlay');

function levelTransition(onMid) {
  return new Promise(resolve => {
    // Fade in.
    _levelTransOverlay.classList.add('lto-in');
    _levelTransOverlay.addEventListener('animationend', function onIn() {
      _levelTransOverlay.removeEventListener('animationend', onIn);
      onMid();
      // Fade out.
      _levelTransOverlay.classList.remove('lto-in');
      _levelTransOverlay.classList.add('lto-out');
      _levelTransOverlay.addEventListener('animationend', function onOut() {
        _levelTransOverlay.removeEventListener('animationend', onOut);
        _levelTransOverlay.classList.remove('lto-out');
        resolve();
      });
    });
  });
}

// Fixed timestep + accumulator.
const FIXED_DT_MS  = 1000 / 60;
const MAX_FRAME_MS = 100;   // Cap on a single frame delta.
const MAX_STEPS    = 3;     // Max physics ticks per render.
let _lastTime    = 0;
let _accumulator = 0;

let _canvasCSSWidth  = 0;
let _canvasCSSHeight = 0;
let _canvasDPR       = 0;

function resizeCanvas() {
  const oldW = _canvasCSSWidth;
  const oldH = _canvasCSSHeight;

  // Canvas sizes against #appFrame, not the viewport.
  const frame = document.getElementById('appFrame');
  const fRect = frame ? frame.getBoundingClientRect()
                      : { width: window.innerWidth, height: window.innerHeight };
  const maxH = Math.floor(fRect.height);
  const maxW = Math.floor(fRect.width);
  let h = maxH;
  let w = Math.round(h * 9 / 16);
  if (w > maxW) { w = maxW; h = Math.round(w * 16 / 9); }

  // DPR clamp at 2x — higher values burn GPU for no visible gain.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (w === oldW && h === oldH && dpr === _canvasDPR) return;

  _stateCanvas.width        = Math.round(w * dpr);
  _stateCanvas.height       = Math.round(h * dpr);
  _stateCanvas.style.width  = w + 'px';
  _stateCanvas.style.height = h + 'px';
  _stateCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  _canvasCSSWidth  = w;
  _canvasCSSHeight = h;
  _canvasDPR       = dpr;

  Assets.generateWaves(w);
  if (typeof _invalidateGradientCache === 'function') _invalidateGradientCache();
  if (Input && Input.invalidateRect) Input.invalidateRect();

  if (G && oldW > 0 && oldH > 0) _rescaleGameState(G, oldW, oldH, w, h);
}

function _rescaleGameState(g, oldW, oldH, newW, newH) {
  const sx = newW / oldW;
  const sy = newH / oldH;

  g.cW = newW;
  g.cH = newH;

  g.HOOK_Y    = Math.round(newH * 0.8);
  g.boatTargetY     = Math.round(newH * 0.35);
  g.surfaceBoatY    = Math.round(newH * 0.15);
  g.hookIntroY = Math.round(newH * 0.35) + 20;

  const oldWorldH = g.WORLD_H;
  g.WORLD_H       = g.cfg.worldScale * newH;
  g.worldOffset  *= (g.WORLD_H / oldWorldH);

  g.boatScreenY *= sy;
  g.hookSurfaceY *= sy;

  const halfHook = g.HOOK_W / 2;
  g.hookX = Math.max(halfHook, Math.min(newW - halfHook, g.hookX * sx));

  g.objects.forEach(o => {
    const halfSz = o.sz / 2;
    o.x = Math.max(halfSz, Math.min(newW - halfSz, o.x * sx));
    o.y *= sy;
  });

}

// Initial sizing.
resizeCanvas();

// Debounced resize.
let _resizePending = false;
window.addEventListener('resize', () => {
  if (_resizePending) return;
  _resizePending = true;
  requestAnimationFrame(() => {
    _resizePending = false;
    resizeCanvas();
  });
});

// Build the asset load queue from SKINS + BIOME_SKINS overrides.
const _assetQueue = [];
Object.entries(SKINS).forEach(([id, path]) => {
  if (path) _assetQueue.push([id, path]);
});
if (typeof BIOME_SKINS === 'object' && BIOME_SKINS) {
  Object.entries(BIOME_SKINS).forEach(([biomeId, set]) => {
    Object.entries(set).forEach(([key, path]) => {
      if (path) _assetQueue.push([biomeId + '_' + key, path]);
    });
  });
}

// Loading screen controller.
const _lsEl   = document.getElementById('loadingScreen');
const _lsBar  = document.getElementById('lsBar');
const _lsText = document.getElementById('lsText');
const _lsTotal = _assetQueue.length;
let   _lsDone  = 0;
const _lsStart = performance.now();
const _LS_MIN_MS = 500; // Keeps the loading screen visible long enough to avoid a flash.

function _lsUpdate(key, ok) {
  _lsDone++;
  if (_lsBar && _lsTotal > 0) {
    const pct = Math.min(100, Math.round((_lsDone / _lsTotal) * 100));
    _lsBar.style.width = pct + '%';
    const outer = _lsBar.parentElement;
    if (outer) outer.setAttribute('aria-valuenow', String(pct));
    if (_lsText) _lsText.textContent = `Loading assets… ${_lsDone}/${_lsTotal}`;
  }
}

function _lsHide() {
  if (!_lsEl) return;
  const elapsed = performance.now() - _lsStart;
  const wait    = Math.max(0, _LS_MIN_MS - elapsed);
  setTimeout(() => {
    if (_lsText) _lsText.textContent = 'Ready!';
    if (_lsBar)  _lsBar.style.width  = '100%';
    _lsEl.classList.add('done');
    setTimeout(() => { _lsEl.setAttribute('hidden', ''); }, 500);
  }, wait);
}

Assets._onProgress = _lsUpdate;

const _assetLoads  = _assetQueue.map(([key, path]) => Assets.load(key, path));
// Waves use a separate loader; gate on both.
const _waveReady   = Assets.generateWaves(_canvasCSSWidth || 450);
const _assetsReady = Promise.all([Promise.all(_assetLoads), _waveReady])
  .then(() => {
    if (_lsText) _lsText.textContent = 'Warming up textures…';
    // Let the browser paint the 100% bar before warmup.
    return new Promise(r => requestAnimationFrame(() => r()));
  })
  .then(() => _warmupAllAssets())
  .then(() => _lsHide());

// Edge case: no assets → progress callback never fires, still hide.
if (_lsTotal === 0) _waveReady.then(() => _warmupAllAssets()).then(() => _lsHide());

// Pre-warm every biome's caches and every asset so first frame has no spike.
function _warmupAllAssets() {
  return new Promise(resolve => {
    const ctx = _stateCtx;
    const cH  = _canvasCSSHeight || 800;
    const cW  = _canvasCSSWidth  || 450;

    ctx.save();
    ctx.globalAlpha = 0;

    // Draw every stored image once (natural + scaled) to trigger GPU upload.
    // Skip natural-size draw for huge assets to avoid VRAM spikes.
    const NATURAL_MAX_EDGE = 2048;
    const allKeys = Object.keys(Assets._store || {});
    allKeys.forEach(k => {
      const img = Assets.get(k);
      if (!img) return;
      try {
        const w = img.width  || img.naturalWidth  || 0;
        const h = img.height || img.naturalHeight || 0;
        if (w > 0 && w <= NATURAL_MAX_EDGE && h <= NATURAL_MAX_EDGE) {
          ctx.drawImage(img, 0, 0);
        }
        ctx.drawImage(img, 0, 0, 64, 64);
        ctx.drawImage(img, 0, 0, 256, 256);
      } catch (e) { /* skip invalid images */ }
    });

    // Build gradient + seabed deco caches for every biome.
    if (typeof BIOMES === 'object' && BIOMES) {
      Object.values(BIOMES).forEach(biome => {
        try {
          if (typeof _getBgGradient       === 'function') _getBgGradient(cH, biome, 0);
          if (typeof _getBgGradient       === 'function') _getBgGradient(cH, biome, 0.5);
          if (typeof _getBgGradient       === 'function') _getBgGradient(cH, biome, 1);
          if (typeof _getSandGradient     === 'function') _getSandGradient(0, 80, biome);
          if (typeof _getSeabedDecoSprite === 'function') _getSeabedDecoSprite(cW, biome);
        } catch (e) { console.warn('[Warmup] biome cache:', biome.id, e); }
      });
    }

    // Biome-independent gradients.
    try {
      if (typeof _getShimmerGradient  === 'function') _getShimmerGradient(cH, 0);
      if (typeof _getShimmerGradient  === 'function') _getShimmerGradient(cH, 1);
      if (typeof _getDepthBarGradient === 'function') _getDepthBarGradient(70, cH * 0.45);
    } catch (e) { console.warn('[Warmup] generic cache:', e); }

    // Emoji rasterization: warm every (emoji × font-spec) pair used at render time.
    const EMOJIS_TO_WARM = [
      '\u{1F5D1}\uFE0F', '\u{1F9F4}', '\u{1F964}', '\u{1FAA3}', '\u{1F96B}',
      '\u{1F33F}', '\u{1FAB8}', '\u2B50',  '\u{1F41A}',
      '\u{1FAB5}', '\u{1F344}', '\u{1FAB1}',
      '\u2744\uFE0F','\u{1F9CA}', '\u{1F41F}',
      '\u{1FA9D}', '\u{1FA9D}\u{1F494}',
      '\u{1F41F}', '\u{1F6E1}\uFE0F', '\u{1F494}', '\u{1FA99}',
      '\u{1F9F2}', '\u{1F512}', '\u{1F30A}',
      '\u{1F507}', '\u{1F50A}',
      '\u{1FA9D}', '\u2693', '\u{1F41F}', '\u{1F3AF}',
      '\u{1F3A3}',
    ];
    // Font cache is keyed by font string — warm each stack used in draw.js.
    const WARM_FONT_SPECS = [
      '14px serif', '18px serif', '20px serif', '24px serif', '28px serif', '34px serif', '40px serif',
      '700 16px "Pixelify Sans", system-ui, sans-serif',
      '11px "Press Start 2P", system-ui, monospace',
      '32px "Press Start 2P", system-ui, monospace',
      '11px "Pixelify Sans", system-ui, sans-serif',
      '20px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif',
      '28px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif',
    ];
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    WARM_FONT_SPECS.forEach(fontSpec => {
      ctx.font = fontSpec;
      EMOJIS_TO_WARM.forEach(em => {
        try { ctx.fillText(em, -100, -100); } catch (e) { /* ignore */ }
      });
      try {
        ctx.fillText('0123456789', -200, -200);
        ctx.fillText('PAUSED Press ESC m', -200, -200);
      } catch (e) { /* ignore */ }
    });

    ctx.restore();
    ctx.clearRect(0, 0, cW, cH);

    // Pre-allocate the float text DOM pool to avoid first-catch stutter.
    try {
      const layer = document.getElementById('floatLayer');
      const MAX   = (typeof DRAW === 'object' && DRAW.FLOAT_POOL_MAX) || 12;
      if (layer && typeof _floatPool !== 'undefined' && _floatPool.length === 0) {
        for (let i = 0; i < MAX; i++) {
          const el = document.createElement('div');
          el.className = 'flt';
          el.style.animation = 'none';
          el.style.left = '-9999px';
          el.style.top  = '-9999px';
          el.textContent = '\u200B'; // zero-width space, warms the render pipeline
          layer.appendChild(el);
          _floatPool.push(el);
        }
      }
    } catch (e) { console.warn('[Warmup] float pool:', e); }

    // WAAPI warmup: first animate() call wakes the runtime.
    try {
      const dummy = document.createElement('div');
      dummy.style.position = 'absolute';
      dummy.style.left = '-9999px';
      document.body.appendChild(dummy);
      const a = dummy.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 1, fill: 'forwards' }
      );
      a.onfinish = () => { dummy.remove(); };
    } catch (e) { console.warn('[Warmup] WAAPI:', e); }

    // Audio warmup: silent oscillator primes the scheduler graph.
    try {
      if (typeof ac === 'function') {
        const a = ac();
        if (a && a.state !== 'closed') {
          const o = a.createOscillator();
          const g = a.createGain();
          g.gain.value = 0;
          o.connect(g); g.connect(a.destination);
          o.start();
          o.stop(a.currentTime + 0.02);
        }
      }
    } catch (e) { console.warn('[Warmup] audio:', e); }

    // Yield two rAFs so the GPU can flush uploads before play starts.
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

Input.init(_stateCanvas);

function startLevel(idx) {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  _dom.resultOverlay.classList.add('hidden');
  _dom.resultOverlay.classList.remove('show');
  stopVictory();

  const cW  = _canvasCSSWidth;
  const cH  = _canvasCSSHeight;
  const cfg = LEVELS[idx];

  const extraHP    = Save.upgradeEffect('extraHP');
  const slowBonus  = Save.upgradeEffect('slowRise');

  const shield = Save.usePowerup('shield');
  const worm   = Save.usePowerup('worm');
  if (shield || worm) Save.flush();

  const riseSpeed = Math.max(0.15, cfg.riseSpeed - slowBonus);

  G = _buildGameState(cW, cH, cfg, idx, {
    HOOK_W: 78,
    HOOK_H: 60,
    WORLD_H: cfg.worldScale * cH,
    hookHP: cfg.hookHP + extraHP,
    riseSpeed,
    spawnEvery: cfg.spawnEvery,
    shieldActive: shield,
    wormActive: worm,
  });

  updateHUD();
  _dom.phaseDisp.textContent = 'Casting hook\u2026';
  _dom.gameScreen.classList.remove('hidden');
  _dom.menuScreen.classList.add('hidden');
  _dom.shopScreen.classList.add('hidden');

  _warmupLevelAssets(G);
  playLevelMusic(idx);

  const hint = document.getElementById('controlsHint');
  if (hint) {
    hint.classList.add('show');
    clearTimeout(hint._hideTimer);
    hint._hideTimer = setTimeout(() => hint.classList.remove('show'), 3200);
  }

  _lastTime    = performance.now();
  _accumulator = 0;
  animId = requestAnimationFrame(gameLoop);
}

function _buildGameState(cW, cH, cfg, idx, overrides) {
  const HOOK_Y = Math.round(cH * 0.8);
  return {
    cW, cH, cfg, idx,
    phase:   PH.INTRO,
    frame:   0,
    caught:  0,
    gold:    0,
    hookHP:     overrides.hookHP,
    maxHookHP:  overrides.hookHP,

    HOOK_W: overrides.HOOK_W,
    HOOK_H: overrides.HOOK_H,
    HOOK_Y,
    WORLD_H:    overrides.WORLD_H,
    riseSpeed:  overrides.riseSpeed,
    spawnEvery: overrides.spawnEvery,

    worldOffset:     overrides.WORLD_H,
    boatTargetY:     Math.round(cH * 0.35),
    surfaceBoatY:    Math.round(cH * 0.15),
    boatScreenY:     Math.round(cH * 0.35),
    hookIntroY: Math.round(cH * 0.35) + 20,
    introPhase: 'WAIT',
    introWait:  0,

    surfaceTimer: 0,
    hookSurfaceY:  0,
    hookX:         Math.round(cW / 2),

    objects:  [],
    isPaused: false,

    spawnLaneOrder: _newLaneOrder(),
    spawnLaneIdx:   0,
    shieldActive: overrides.shieldActive,
    wormActive:   overrides.wormActive,
    hookPunch: 0,
  };
}

// Spawn lane helpers.
function _newLaneOrder() {
  const arr = SPAWN_LANES.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function nextSpawnX(g) {
  if (g.spawnLaneIdx >= g.spawnLaneOrder.length) {
    g.spawnLaneOrder = _newLaneOrder();
    g.spawnLaneIdx   = 0;
  }
  return Math.round(g.spawnLaneOrder[g.spawnLaneIdx++] * g.cW);
}

// Per-level warmup: draw every sprite + build every cache before the first frame.
function _warmupLevelAssets(g) {
  const ctx = _stateCtx;
  const cH  = g.cH, cW = g.cW;
  const biome = BIOMES[g.cfg.biome] || BIOMES.ocean;

  ctx.save();
  ctx.globalAlpha = 0;

  const keys = [
    'boat', 'hook', 'oceanBg', 'oceanSky', 'resultBg',
    'menuBtn', 'upgradesBtn', 'tryAgainBtn',
    'iconCoin', 'iconHook', 'iconHeart', 'iconShield',
    biome.id + '_wave_far', biome.id + '_wave_back', biome.id + '_wave_mid', biome.id + '_wave_front',
  ];
  if (typeof resolveSkin === 'function') {
    keys.push(resolveSkin(biome.id, 'bg'));
    keys.push(resolveSkin(biome.id, 'sky'));
    const fishKeys = biome.fishKeys || ['fish1', 'fish2', 'fish3'];
    fishKeys.forEach(fk => keys.push(resolveSkin(biome.id, fk)));
  }
  keys.forEach(k => {
    const img = Assets.get(k);
    if (img) ctx.drawImage(img, 0, 0, 1, 1);
  });

  // Prime gradient caches.
  if (typeof _getBgGradient       === 'function') _getBgGradient(cH, biome, 0);
  if (typeof _getShimmerGradient  === 'function') _getShimmerGradient(cH, 0);
  if (typeof _getSandGradient     === 'function') _getSandGradient(0, 80, biome);
  if (typeof _getDepthBarGradient === 'function') _getDepthBarGradient(70, cH * 0.45);
  // Prime offscreen seabed canvas.
  if (typeof _getSeabedDecoSprite === 'function') _getSeabedDecoSprite(cW, biome);

  ctx.restore();
  ctx.clearRect(0, 0, cW, cH);
}

// Skip intro on tap.
function skipIntro() {
  if (!G || G.phase !== PH.INTRO) return;
  G.boatScreenY     = -150;
  G.hookIntroY = G.HOOK_Y;
  G.worldOffset     = 0;
  G.phase = PH.FISHING;
  _dom.phaseDisp.textContent = 'Hauling up\u2026';
  sfxSplash();
}
_stateCanvas.addEventListener('pointerdown', skipIntro);

// Error boundary: stop the loop after too many consecutive frame errors.
let _loopErrorCount     = 0;
const LOOP_ERROR_LIMIT  = 30;

function gameLoop(now) {
  if (!G) return;

  // Hidden tab: skip update/draw but keep the rAF chain alive.
  if (document.hidden) {
    _lastTime = now;
    _accumulator = 0;
    animId = requestAnimationFrame(gameLoop);
    return;
  }

  const frameDt = Math.min(now - _lastTime, MAX_FRAME_MS);
  _lastTime = now;

  try {
    if (!G.isPaused) {
      _accumulator += frameDt;
      let steps = 0;
      while (_accumulator >= FIXED_DT_MS && steps < MAX_STEPS) {
        update();
        _accumulator -= FIXED_DT_MS;
        steps++;
      }
      // Drop surplus accumulated time to prevent a cascading catch-up.
      if (_accumulator >= FIXED_DT_MS) _accumulator = 0;
    }

    draw();
    _loopErrorCount = 0;
  } catch (err) {
    _loopErrorCount++;
    console.error('[GameLoop] frame error:', err);
    if (_loopErrorCount >= LOOP_ERROR_LIMIT) {
      console.error('[GameLoop] too many errors — stopping loop.');
      return;
    }
  }

  if (G.phase !== PH.RESULT) animId = requestAnimationFrame(gameLoop);
}

// Reset lastTime on tab focus so we don't burst-tick a huge accumulated delta.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    _lastTime = performance.now();
    _accumulator = 0;
  }
});

function update() {
  const g = G;

  g.frame++;
  if (g.hookPunch > 0) g.hookPunch--;

  if (Input._tickKeyboard) Input._tickKeyboard();

  if      (g.phase === PH.INTRO)   updateIntro();
  else if (g.phase === PH.FISHING) updateFishing();
  else if (g.phase === PH.SURFACE) updateSurface();
}

function updateIntro() {
  const g = G;

  switch (g.introPhase) {
    case 'WAIT':
      g.introWait++;
      if (g.introWait >= DRAW.INTRO_WAIT) g.introPhase = 'DROP_NET';
      break;

    case 'DROP_NET':
      if (g.hookIntroY < g.HOOK_Y) g.hookIntroY += DRAW.INTRO_HOOK_SPEED;
      else { g.hookIntroY = g.HOOK_Y; g.introPhase = 'SAIL_OUT'; }
      break;

    case 'SAIL_OUT':
      if (g.boatScreenY > -120) g.boatScreenY -= DRAW.INTRO_SAIL_SPEED;
      g.worldOffset = Math.max(0, g.worldOffset - DRAW.INTRO_WORLD_SPEED);
      if (g.boatScreenY <= -120 && g.worldOffset <= 0) {
        g.boatScreenY     = -150;
        g.hookIntroY = g.HOOK_Y;
        g.worldOffset     = 0;
        g.phase = PH.FISHING;
        _dom.phaseDisp.textContent = 'Hauling up\u2026';
        sfxSplash();
      }
      break;
  }
}

function updateFishing() {
  const g   = G;
  const cfg = g.cfg;
  const cH  = g.cH;

  g.worldOffset -= g.riseSpeed;
  _spawnAndUpdateObjects(g, cfg, cH);
  checkCollisions();

  if (g.worldOffset <= -g.WORLD_H) {
    g.worldOffset  = -g.WORLD_H;
    g.objects      = [];
    g.phase        = PH.SURFACE;
    g.surfaceTimer = 0;
    g.boatScreenY  = -80;
    g.hookSurfaceY  = g.HOOK_Y;
    g.hookX         = Math.round(g.cW / 2);
    _dom.phaseDisp.textContent = 'Surfacing!';
  }
}

function _spawnAndUpdateObjects(g, cfg, cH) {
  // Objects drop straight down; no horizontal drift.
  if (g.frame % g.spawnEvery === 0) spawnObject();

  const objs        = g.objects;
  const riseSpeed   = g.riseSpeed;
  const cW          = g.cW;
  const cullMax     = cH + DRAW.COLLISION_CULL;
  const wormOn    = !!g.wormActive;
  const wormRange = cW * 0.45;
  const hookX     = g.hookX;

  let write = 0;
  for (let read = 0; read < objs.length; read++) {
    const o = objs[read];
    if (o.caught) {
      o.alpha -= 0.07;
    } else {
      o.y += o.vy + riseSpeed;
      // Worm bait gently pulls fish only.
      if (wormOn && !o.bad) {
        const dx  = hookX - o.x;
        const adx = dx < 0 ? -dx : dx;
        if (adx < wormRange) {
          const strength = 0.015 * (1 - adx / wormRange);
          o.x += dx * strength;
        }
      }
    }

    if (o.y < cullMax && o.alpha > 0) {
      objs[write++] = o;
    }
  }
  objs.length = write;
}

function updateSurface() {
  const g = G;
  g.surfaceTimer++;
  if (g.boatScreenY < g.surfaceBoatY) g.boatScreenY += DRAW.SURFACE_SPEED;
  const boatBottom = g.boatScreenY + boatHullOffset();
  if (g.hookSurfaceY > boatBottom) g.hookSurfaceY -= DRAW.SURFACE_SPEED;
  if (g.surfaceTimer > 100 && g.hookSurfaceY <= boatBottom + 4) {
    g.phase = PH.RESULT;
    showResult();
  }
}
