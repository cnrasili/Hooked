// Persistent player data via localStorage.
'use strict';

// ─── Save Object ──────────────────────────────────────────────────────────────
// Single namespace for all persistence. init() is called at file load;
// all writes go through flush() (debounced) or flushNow() (immediate).

const Save = {
  _key: 'cf_save_v1',
  data: { gold: 0, bestScore: 0, lastLevel: 0, highestUnlocked: 0, upgrades: {}, powerups: {} },

  // ── Init ───────────────────────────────────────────────────────────────────
  // Load from localStorage, fill missing keys with defaults, clamp indices
  // to current LEVELS length in case the level list changed since last save.

  init() {
    try {
      const raw = JSON.parse(localStorage.getItem(this._key));
      if (raw) this.data = raw;
    } catch { /* corrupt data — fall through to defaults */ }

    if (this.data.gold            === undefined) this.data.gold            = 0;
    if (this.data.bestScore       === undefined) this.data.bestScore       = 0;
    if (this.data.lastLevel       === undefined) this.data.lastLevel       = 0;
    if (this.data.highestUnlocked === undefined) this.data.highestUnlocked = 0;
    if (this.data.upgrades        === undefined) this.data.upgrades        = {};
    if (this.data.powerups        === undefined) this.data.powerups        = {};

    UPGRADES.forEach(u => {
      if (this.data.upgrades[u.id] === undefined) this.data.upgrades[u.id] = 0;
    });
    POWERUPS.forEach(p => {
      if (this.data.powerups[p.id] === undefined) this.data.powerups[p.id] = 0;
    });

    // Clamp legacy indices into the current LEVELS range.
    if (typeof this.data.lastLevel !== 'number' ||
        this.data.lastLevel < 0 ||
        this.data.lastLevel >= LEVELS.length) {
      this.data.lastLevel = 0;
    }
    if (typeof this.data.highestUnlocked !== 'number' ||
        this.data.highestUnlocked < 0) {
      this.data.highestUnlocked = 0;
    }
    if (this.data.highestUnlocked > LEVELS.length - 1) {
      this.data.highestUnlocked = LEVELS.length - 1;
    }

    this.flushNow();
  },

  // ── Level unlock ───────────────────────────────────────────────────────────

  markLevelPassed(idx) {
    const unlocked = Math.min(idx + 1, LEVELS.length - 1);
    if (unlocked > this.data.highestUnlocked) {
      this.data.highestUnlocked = unlocked;
      this.flush();
    }
  },
  isUnlocked(idx) { return idx <= this.data.highestUnlocked; },

  // ── Write ──────────────────────────────────────────────────────────────────
  // flush() debounces writes to avoid hammering localStorage on rapid changes.
  // flushNow() writes immediately (e.g. on page unload or after a purchase).

  _flushTimer: null,
  flush() {
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this.flushNow();
    }, 500);
  },
  flushNow() {
    if (this._flushTimer) { clearTimeout(this._flushTimer); this._flushTimer = null; }
    try {
      localStorage.setItem(this._key, JSON.stringify(this.data));
    } catch (err) {
      console.warn('[Save] localStorage write failed:', err);
    }
  },

  // ── Accessors ──────────────────────────────────────────────────────────────

  get gold()      { return this.data.gold; },
  set gold(v)     { this.data.gold = Math.max(0, v); },
  get bestScore() { return this.data.bestScore; },
  set bestScore(v){ this.data.bestScore = v; },
  get lastLevel() { return this.data.lastLevel; },
  set lastLevel(v){ this.data.lastLevel = v; },

  getUpgradeLevel(id)    { return this.data.upgrades[id] || 0; },
  setUpgradeLevel(id, v) { this.data.upgrades[id] = v; },

  upgradeEffect(id) {
    const upg = UPGRADES.find(u => u.id === id);
    return upg ? upg.effect(this.getUpgradeLevel(id)) : 0;
  },

  getPowerup(id) { return this.data.powerups[id] || 0; },
  addPowerup(id) { this.data.powerups[id] = (this.data.powerups[id] || 0) + 1; },
  usePowerup(id) {
    if (this.data.powerups[id] > 0) { this.data.powerups[id]--; return true; }
    return false;
  },

  // ── Reset ──────────────────────────────────────────────────────────────────

  resetAll() {
    this.data = { gold: 0, bestScore: 0, lastLevel: 0, highestUnlocked: 0, upgrades: {}, powerups: {} };
    UPGRADES.forEach(u => { this.data.upgrades[u.id] = 0; });
    POWERUPS.forEach(p => { this.data.powerups[p.id] = 0; });
    this.flushNow();
  },
};

Save.init();
