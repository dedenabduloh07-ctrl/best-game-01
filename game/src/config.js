// Lumenforge: tuning constants. One place for every number the game plays by,
// so the feel can be tuned without touching the rules.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;
export const BEST_KEY = 'lumenforge-best';

// The play field: walls left, right and top; the forge floor is open at the
// bottom, where a lost spark costs a life.
export const FIELD = { left: 36, right: 1244, top: 92, bottom: 712 };

export const PADDLE = {
  y: 664,
  width: 128,
  wideWidth: 188,
  height: 16,
  speed: 660,
  corner: 8,
};

export const BALL = {
  radius: 8,
  speed: 430,
  maxSpeed: 740,
  speedGain: 1.015,
  maxAngle: 1.05, // radians off vertical at the paddle's edge
};

export const BRICK = {
  cols: 12,
  width: 94,
  height: 26,
  gap: 6,
  top: 118,
};
BRICK.left = (VIEW_W - (BRICK.cols * BRICK.width + (BRICK.cols - 1) * BRICK.gap)) / 2;

export const LIVES = 3;
export const LEVEL_COUNT = 5;

// Combo: each brick broken without the spark touching the paddle raises the
// multiplier by one step, up to x8; the paddle resets it.
export const COMBO_MAX = 8;
export const COMBO_WINDOW = 6; // seconds before the combo cools on its own

export const POWERUP = {
  fallSpeed: 150,
  radius: 13,
  dropChance: 0.14, // a plain crystal's chance to drop a shard
  wideSeconds: 14,
  slowSeconds: 10,
  laserSeconds: 12,
};

export const LASER = { speed: 900, width: 5, height: 16, cooldown: 0.22 };
