# 🎣 Hooked!

A pixel-art, browser-based **fishing mini-game** built with vanilla HTML5 Canvas 2D and plain JavaScript — no frameworks, no build step.

> **Course:** Computer Graphics — Spring 2026 Final Project

## ▶️ Play

- **Live demo (GitHub Pages):** _TBD — deploy first_
- **Local:** open `index.html` in any modern browser via a local server (e.g. VS Code Live Server). Direct `file://` access may block audio/video autoplay.

## 🎮 Controls

| Action | Input |
|--------|-------|
| Move the hook | **Mouse** / **Touch** drag, or **← →** / **A D** keys |
| Pause / resume | **Esc** |
| Toggle sound | 🔊 button (top-right, available on all screens) |
| Skip intro cast | Tap / click anywhere during the cast animation |

## 🧩 Gameplay Loop

1. **Menu → Choose Biome** — pick an ocean biome. Beat one to unlock the next.
2. **Fishing phase** — catch the target number of fish before the hook rises back up, while avoiding trash. Each trash hit costs 1 Hook HP.
3. **Result screen** — gold earned, new best-score banner, confetti on victory.
4. **Upgrades shop** — spend gold on permanent upgrades (Reinforced Hook, Slow Winch) and consumable powerups (Shield, Worm).

Each biome increases difficulty: faster rise speed, higher trash ratio, deeper world, and new fish models.

## 🌊 Biomes

| Biome | Difficulty | Target | Notes |
|-------|-----------|--------|-------|
| Open Ocean | Easy | 10 fish | Introductory level, 4 fish types |
| Murky Swamp | Medium | 15 fish | Faster rise, more trash |
| Frozen Depths | Hard | 20 fish | Fastest pace, deepest world |

## 🛒 Shop

| Item | Type | Effect |
|------|------|--------|
| Reinforced Hook | Upgrade (max 3) | +1 max HP per level |
| Slow Winch | Upgrade (max 3) | Reduces hook rise speed |
| Shield | Powerup (max 3) | Blocks the next trash hit |
| Worm | Powerup (max 3) | Fish drift toward the hook |

## 🎨 Computer Graphics Concepts Demonstrated

- **Transformations** — boat bobbing, hook punch scaling, object wobble (rotation + translate)
- **Animation** — fixed-timestep accumulator, tween-based float texts (Web Animations API), confetti particle system
- **Interaction** — Pointer Events API (mouse / touch / pen unified), keyboard, pause/mute state machine
- **Rendering techniques** — offscreen canvas caching, gradient cache, parallax wave strips, caustic light shimmer, biome-aware sprite pipeline
- **Effects** — damage flash, screen shake, depth vignette, confetti burst, level-start transition animation

## 🗂️ Project Structure

```
Hooked!/
├── index.html               # Single-page entry point
├── css/style.css            # All styles (screens, HUD, animations)
├── js/
│   ├── config.js            # Levels, biomes, upgrades, powerups constants
│   ├── skins.js             # Sprite key → asset path map (per-biome)
│   ├── assets.js            # Image preloader + procedural wave textures
│   ├── audio.js             # SFX (WebAudio API) + BGM (HTMLAudio) + mute
│   ├── save.js              # localStorage persistence
│   ├── state.js             # Shared mutable game state + global error handler
│   ├── input.js             # Pointer + keyboard bindings
│   ├── entities.js          # Spawn, collisions, float text pool
│   ├── draw.js              # All canvas rendering
│   ├── game.js              # Game loop, loading screen, level lifecycle, transitions
│   └── ui.js                # Menu / shop / result / HUD DOM wiring
├── assets/
│   ├── sprites/             # Fish, hook, boat, trash, UI icons (pixel art)
│   ├── backgrounds/         # Per-biome underwater + sky backgrounds
│   ├── buttons/             # MenuButton, UpgradesButton, TryAgainButton PNGs
│   └── waves/               # Per-biome parallax wave strip sprites
├── sounds/musics/           # Menu, per-level, and victory music tracks
└── videos/                  # Main menu background video
```

## 🧱 Architecture Highlights

- **Fixed-timestep accumulator** (`FIXED_DT_MS = 1000/60`, `MAX_STEPS = 3`) — frame-rate-independent physics on 30 / 60 / 120 Hz displays alike.
- **Float text pool** — DOM elements are reused via an object pool + WeakMap of Web Animations API instances, preventing layout thrash and GC jank.
- **Per-biome asset resolver** — `resolveSkin(biomeId, key)` transparently picks the right texture; adding a new biome requires only a config entry.
- **Gradient & offscreen-canvas cache** — water gradients, wave strips, and caustic shimmer layers are pre-rendered and invalidated only on resize.
- **Volume-based mute** — background music tracks play silently (volume = 0) when muted, so playback position is preserved across mute/unmute cycles.
- **Autoplay-policy workaround** — a "Tap to start" prompt waits for the first user gesture, then unlocks `AudioContext` and starts menu music.
- **Shared background video** — a single `<video>` element sits behind all menu screens so the looping background video never restarts on page transitions.

## 🔧 Deployment (GitHub Pages)

1. Push this repo to GitHub.
2. Repo → **Settings → Pages → Source = `main` / root**.
3. Visit `https://<username>.github.io/<repo-name>/`.

All asset paths are relative — no base-href configuration needed.

## 🙏 Credits

- Fish, boat, hook, trash, UI icons — custom pixel art
- Backgrounds & panels — custom pixel art
- Background music — original compositions _(see report for full attributions)_
- Fonts — Google Fonts: **Press Start 2P**, **Pixelify Sans**

## 📜 License

Course-project scope. Do not redistribute art or music assets without the author's permission.
