// Lumenforge's rules: the paddle, the sparks, the crystals, the falling
// shards and the score. Pure simulation — no drawing, no sound, no DOM — so a
// run from a seed is the same every time, and the screenshot scenes can play
// it forward faster than real time.
import { BALL, BRICK, COMBO_MAX, COMBO_WINDOW, FIELD, LASER, LEVEL_COUNT, LIVES, PADDLE, POWERUP, STEP } from './config.js';
import { COLORS, LEVELS, POINTS } from './levels.js';

export const EVENT_PADDLE = 1;
export const EVENT_BRICK = 2;
export const EVENT_CRACK = 4;
export const EVENT_EXPLODE = 8;
export const EVENT_POWER = 16;
export const EVENT_LOST = 32;
export const EVENT_OVER = 64;
export const EVENT_WIN = 128;
export const EVENT_LEVEL = 256;
export const EVENT_LASER = 512;
export const EVENT_WALL = 1024;

export const SHARD_KINDS = ['W', 'M', 'S', 'L', 'G', 'E'];
const SHARD_STYLE = {
  W: { label: 'WIDE', color: '#37e2ff' },
  M: { label: 'MULTIBALL', color: '#ff6bd6' },
  S: { label: 'SLOW', color: '#6b9dff' },
  L: { label: 'LASER', color: '#ff8a3d' },
  G: { label: 'GUARD', color: '#7dffb0' },
  E: { label: '+1 LIFE', color: '#ffe98a' },
};

export function shardStyle(kind) {
  return SHARD_STYLE[kind];
}

