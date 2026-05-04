// Asset path registry and per-biome sprite overrides.
'use strict';

// ─── 1. SHARED ASSET PATHS ────────────────────────────────────────────────────
// Keys here are loaded at startup by the asset queue in game.js.
// All biomes share these sprites (boat, hook, UI icons, trash).

const SKINS = {
  boat:       'assets/sprites/BasicBoat.png',
  hook:       'assets/sprites/HookModel.png',

  oceanBg:    'assets/backgrounds/OceanBackground.png',
  // Sky background, drawn above the waterline during INTRO / SURFACE only.
  oceanSky:   'assets/backgrounds/OceanUpperBackground.png',
  resultBg:   'assets/backgrounds/ResultPageBackground.png',

  menuBtn:        'assets/buttons/MenuButton.png',
  upgradesBtn:    'assets/buttons/UpgradesButton.png',
  tryAgainBtn:    'assets/buttons/TryAgainButton.png',

  // Inline UI icons (replace emoji in HUD and shop).
  iconCoin:       'assets/sprites/GoldenToken.png',
  iconHook:       'assets/sprites/GoldenHook.png',
  iconHeart:      'assets/sprites/BrokenHeart.png',
  iconShield:     'assets/sprites/Shield.png',
  iconWorm:       'assets/sprites/Worm.png',

  trash1: 'assets/sprites/TrashModel_1.png',
  trash2: 'assets/sprites/TrashModel_2.png',
  trash3: 'assets/sprites/TrashModel_3.png',
  trash4: 'assets/sprites/TrashModel_4.png',
  trash5: 'assets/sprites/TrashModel_5.png',
  trash6: 'assets/sprites/TrashModel_6.png',
};

// ─── 2. PER-BIOME OVERRIDES ───────────────────────────────────────────────────
// Each biome defines its own background, sky, and fish sprites.
// Loaded on demand in game.js (_warmupLevelAssets) when that biome is played.

const BIOME_SKINS = {
  ocean: {
    bg:          'assets/backgrounds/OceanBackground.png',
    sky:         'assets/backgrounds/OceanUpperBackground.png',
    fish1:       'assets/sprites/OceanFishModel_1.png',
    fish2:       'assets/sprites/OceanFishModel_2.png',
    fish3:       'assets/sprites/OceanFishModel_3.png',
    fish4:       'assets/sprites/OceanFishModel_4.png',
  },
  swamp: {
    bg:    'assets/backgrounds/SwampBackground.png',
    sky:   'assets/backgrounds/SwampUpperBackground.jpg',
    fish1: 'assets/sprites/SwampFishModel_1.png',
    fish2: 'assets/sprites/SwampFishModel_2.png',
    fish3: 'assets/sprites/SwampFishModel_3.png',
  },
  polar: {
    bg:    'assets/backgrounds/PolarBackground.png',
    sky:   'assets/backgrounds/PolarUpperBackground.jpg',
    fish1: 'assets/sprites/PolarFishModel_1.png',
    fish2: 'assets/sprites/PolarFishModel_2.png',
    fish3: 'assets/sprites/PolarFishModel_3.png',
  },
};

// ─── 3. RESOLVER ──────────────────────────────────────────────────────────────
// Returns the namespaced store key for a biome-specific asset, or the base key
// if no biome override exists. draw.js and entities.js use this to look up
// the correct sprite from the Assets store at render time.

function resolveSkin(biomeId, key) {
  const set = BIOME_SKINS[biomeId];
  if (set && set[key]) return biomeId + '_' + key;
  return key;
}
