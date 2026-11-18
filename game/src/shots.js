// The screenshot scenes behind ?shot=start|play|win|over. Each one plays the
// real rules forward from a fresh world for a fixed simulated time, steered by
// an autopilot, so the frame is what a real game looks like and the same seed
// always gives the same frame. Nothing here draws anything the game itself
// cannot: the renderer paints the staged world exactly as it paints play.
import { BALL, FIELD, PADDLE, STEP } from './config.js';
import { EVENT_LOST, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Where a ball will cross the paddle's line, with wall bounces folded in. */
function predictX(ball) {
  let x = ball.x;
  let y = ball.y;
  let vx = ball.vx;
  const vy = ball.vy;
  if (vy <= 0) return x;
  const dt = STEP;
  for (let t = 0; t < 3; t += dt) {
    x += vx * dt;
    y += vy * dt;
    if (x - BALL.radius < FIELD.left) {
      x = FIELD.left + BALL.radius;
      vx = Math.abs(vx);
    } else if (x + BALL.radius > FIELD.right) {
      x = FIELD.right - BALL.radius;
      vx = -Math.abs(vx);
    }
    if (y >= PADDLE.y) return x;
  }
  return x;
}

/** The middle of the crystals still standing: the autopilot aims sparks there. */
function brickTarget(state) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const b of state.bricks) {
    if (b.alive && b.kind !== 'S') {
      sx += b.x + 47;
      sy += b.y + 13;
      n += 1;
    }
  }
  if (!n) return null;
  return { x: sx / n, y: sy / n };
}

function autopilot(state, skill) {
  const flying = state.balls.filter((b) => !b.stuck);
  const control = { dir: 0, pointer: null, launch: state.balls.some((b) => b.stuck), fire: true };
  const descending = flying.filter((b) => b.vy > 0).sort((a, b) => b.y - a.y)[0];
  const target = brickTarget(state);
  if (descending) {
    const px = predictX(descending);
    // Aim the rebound at the remaining crystals: pick the contact point on
    // the paddle whose bounce angle points at the target.
    let contact = px;
    if (target && skill >= 1) {
      const dx = target.x - px;
      const dy = PADDLE.y - target.y;
      const want = Math.atan2(dx, dy) / 1.05;
      const offset = Math.max(-0.9, Math.min(0.9, want));
      contact = px - offset * (state.paddle.width / 2) * 0.9;
    }
    control.pointer = contact;
  } else if (state.powerups.length) {
    // No spark falling: chase the lowest shard.
    const shard = state.powerups.reduce((a, b) => (b.y > a.y ? b : a));
    control.pointer = shard.x;
  } else if (flying.length) {
    control.pointer = flying[0].x;
  } else {
    control.pointer = (FIELD.left + FIELD.right) / 2;
  }
  return control;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any unknown name stages the title.
 */
export function stageShot(name, world, random) {
  const state = world.state;
  if (name === 'play' || name === 'win' || name === 'over') {
    world.reset();
  } else {
    world.reset();
    // Title: the demo game plays behind the title for a few seconds.
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, autopilot(state, 1), true);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'over') {
    // A paddle that never moves: the sparks drain, one life after another.
    for (let i = 0; i < 600 / STEP; i += 1) {
      const events = world.step(STEP, { dir: 0, pointer: null, launch: true, fire: false }, false);
      if (events & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: state.score };
  }

  if (name === 'play') {
    // Good play until the frame is alive: crystals breaking, sparks flying,
    // ideally a shard on its way down.
    let steps = 0;
    for (; steps < 70 / STEP; steps += 1) {
      const events = world.step(STEP, autopilot(state, 1), false);
      if (events & (EVENT_OVER | EVENT_WIN)) break;
      if (state.time >= 14 && state.particles.length >= 8 && (state.powerups.length > 0 || state.time > 26)) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }

  // Win: perfect play through all five forges. If the sparks stall against
  // the last crystals, a seeded nudge changes their angle, as a player
  // re-aiming would.
  let lastBroken = 0;
  let broken = 0;
  for (let i = 0; i < 600 / STEP; i += 1) {
    const events = world.step(STEP, autopilot(state, 2), false);
    if (events & EVENT_WIN) break;
    if (events & EVENT_OVER) break;
    if (state.stats.broken !== broken) {
      broken = state.stats.broken;
      lastBroken = state.time;
    }
    if (state.time - lastBroken > 12 && state.balls.some((b) => !b.stuck)) {
      for (const ball of state.balls) {
        if (ball.stuck) continue;
        const speed = Math.hypot(ball.vx, ball.vy);
        const a = Math.atan2(ball.vy, ball.vx) + random.range(-0.3, 0.3);
        ball.vx = Math.cos(a) * speed;
        ball.vy = Math.sin(a) * speed;
      }
      lastBroken = state.time;
    }
  }
  return { screen: state.finished ? SCREEN_WIN : SCREEN_PLAY, best: state.score };
}