export function createWorld(random) {
  const state = {
    paddle: { x: (FIELD.left + FIELD.right) / 2, width: PADDLE.width, wideUntil: 0, laserUntil: 0, laserCooldown: 0, shield: false },
    balls: [],
    bricks: [],
    powerups: [],
    bolts: [],
    particles: [],
    texts: [],
    score: 0,
    combo: 1,
    comboTimer: 0,
    lives: LIVES,
    level: 1,
    time: 0,
    shake: 0,
    banner: 0,
    bricksLeft: 0,
    stats: { broken: 0, shards: 0, maxCombo: 1, launched: 0 },
    finished: false,
    levelName: '',
    levelTint: '#38e1ff',
  };

  function burst(x, y, color, count, speed, size, grav = 500) {
    for (let i = 0; i < count; i += 1) {
      const a = random.range(0, Math.PI * 2);
      const s = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.25,
        life: random.range(0.35, 0.8),
        max: 0.8,
        size: random.range(size * 0.5, size),
        color,
        grav,
      });
    }
    if (state.particles.length > 420) state.particles.splice(0, state.particles.length - 420);
  }

  function floatText(x, y, text, color, size = 20) {
    state.texts.push({ x, y, life: 0.9, text, color, size });
  }

  function loadLevel(n) {
    const def = LEVELS[n - 1];
    state.level = n;
    state.levelName = def.name;
    state.levelTint = def.tint;
    state.bricks = [];
    state.bricksLeft = 0;
    def.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c += 1) {
        const ch = row[c];
        if (ch === '.') continue;
        const hp = ch === 'S' ? Infinity : ch === 'X' || ch === 'G' ? 1 : Number(ch);
        state.bricks.push({
          col: c, row: r,
          x: BRICK.left + c * (BRICK.width + BRICK.gap),
          y: BRICK.top + r * (BRICK.height + BRICK.gap),
          hp, maxHp: hp, kind: ch, alive: true, flash: 0,
        });
        if (ch !== 'S') state.bricksLeft += 1;
      }
    });
    state.powerups = [];
    state.bolts = [];
    state.balls = [newBall()];
    state.banner = 2.2;
  }

  function newBall() {
    return {
      x: state.paddle.x,
      y: PADDLE.y - BALL.radius - 2,
      vx: 0, vy: 0,
      stuck: true,
    };
  }

  function launch(ball) {
    const angle = random.range(-0.35, 0.35);
    ball.vx = Math.sin(angle) * BALL.speed;
    ball.vy = -Math.cos(angle) * BALL.speed;
    ball.stuck = false;
    state.stats.launched += 1;
  }

  function dropShard(x, y, forced) {
    let kind = forced;
    if (!kind) {
      if (!random.chance(POWERUP.dropChance)) return;
      kind = random.chance(0.08) ? 'E' : SHARD_KINDS[random.int(5)];
    }
    state.powerups.push({ x, y, vy: POWERUP.fallSpeed, kind });
  }

  // Damage one crystal; returns an event mask. Breaking a volatile crystal
  // bursts its neighbours too, through a queue so chains settle in one step.
  function damageBrick(brick, amount, events) {
    if (!brick.alive || brick.kind === 'S') return events;
    brick.hp -= amount;
    brick.flash = 0.12;
    if (brick.hp > 0) {
      burst(brick.x + BRICK.width / 2, brick.y + BRICK.height / 2, COLORS[brick.kind][0], 4, 160, 4);
      return events | EVENT_CRACK;
    }
    brick.alive = false;
    state.bricksLeft -= 1;
    state.stats.broken += 1;
    const gained = POINTS[brick.kind] * state.combo;
    state.score += gained;
    state.combo = Math.min(COMBO_MAX, state.combo + 1);
    state.comboTimer = COMBO_WINDOW;
    state.stats.maxCombo = Math.max(state.stats.maxCombo, state.combo);
    const cx = brick.x + BRICK.width / 2;
    const cy = brick.y + BRICK.height / 2;
    burst(cx, cy, COLORS[brick.kind][0], 16, 260, 6);
    burst(cx, cy, '#ffffff', 5, 180, 3);
    floatText(cx, cy, `+${gained}`, '#ffffff', state.combo >= 4 ? 26 : 20);
    if (brick.kind === 'G') dropShard(cx, cy, SHARD_KINDS[random.int(6)]);
    else if (brick.kind !== 'X') dropShard(cx, cy, null);
    events |= EVENT_BRICK;
    if (brick.kind === 'X') {
      events |= EVENT_EXPLODE;
      state.shake = Math.max(state.shake, 0.35);
      burst(cx, cy, '#f5ff6b', 30, 420, 7);
      const queue = [brick];
      const seen = new Set([brick]);
      while (queue.length) {
        const at = queue.pop();
        for (const other of state.bricks) {
          if (!other.alive || other.kind === 'S' || seen.has(other)) continue;
          if (Math.abs(other.col - at.col) <= 1 && Math.abs(other.row - at.row) <= 1) {
            seen.add(other);
            if (other.kind === 'X') queue.push(other);
            events = damageBrick(other, 2, events);
          }
        }
      }
    }
    return events;
  }

  function applyShard(kind) {
    const p = state.paddle;
    state.stats.shards += 1;
    if (kind === 'W') {
      p.wideUntil = state.time + POWERUP.wideSeconds;
      p.width = PADDLE.wideWidth;
    } else if (kind === 'M') {
      const flying = state.balls.filter((b) => !b.stuck);
      const extra = [];
      for (const ball of flying) {
        if (state.balls.length + extra.length >= 6) break;
        for (const tilt of [-0.4, 0.4]) {
          const speed = Math.hypot(ball.vx, ball.vy) || BALL.speed;
          const a = Math.atan2(ball.vy, ball.vx) + tilt;
          extra.push({ x: ball.x, y: ball.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, stuck: false });
        }
      }
      state.balls.push(...extra.slice(0, 6 - state.balls.length));
    } else if (kind === 'S') {
      for (const ball of state.balls) {
        if (ball.stuck) continue;
        const speed = Math.max(320, Math.hypot(ball.vx, ball.vy) * 0.7);
        const a = Math.atan2(ball.vy, ball.vx);
        ball.vx = Math.cos(a) * speed;
        ball.vy = Math.sin(a) * speed;
      }
    } else if (kind === 'L') {
      p.laserUntil = state.time + POWERUP.laserSeconds;
    } else if (kind === 'G') {
      p.shield = true;
    } else if (kind === 'E') {
      state.lives = Math.min(5, state.lives + 1);
    }
    const style = SHARD_STYLE[kind];
    floatText(p.x, PADDLE.y - 30, style.label, style.color, 24);
    burst(p.x, PADDLE.y, style.color, 18, 240, 5);
  }

  function collideBallBrick(ball) {
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      const cx = Math.max(brick.x, Math.min(ball.x, brick.x + BRICK.width));
      const cy = Math.max(brick.y, Math.min(ball.y, brick.y + BRICK.height));
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      if (dx * dx + dy * dy > BALL.radius * BALL.radius) continue;
      // Reflect on the shallow axis, judged from the previous position.
      const px = ball.x - ball.vx * STEP;
      const py = ball.y - ball.vy * STEP;
      const wasAbove = py + BALL.radius <= brick.y;
      const wasBelow = py - BALL.radius >= brick.y + BRICK.height;
      const wasLeft = px + BALL.radius <= brick.x;
      const wasRight = px - BALL.radius >= brick.x + BRICK.width;
      if ((wasAbove || wasBelow) && !wasLeft && !wasRight) {
        ball.vy = -ball.vy;
        ball.y = wasAbove ? brick.y - BALL.radius - 0.5 : brick.y + BRICK.height + BALL.radius + 0.5;
      } else if ((wasLeft || wasRight) && !wasAbove && !wasBelow) {
        ball.vx = -ball.vx;
        ball.x = wasLeft ? brick.x - BALL.radius - 0.5 : brick.x + BRICK.width + BALL.radius + 0.5;
      } else if (Math.abs(dx) > Math.abs(dy)) {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }
      // A touch faster after every crystal, up to the cap.
      const speed = Math.min(BALL.maxSpeed, Math.hypot(ball.vx, ball.vy) * BALL.speedGain);
      const a = Math.atan2(ball.vy, ball.vx);
      ball.vx = Math.cos(a) * speed;
      ball.vy = Math.sin(a) * speed;
      return brick;
    }
    return null;
  }

  function step(dt, control, demo) {
    let events = 0;
    state.time += dt;
    const p = state.paddle;
    if (p.wideUntil && state.time > p.wideUntil) {
      p.wideUntil = 0;
      p.width = PADDLE.width;
    }
    if (p.laserCooldown > 0) p.laserCooldown -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.6);
    if (state.banner > 0) state.banner -= dt;

    // Paddle: the mouse sets a target, the keys nudge; keys win while held.
    if (control.dir !== 0) {
      p.x += control.dir * PADDLE.speed * dt;
    } else if (control.pointer !== null && control.pointer !== undefined) {
      const target = Math.max(FIELD.left + p.width / 2, Math.min(FIELD.right - p.width / 2, control.pointer));
      const move = PADDLE.speed * 1.6 * dt;
      p.x += Math.max(-move, Math.min(move, target - p.x));
    }
    p.x = Math.max(FIELD.left + p.width / 2, Math.min(FIELD.right - p.width / 2, p.x));

    // Laser bolts.
    if (control.fire && state.time < p.laserUntil && p.laserCooldown <= 0) {
      p.laserCooldown = LASER.cooldown;
      events |= EVENT_LASER;
      for (const side of [-1, 1]) {
        state.bolts.push({ x: p.x + side * (p.width / 2 - 8), y: PADDLE.y - 10 });
      }
    }
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const bolt = state.bolts[i];
      bolt.y -= LASER.speed * dt;
      if (bolt.y < FIELD.top) {
        state.bolts.splice(i, 1);
        continue;
      }
      for (const brick of state.bricks) {
        if (!brick.alive || brick.kind === 'S') continue;
        if (bolt.x >= brick.x && bolt.x <= brick.x + BRICK.width && bolt.y >= brick.y && bolt.y <= brick.y + BRICK.height) {
          events = damageBrick(brick, 1, events);
          state.bolts.splice(i, 1);
          break;
        }
      }
    }

    // Sparks.
    for (let i = state.balls.length - 1; i >= 0; i -= 1) {
      const ball = state.balls[i];
      if (ball.stuck) {
        ball.x = p.x;
        ball.y = PADDLE.y - BALL.radius - 2;
        if (control.launch) launch(ball);
        continue;
      }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x - BALL.radius < FIELD.left) {
        ball.x = FIELD.left + BALL.radius;
        ball.vx = Math.abs(ball.vx);
        events |= EVENT_WALL;
      } else if (ball.x + BALL.radius > FIELD.right) {
        ball.x = FIELD.right - BALL.radius;
        ball.vx = -Math.abs(ball.vx);
        events |= EVENT_WALL;
      }
      if (ball.y - BALL.radius < FIELD.top) {
        ball.y = FIELD.top + BALL.radius;
        ball.vy = Math.abs(ball.vy);
        events |= EVENT_WALL;
      }
      // The forge floor: in demo play the spark bounces back; in a real
      // game it is lost, unless the guard shield catches it.
      if (ball.y + BALL.radius > FIELD.bottom) {
        if (demo) {
          ball.y = FIELD.bottom - BALL.radius;
          ball.vy = -Math.abs(ball.vy);
        } else if (p.shield) {
          p.shield = false;
          ball.y = FIELD.bottom - BALL.radius;
          ball.vy = -Math.abs(ball.vy);
          burst(ball.x, FIELD.bottom - 6, '#7dffb0', 20, 260, 5);
          floatText(ball.x, FIELD.bottom - 40, 'GUARD!', '#7dffb0', 22);
          events |= EVENT_PADDLE;
        } else {
          state.balls.splice(i, 1);
          burst(ball.x, FIELD.bottom - 4, '#ff6b8f', 14, 200, 4);
          continue;
        }
      }
      // Paddle: the bounce angle follows where the spark lands.
      if (ball.vy > 0 && ball.y + BALL.radius >= PADDLE.y && ball.y + BALL.radius <= PADDLE.y + PADDLE.height + 14
        && ball.x >= p.x - p.width / 2 - BALL.radius && ball.x <= p.x + p.width / 2 + BALL.radius) {
        const offset = Math.max(-1, Math.min(1, (ball.x - p.x) / (p.width / 2)));
        const speed = Math.hypot(ball.vx, ball.vy) || BALL.speed;
        const angle = offset * BALL.maxAngle;
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
        ball.y = PADDLE.y - BALL.radius - 0.5;
        state.combo = 1;
        state.comboTimer = 0;
        burst(ball.x, PADDLE.y, '#bfe9ff', 6, 160, 3, 200);
        events |= EVENT_PADDLE;
      }
      const hit = collideBallBrick(ball);
      if (hit) events = damageBrick(hit, 1, events);
    }

    // Falling shards.
    for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
      const shard = state.powerups[i];
      shard.y += shard.vy * dt;
      if (shard.y > FIELD.bottom) {
        state.powerups.splice(i, 1);
        continue;
      }
      if (shard.y + POWERUP.radius >= PADDLE.y && shard.y - POWERUP.radius <= PADDLE.y + PADDLE.height
        && shard.x >= p.x - p.width / 2 && shard.x <= p.x + p.width / 2) {
        applyShard(shard.kind);
        state.powerups.splice(i, 1);
        events |= EVENT_POWER;
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.grav * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
    for (let i = state.texts.length - 1; i >= 0; i -= 1) {
      const t = state.texts[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) state.texts.splice(i, 1);
    }
    for (const brick of state.bricks) {
      if (brick.flash > 0) brick.flash -= dt;
    }

    if (state.bricksLeft <= 0) {
      if (state.level >= LEVEL_COUNT) {
        if (!demo && !state.finished) {
          state.finished = true;
          state.score += state.lives * 500;
        }
        if (!demo) return events | EVENT_WIN;
        loadLevel(1);
        return events | EVENT_LEVEL;
      }
      if (!demo) {
        loadLevel(state.level + 1);
        return events | EVENT_LEVEL;
      }
      loadLevel(state.level + 1);
      return events | EVENT_LEVEL;
    }
    if (state.balls.length === 0) {
      if (demo) {
        state.balls = [newBall()];
        launch(state.balls[0]);
        return events;
      }
      state.lives -= 1;
      state.combo = 1;
      state.comboTimer = 0;
      state.shake = Math.max(state.shake, 0.4);
      if (state.lives <= 0) return events | EVENT_OVER;
      state.balls = [newBall()];
      return events | EVENT_LOST;
    }
    return events;
  }

  function reset() {
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.lives = LIVES;
    state.time = 0;
    state.shake = 0;
    state.finished = false;
    state.particles = [];
    state.texts = [];
    state.stats = { broken: 0, shards: 0, maxCombo: 1, launched: 0 };
    state.paddle.x = (FIELD.left + FIELD.right) / 2;
    state.paddle.width = PADDLE.width;
    state.paddle.wideUntil = 0;
    state.paddle.laserUntil = 0;
    state.paddle.shield = false;
    loadLevel(1);
  }

  reset();
  return { state, step, reset, loadLevel };
}
