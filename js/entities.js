// Spawning, collision detection, and floating score text.
'use strict';

// ─── 1. OBJECT POOL ───────────────────────────────────────────────────────────
// Pre-allocated structs are reused instead of creating a new {} each spawn.
// When an object exits the screen (or fades out after being caught),
// releaseObject() resets it and returns it to _pool. The next spawnObject()
// call pulls from _pool via _acquireObject() — zero new allocations mid-game.
//
// initObjectPool() is called once per level (in startLevel, game.js) so the
// pool size always matches the level's OBJECT_MAX cap.

const _pool = [];

function initObjectPool(size) {
  _pool.length = 0;
  for (let i = 0; i < size; i++) {
    _pool.push(_makeBlankObject());
  }
}

function _makeBlankObject() {
  return { x: 0, y: 0, vy: 0, vx: 0, sz: 60,
           bad: false, sprite: null, em: null,
           wb: 0, alpha: 1, caught: false };
}

// Returns a pooled object (or a fresh one if the pool is empty).
function _acquireObject() {
  return _pool.length > 0 ? _pool.pop() : _makeBlankObject();
}

// Resets an object and returns it to the pool for future reuse.
function releaseObject(o) {
  o.caught = false;
  o.alpha  = 1;
  o.sprite = null;
  o.em     = null;
  _pool.push(o);
}

// ─── 2. SPAWN ─────────────────────────────────────────────────────────────────
// Objects (fish / trash) are configured and pushed into g.objects.
// Biome fish pools and the bad-object ratio are defined in config.js.

function _resolveSprite(biomeId, baseKey) {
  if (!baseKey) return null;
  if (typeof resolveSkin === 'function') {
    const rk = resolveSkin(biomeId, baseKey);
    if (Assets.get(rk)) return rk;
  }
  return Assets.get(baseKey) ? baseKey : null;
}

// Entry point called by _spawnAndUpdateObjects in game.js.
function spawnObject() {
  const g   = G;
  if (g.objects.length >= DRAW.OBJECT_MAX) return;
  const cfg = g.cfg;
  const x = nextSpawnX(g);
  if (Math.random() < cfg.badRatio) _spawnTrash(g, cfg, x);
  else                               _spawnFish(g, cfg, x);
}

const _TRASH_KEYS = ['trash1', 'trash2', 'trash3', 'trash4', 'trash5', 'trash6'];

function _spawnTrash(g, cfg, x) {
  const vy     = 0.9 + Math.random() * 1.0 + (cfg.n - 1) * 0.2;
  const key    = _TRASH_KEYS[Math.floor(Math.random() * _TRASH_KEYS.length)];
  const sprite = Assets.get(key) ? key : null;
  _pushObject(g, {
    sz: 52, x, vy, vx: 0, bad: true,
    sprite,
    em: sprite ? null : '\u{1F5D1}️',
  });
}

function _spawnFish(g, cfg, x) {
  const keys    = (BIOMES[cfg.biome] && BIOMES[cfg.biome].fishKeys) || ['fish1', 'fish2', 'fish3'];
  const baseKey = keys[Math.floor(Math.random() * keys.length)];
  const sprite  = _resolveSprite(cfg.biome, baseKey);
  const vy = 0.9 + Math.random() * 1.0 + (cfg.n - 1) * 0.2;
  _pushObject(g, { sz: 60, x, vy, vx: 0, bad: false, sprite });
}

function _pushObject(g, props) {
  const sz   = props.sz || 60;
  const half = sz / 2;
  const rawX = props.x != null ? props.x : sz / 2 + Math.random() * (g.cW - sz);
  const x    = Math.max(half, Math.min(g.cW - half, rawX));

  // Acquire a reusable struct from the pool instead of allocating a new {}.
  const o = _acquireObject();
  o.y      = -sz;
  o.x      = x;
  o.sz     = sz;
  o.vy     = props.vy  !== undefined ? props.vy  : 1;
  o.vx     = props.vx  !== undefined ? props.vx  : 0;
  o.bad    = props.bad !== undefined ? props.bad : false;
  o.sprite = props.sprite || null;
  o.em     = props.em    || null;
  o.wb     = Math.random() * Math.PI * 2;
  o.alpha  = 1;
  o.caught = false;
  g.objects.push(o);
}

