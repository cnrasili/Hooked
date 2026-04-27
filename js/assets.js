// Image asset loader and wave strip generator.
'use strict';

const Assets = {
  _store: {},
  // Called on each asset load (success or fail). Loading screen listens.
  _onProgress: null,

  load(key, src) {
    return new Promise(resolve => {
      const img = new Image();
      const done = (ok) => {
        if (ok) this._store[key] = img;
        if (typeof this._onProgress === 'function') {
          try { this._onProgress(key, ok); } catch (e) { /* ignore */ }
        }
        resolve(ok ? img : null);
      };
      img.onload  = () => done(true);
      img.onerror = () => {
        console.warn(`[Assets] "${key}" failed: ${src}`);
        done(false);
      };
      img.src = src;
    });
  },

  async loadManifest(manifest) {
    const entries = Object.entries(manifest);
    await Promise.all(entries.map(([key, src]) => this.load(key, src)));
  },

  register(key, source) {
    this._store[key] = source;
  },

  get(key) {
    return this._store[key] || null;
  },

  remove(key) {
    delete this._store[key];
  },

  // Per-biome wave source images (loaded once, strips rebuilt on canvas resize).
  _waveImgs: {},   // biomeId → Image | null

  _WAVE_FILES: {
    ocean: 'assets/waves/OceanWaterWave.png',
    swamp: 'assets/waves/SwampWaterWave.png',
    polar: 'assets/waves/PolarWaterWave.png',
  },

  _loadWaveImgFor(biomeId) {
    if (biomeId in this._waveImgs) return Promise.resolve(this._waveImgs[biomeId]);
    const src = this._WAVE_FILES[biomeId];
    if (!src) { this._waveImgs[biomeId] = null; return Promise.resolve(null); }
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { this._waveImgs[biomeId] = img; resolve(img); };
      img.onerror = () => {
        console.warn(`[Assets] ${biomeId} wave failed: ${src}, using fallback.`);
        this._waveImgs[biomeId] = null;
        resolve(null);
      };
      img.src = src;
    });
  },

  // Returns a promise; called once at startup and on canvas resize.
  generateWaves(canvasWidth) {
    const biomeIds = Object.keys(this._WAVE_FILES);
    return Promise.all(
      biomeIds.map(id =>
        this._loadWaveImgFor(id).then(img => {
          if (img) this._buildWaveStrips(canvasWidth, img, id);
          else     this._buildFallbackWaves(canvasWidth, id);
        })
      )
    );
  },

  _buildWaveStrips(canvasWidth, srcImg, biomeId) {
    const prefix = biomeId ? biomeId + '_' : '';
    const layers = [
      { key: prefix + 'wave_far',   targetH: 68, tint: null },
      { key: prefix + 'wave_back',  targetH: 60, tint: null },
      { key: prefix + 'wave_mid',   targetH: 50, tint: null },
      { key: prefix + 'wave_front', targetH: 42, tint: null },
    ];

    layers.forEach(cfg => {
      const ratio  = cfg.targetH / srcImg.height;
      const tileW  = Math.round(srcImg.width * ratio);
      const tileH  = cfg.targetH;
      const tilesNeeded = Math.ceil((canvasWidth * 2) / tileW) + 2;
      const stripW = tilesNeeded * tileW;

      const c   = document.createElement('canvas');
      c.width   = stripW;
      c.height  = tileH;
      const cx  = c.getContext('2d');

      for (let i = 0; i < tilesNeeded; i++) {
        cx.drawImage(srcImg, i * tileW, 0, tileW, tileH);
      }

      if (cfg.tint) {
        cx.globalCompositeOperation = 'source-atop';
        cx.fillStyle = cfg.tint;
        cx.fillRect(0, 0, stripW, tileH);
        cx.globalCompositeOperation = 'source-over';
      }

      c._tileW      = tileW;
      this.register(cfg.key, c);
    });
  },

  _buildFallbackWaves(canvasWidth, biomeId) {
    const prefix = biomeId ? biomeId + '_' : '';
    const texW = Math.max(canvasWidth * 2, 800);
    const fallbackLayers = [
      { key: prefix + 'wave_far',   h: 80, color: 'rgba(4,25,55,0.60)',    amps: [8,4,2],  freqs: [2,4,8]  },
      { key: prefix + 'wave_back',  h: 70, color: 'rgba(8,40,75,0.55)',    amps: [10,5,3], freqs: [2,5,9]  },
      { key: prefix + 'wave_mid',   h: 55, color: 'rgba(15,70,120,0.45)', amps: [12,6,2], freqs: [3,7,11] },
      { key: prefix + 'wave_front', h: 45, color: 'rgba(26,120,180,0.40)', amps: [14,7,3], freqs: [2,6,10] },
    ];

    fallbackLayers.forEach(cfg => {
      const c  = document.createElement('canvas');
      c.width  = texW;
      c.height = cfg.h;
      const cx = c.getContext('2d');

      cx.beginPath();
      cx.moveTo(0, cfg.h);
      for (let x = 0; x <= texW; x++) {
        let y = cfg.h * 0.4;
        for (let i = 0; i < cfg.amps.length; i++) {
          y += cfg.amps[i] * Math.sin((x / texW) * cfg.freqs[i] * Math.PI * 2);
        }
        cx.lineTo(x, y);
      }
      cx.lineTo(texW, cfg.h); cx.closePath();

      const grad = cx.createLinearGradient(0, 0, 0, cfg.h);
      grad.addColorStop(0, cfg.color);
      grad.addColorStop(1, cfg.color.replace(/[\d.]+\)$/, '0.08)'));
      cx.fillStyle = grad;
      cx.fill();

      this.register(cfg.key, c);
    });
  },

};
