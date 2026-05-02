# Hooked!

A browser-based fishing mini-game built with vanilla HTML5 Canvas 2D and plain JavaScript. Players catch fish across multiple ocean biomes with increasing difficulty, earn gold, and spend it on permanent upgrades and one-shot powerups.

> Course: Computer Graphics — Spring 2026 Final Project

---

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | Web Browser |
| Rendering | HTML5 Canvas 2D |
| Language | Plain JavaScript (no build step) |
| Styling | CSS3 |
| Audio | WebAudio API & HTMLAudio |
| Hosting | GitHub Pages |

---

## Prerequisites

- Any modern web browser (Chrome / Firefox / Safari / Edge)
- No server, no Node.js, no build tools required

---

## Setup

```bash
git clone https://github.com/cnrasili/Hooked.git
cd Hooked
```

No install step needed. The game runs entirely in the browser from static files.

---

## Running the Application

Open `index.html` directly in a browser, or serve the directory with any static file server:

```bash
# Option 1: Direct open
start index.html

# Option 2: Python simple server
python -m http.server 8000
```

For GitHub Pages deployment, the game is available at the repository's Pages URL.

---

## Controls

| Action | Input |
|---|---|
| Move the net | Mouse / Touch drag, or Arrow Keys (← →) / A D keys |
| Pause / Resume | Esc key |
| Toggle sound | Speaker button on main menu or pause screen |
| Skip intro cast | Tap / click anywhere during the cast animation |

---

## Gameplay Loop

1. **Biome Select** — Choose an ocean biome. Beating a biome unlocks the next. Each biome increases difficulty (faster rise, more trash, new fish).
2. **Fishing Phase** — Catch the target number of fish while avoiding trash. Trash reduces Net HP.
3. **Result Screen** — Awards gold, shows high scores, triggers confetti on a win.
4. **Shop** — Spend gold on permanent upgrades (wider net, HP, slower rise) and powerups (shield, magnet, timewarp).

---

## Features

- **Multiple biomes** — progressively harder ocean environments with unique backgrounds, waves, and fish types
- **Upgrade system** — permanent net upgrades and consumable powerups purchased with in-game gold
- **Particle effects** — burst particles, confetti, floating score text, and damage flash
- **Fixed-timestep physics** — frame-rate-independent gameplay across 30 / 60 / 120 Hz displays
- **Object pooling** — DOM pool and WeakMap-based animation reuse to prevent GC jank
- **Biome-aware rendering** — per-biome sprite resolution via `resolveSkin(biomeId, key)`
- **Offscreen canvas caching** — water gradients, wave strips, and caustics pre-rendered and reused per resize
- **Save system** — player gold, unlocked biomes, and upgrades persisted via localStorage
- **Error boundary** — game loop catches per-frame errors; 30 consecutive failures halt with a UI indicator

---

## Computer Graphics Concepts Demonstrated

- **Transformations** — boat bobbing, hook punch scaling, and net sway using rotation and translation
- **Animation** — particle systems, tween-based float texts (Web Animations API), and fixed-timestep physics
- **Interaction** — Pointer Events API (mouse/touch/pen unified), keyboard state, and pause/mute state machine
- **Rendering techniques** — offscreen canvas caching, parallax wave strips, caustics light shaders, and biome-aware sprite pipelines
- **Effects** — damage flashing, screen shake, depth vignette, burst particles, and confetti

---

## Project Structure

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

---

## Credits

- Fish, boat, hook, trash — custom pixel art by the author
- Background music — see `sounds/musics/` file attributions in the report
- Fonts — Google Fonts: Fredoka One, Nunito

---

## License

Course-project scope. Do not redistribute art/music assets without the author's permission.