// ─── 3. COLLISION ─────────────────────────────────────────────────────────────
// AABB test between hook rectangle and each object's bounding box.
// Fish increment the catch counter; trash reduces Hook HP (unless shielded).

function checkCollisions() {
  const g        = G;
  const hookCx    = g.hookX;
  const hookLeft  = hookCx - g.HOOK_W / 2;
  const hookRight = hookCx + g.HOOK_W / 2;
  const hookTop   = g.HOOK_Y - DRAW.HOOK_TOP_OFFSET;
  const hookBot   = g.HOOK_Y + g.HOOK_H + DRAW.HOOK_BOT_OFFSET;

  g.objects.forEach(o => {
    if (o.caught) return;
    const inX = o.x > hookLeft && o.x < hookRight;
    const inY = o.y > hookTop  && o.y < hookBot;
    if (!inX || !inY) return;

    o.caught = true;
    if (o.bad) _onTrashCaught(g, o);
    else       _onFishCaught(g, o);
  });
}

function _onTrashCaught(g, o) {
  if (g.shieldActive) {
    g.shieldActive = false;
    floatText(o.x, o.y, '<span class="ic ic-shield"></span> Blocked!', '#5bc8ef');
    sfxCatch();
    updateHUD();
    return;
  }

  g.hookHP = Math.max(0, g.hookHP - 1);
  sfxHit();

  floatText(o.x, o.y, '-1 <span class="ic ic-heart"></span>', '#ff4d6d');
  updateHUD();
  if (g.hookHP <= 0) { g.objects = []; g.phase = PH.RESULT; showResult(); }
}

function _onFishCaught(g, o) {
  g.hookPunch = 8;

  g.caught += 1;
  g.gold   += GOLD_PER_FISH;
  sfxCatch();
  sfxCoin();

  floatText(o.x, o.y, `+1 FISH  +${GOLD_PER_FISH} <span class="ic ic-coin"></span>`, '#00ffe7');
  updateHUD();
}

// ─── 4. FLOAT TEXT ────────────────────────────────────────────────────────────
// DOM element pool reused across spawns to avoid GC pressure.
// Animation is driven by the Web Animations API (animate()) with a WeakMap
// storing active Animation handles so stacked texts can be cancelled cleanly.

const _floatPool = [];
const _floatAnimations = new WeakMap();
let _floatLayer = null;

function _getFloatLayer() {
  if (!_floatLayer) _floatLayer = document.getElementById('floatLayer');
  return _floatLayer;
}

const _FLOAT_ANIM_KEYFRAMES = [
  { opacity: 1, transform: 'translateY(0) scale(1)' },
  { opacity: 0, transform: 'translateY(-55px) scale(1.2)' },
];
const _FLOAT_ANIM_OPTIONS = { duration: 900, easing: 'ease-out', fill: 'forwards' };

function floatText(x, y, text, color) {
  const layer = _getFloatLayer();
  if (!layer) return;

  let el;
  if (_floatPool.length < DRAW.FLOAT_POOL_MAX) {
    el = document.createElement('div');
    el.className = 'flt';
    el.style.animation = 'none';
    layer.appendChild(el);
    _floatPool.push(el);
  } else {
    el = _floatPool.shift();
    _floatPool.push(el);
  }
  el.innerHTML = text;
  el.style.color = color;
  el.style.left = (x - 20) + 'px';
  el.style.top  = (y - 28) + 'px';

  const prev = _floatAnimations.get(el);
  if (prev) prev.cancel();
  const anim = el.animate(_FLOAT_ANIM_KEYFRAMES, _FLOAT_ANIM_OPTIONS);
  _floatAnimations.set(el, anim);
}
