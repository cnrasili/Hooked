// Config: constants, levels, biomes, shop, entities.
'use strict';

// Biomes: Ocean (easy), Swamp (medium), Polar (hard).
const BIOMES = {
  ocean: {
    id: 'ocean', label: 'Ocean', difficulty: 'easy', chapter: 1,
    shallowTop: [0x1a, 0xb4, 0xd8], shallowBot: [0x0d, 0x8c, 0xb5],
    deepTop:    [0x06, 0x20, 0x40], deepBot:    [0x02, 0x10, 0x1e],
    sandRGB: '210,180,120',
    seabedDeco: ['\u{1F33F}','\u{1FAB8}','\u2B50','\u{1F41A}'],
    skinKey: 'ocean',
    fishKeys: ['fish1', 'fish2', 'fish3', 'fish4'],
  },
  swamp: {
    id: 'swamp', label: 'Swamp', difficulty: 'medium', chapter: 2,
    shallowTop: [0x6e, 0x8b, 0x3d], shallowBot: [0x3f, 0x5a, 0x26],
    deepTop:    [0x1f, 0x2a, 0x18], deepBot:    [0x0e, 0x14, 0x0a],
    sandRGB: '110,90,50',
    seabedDeco: ['\u{1F33F}','\u{1FAB5}','\u{1F344}','\u{1FAB1}'],
    skinKey: 'swamp',
    fishKeys: ['fish1', 'fish2', 'fish3'],
  },
  polar: {
    id: 'polar', label: 'Polar', difficulty: 'hard', chapter: 3,
    shallowTop: [0xc6, 0xe4, 0xf2], shallowBot: [0x7e, 0xb5, 0xd2],
    deepTop:    [0x1e, 0x3a, 0x5e], deepBot:    [0x08, 0x14, 0x28],
    sandRGB: '200,220,235',
    seabedDeco: ['\u2744\uFE0F','\u{1F9CA}','\u2B50','\u{1F41F}'],
    skinKey: 'polar',
    fishKeys: ['fish1', 'fish2', 'fish3'],
  },
};

const LEVELS = [
  {
    n: 1, label: 'Open Ocean',      biome: 'ocean',
    target: 10, riseSpeed: .85, spawnEvery: 40, badRatio: .45,
    hookHP: 3, depthM: 80,  worldScale: 1.8,
  },
  {
    n: 2, label: 'Murky Swamp',     biome: 'swamp',
    target: 15, riseSpeed: 1.25, spawnEvery: 30, badRatio: .55,
    hookHP: 3, depthM: 180, worldScale: 2.6,
  },
  {
    n: 3, label: 'Frozen Depths',   biome: 'polar',
    target: 20, riseSpeed: 1.75, spawnEvery: 20, badRatio: .65,
    hookHP: 2, depthM: 360, worldScale: 3.4,
  },
];

const PH = { INTRO: 'intro', FISHING: 'fishing', SURFACE: 'surface', RESULT: 'result' };

// Boat drawing constants.
const BOAT_DRAW_W    = 200;
const WATER_Y_OFFSET = 10;
// Shifts boat sprite upward so hull sits at waterline.
const BOAT_DRAW_Y_OFFSET = 55;

// Per-biome sprite scale tweaks.
const SPRITE_SCALE = {
  ocean_fish1: 1, ocean_fish2: 1, ocean_fish3: 1, ocean_fish4: 1,
  swamp_fish1: 1, swamp_fish2: 1, swamp_fish3: 1,
  polar_fish1: 1, polar_fish2: 1, polar_fish3: 1,
  // Trash sprites have extra canvas padding — scale up to match fish size.
  trash1: 2.0, trash2: 2.0, trash3: 1.6,
  trash4: 2.0, trash5: 2.0, trash6: 2.0,
};

const GOLD_PER_FISH = 2;

// Fixed spawn lanes (Fisher-Yates shuffled) for even horizontal distribution.
const SPAWN_LANES = [0.15, 0.325, 0.5, 0.675, 0.85];

const DRAW = {
  HOOK_TOP_OFFSET:   15,
  HOOK_BOT_OFFSET:   10,
  COLLISION_CULL:   80,
  OBJECT_MAX:       60,
  FLOAT_POOL_MAX:   12,
  INTRO_WAIT:       60,
  INTRO_HOOK_SPEED:  1.8,
  INTRO_SAIL_SPEED: 1.6,
  INTRO_WORLD_SPEED: 8,
  SURFACE_SPEED:    2.5,
};

const UPGRADES = [
  {
    id: 'extraHP', icon: '\u{1F6E1}\uFE0F', spriteKey: 'iconHook', name: 'Reinforced Hook',
    desc: 'Adds +1 max HP to the hook per level',
    costs: [20, 45, 90], max: 3,
    effect: (lvl) => lvl,
    preview: (lvl) => `+${lvl} HP`,
  },
  {
    id: 'slowRise', icon: '\u231B', name: 'Slow Winch',
    desc: 'Reduces rise speed (more time to catch)',
    costs: [25, 55, 100], max: 3,
    effect: (lvl) => lvl * 0.08,
    preview: (lvl) => `-${(lvl * 0.08).toFixed(2)} spd`,
  },
];

const POWERUPS = [
  { id: 'shield', icon: '🛡️', spriteKey: 'iconShield', name: 'Shield', desc: 'Blocks first trash hit', cost: 8  , max: 3 },
  { id: 'worm',   icon: '🪱',         spriteKey: 'iconWorm', name: 'Worm',   desc: 'Fish drift toward hook', cost: 12 , max: 3 },
];
