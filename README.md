# 🎣 Hooked!

A pixel-art, browser-based **fishing mini-game** built with vanilla HTML5 Canvas 2D and plain JavaScript — no frameworks, no build step.

> **Course:** Computer Graphics — Spring 2026 Final Project

## ▶️ Play

- **Live demo (GitHub Pages):** _TBD — deploy first_
- **Local:** just open `index.html` in any modern browser (Chrome / Firefox / Safari / Edge). No server required.

## 🎮 Controls

| Action | Input |
|--------|-------|
| Move the net | **Mouse** / **Touch** drag, or **← →** / **A D** keys |
| Pause / resume | **Esc** |
| Toggle sound | 🔊 button (main menu or pause screen) |
| Skip intro cast | Tap / click anywhere during the cast animation |

## 🧩 Gameplay Loop

1. **Menu → Biome Select** — pick an ocean biome. Beat one to unlock the next.
2. **Fishing phase** — catch the target number of fish while avoiding trash. Trash costs Net HP.
3. **Result screen** — gold earned, new best-score banner, confetti on win.
4. **Shop** — spend gold on permanent upgrades (wider net, extra HP, slower rise) and one-shot powerups (shield, magnet, timewarp).

Each biome increases difficulty (faster rise, more trash ratio, new fish models).

## 🎨 Computer Graphics Concepts Demonstrated

See `docs/GRAPHICS_CONCEPTS.md` for the detailed map. Brief overview:

- **Transformations** — boat bobbing, hook punch scaling, net sway (rotation + translate)
- **Animation** — fixed-timestep accumulator, particle systems, tween-based float texts (Web Animations API)
- **Interaction** — Pointer Events API (mouse/touch/pen unified), keyboard, pause/mute state machine
- **Rendering techniques** — offscreen canvas caching, gradient cache, parallax wave strips, caustics light shader, biome-aware sprite pipeline
- **Effects** — damage flash, screen shake, depth vignette, burst particles, confetti

## 🗂️ Project Structure

```
Hooked!/
├── index.html               # Single-page entry
├── css/style.css            # All styles (screens, HUD, animations)
├── js/
│   ├── config.js            # Levels, biomes, upgrades, powerups constants
│   ├── skins.js             # Sprite key → asset path map (per-biome)
│   ├── assets.js            # Image preloader + procedural wave textures
│   ├── audio.js             # SFX (WebAudio) + BGM (HTMLAudio) + mute
│   ├── save.js              # localStorage persistence
│   ├── state.js             # Shared mutable game state + global error handler
│   ├── input.js             # Pointer + keyboard bindings
│   ├── entities.js          # Spawn, collisions, particles, float text pool
│   ├── draw.js              # All canvas rendering
│   ├── game.js              # Loop, loading screen controller, level lifecycle
│   └── ui.js                # Menu / shop / result / HUD DOM wiring
├── assets/                  # Sprites, backgrounds, waves, buttons
├── sounds/musics/           # Menu / per-level / victory music
└── videos/                  # Menu background video
```

## 🧱 Architecture Highlights

- **Fixed-timestep accumulator** (`FIXED_DT_MS = 1000/60`, `MAX_STEPS = 3`) — frame-rate-independent physics on 30 / 60 / 120 Hz displays alike.
- **Object pool** — float texts are reused via a DOM pool + WeakMap of animations (prevents GC jank).
- **Per-biome asset resolver** — `resolveSkin(biomeId, key)` transparently picks the right texture; adding a new biome is a one-line config change.
- **Gradient & offscreen-canvas cache** — water gradients, wave strips, and caustics are pre-rendered and reused per resize.
- **Autoplay-policy workaround** — a "tap to start" pill waits for the first user gesture, then unlocks `AudioContext` and starts the menu music.
- **Error boundary** — the game loop catches and logs per-frame errors; 30 consecutive failures halt the loop with a UI indicator.

## 🙏 Credits

- Fish, boat, hook, trash — custom pixel art by the author
- Background music — _see `sounds/musics/` file attributions in the report_
- Fonts — Google Fonts: **Fredoka One**, **Nunito**

## 📜 License

Course-project scope. Do not redistribute art/music assets without the author's permission.