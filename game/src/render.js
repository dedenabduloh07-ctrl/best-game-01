// Everything the player sees: the deep-space forge, the crystals, the paddle
// and sparks, the HUD and the screens. The world is drawn in a fixed 1280x720
// space, scaled to fit the window with letterboxing.
import { BALL, BRICK, FIELD, LEVEL_COUNT, PADDLE, POWERUP, VIEW_H, VIEW_W } from './config.js';
import { COLORS } from './levels.js';
import { shardStyle } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

// A fixed starfield and nebulae, generated once from a seed so the backdrop
// is identical on every machine and in every screenshot.
function makeBackdrop() {
  let s = 1234567;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const stars = [];
  for (let i = 0; i < 170; i += 1) {
    stars.push({ x: rnd() * VIEW_W, y: rnd() * VIEW_H, r: 0.6 + rnd() * 1.7, tw: rnd() * Math.PI * 2, sp: 0.6 + rnd() * 1.8 });
  }
  const nebulae = [
    { x: 220, y: 170, r: 340, color: 'rgba(56,120,255,0.16)' },
    { x: 1060, y: 240, r: 300, color: 'rgba(180,60,255,0.13)' },
    { x: 640, y: 620, r: 420, color: 'rgba(255,90,60,0.10)' },
    { x: 900, y: 90, r: 220, color: 'rgba(55,225,255,0.12)' },
  ];
  return { stars, nebulae };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const backdrop = makeBackdrop();
  let scale = 1;
  let ox = 0;
  let oy = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scale = Math.min(w / VIEW_W, h / VIEW_H) * dpr;
    ox = (w * dpr - VIEW_W * scale) / 2;
    oy = (h * dpr - VIEW_H * scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground(time) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#070b1d');
    g.addColorStop(0.55, '#0d1230');
    g.addColorStop(1, '#160a24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (const n of backdrop.nebulae) {
      const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      rg.addColorStop(0, n.color);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    for (const st of backdrop.stars) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * st.sp + st.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#dfeaff';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Forge glow along the floor.
    const fg = ctx.createLinearGradient(0, VIEW_H - 90, 0, VIEW_H);
    fg.addColorStop(0, 'rgba(255,120,40,0)');
    fg.addColorStop(1, 'rgba(255,120,40,0.18)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, VIEW_H - 90, VIEW_W, 90);
    // Walls.
    ctx.fillStyle = 'rgba(120,170,255,0.16)';
    ctx.fillRect(FIELD.left - 6, FIELD.top - 6, 4, VIEW_H - FIELD.top);
    ctx.fillRect(FIELD.right + 2, FIELD.top - 6, 4, VIEW_H - FIELD.top);
    ctx.fillRect(FIELD.left - 6, FIELD.top - 6, FIELD.right - FIELD.left + 12, 4);
  }

  function drawBrick(brick, time) {
    const [c1, c2] = COLORS[brick.kind];
    const x = brick.x;
    const y = brick.y;
    const flash = Math.max(0, brick.flash);
    const g = ctx.createLinearGradient(x, y, x, y + BRICK.height);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.save();
    if (brick.kind === 'X') {
      ctx.shadowColor = '#f5ff6b';
      ctx.shadowBlur = 14 + 8 * Math.sin(time * 5 + brick.col);
    } else if (brick.kind === 'G') {
      ctx.shadowColor = '#ffe98a';
      ctx.shadowBlur = 12;
    }
    roundRect(x, y, BRICK.width, BRICK.height, 6);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // Glassy top edge.
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundRect(x + 3, y + 3, BRICK.width - 6, 8, 4);
    ctx.fill();
    // Cracks as the crystal weakens.
    if (brick.maxHp !== Infinity && brick.hp < brick.maxHp) {
      ctx.strokeStyle = 'rgba(20,10,30,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + BRICK.width * 0.3, y + 3);
      ctx.lineTo(x + BRICK.width * 0.45, y + BRICK.height * 0.55);
      ctx.lineTo(x + BRICK.width * 0.35, y + BRICK.height - 3);
      ctx.moveTo(x + BRICK.width * 0.65, y + 3);
      ctx.lineTo(x + BRICK.width * 0.55, y + BRICK.height * 0.6);
      ctx.stroke();
    }
    if (brick.kind === 'X') {
      ctx.fillStyle = 'rgba(30,20,0,0.85)';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦', x + BRICK.width / 2, y + BRICK.height / 2 + 1);
    } else if (brick.kind === 'G') {
      ctx.fillStyle = 'rgba(60,40,0,0.9)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◆', x + BRICK.width / 2, y + BRICK.height / 2 + 1);
    } else if (brick.kind === 'S') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 6, y + 6, BRICK.width - 12, BRICK.height - 12);
    }
    if (flash > 0) {
      ctx.globalAlpha = Math.min(1, flash * 8);
      ctx.fillStyle = '#ffffff';
      roundRect(x, y, BRICK.width, BRICK.height, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawPaddle(state, time) {
    const p = state.paddle;
    const w = p.width;
    const x = p.x - w / 2;
    const y = PADDLE.y;
    ctx.save();
    ctx.shadowColor = '#37e2ff';
    ctx.shadowBlur = 18;
    const g = ctx.createLinearGradient(x, y, x, y + PADDLE.height);
    g.addColorStop(0, '#aef4ff');
    g.addColorStop(0.45, '#37b6ff');
    g.addColorStop(1, '#1b5fd8');
    roundRect(x, y, w, PADDLE.height, PADDLE.corner);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    roundRect(x + 8, y + 3, w - 16, 4, 2);
    ctx.fill();
    // Energy core.
    const pulse = 0.7 + 0.3 * Math.sin(time * 6);
    ctx.fillStyle = `rgba(255,255,255,${0.55 * pulse})`;
    ctx.beginPath();
    ctx.arc(p.x, y + PADDLE.height / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Laser cannons.
    if (state.time < p.laserUntil) {
      ctx.fillStyle = '#ff8a3d';
      for (const side of [-1, 1]) {
        const cx = p.x + side * (w / 2 - 8);
        roundRect(cx - 4, y - 10, 8, 12, 3);
        ctx.fill();
      }
    }
    // Guard shield: a green arc above the floor.
    if (p.shield) {
      ctx.strokeStyle = `rgba(125,255,176,${0.55 + 0.3 * Math.sin(time * 4)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(FIELD.left + 8, FIELD.bottom - 4);
      ctx.lineTo(FIELD.right - 8, FIELD.bottom - 4);
      ctx.stroke();
    }
  }

  function drawBall(ball, time) {
    // Motion streak.
    const speed = Math.hypot(ball.vx, ball.vy) || 1;
    const tx = (ball.vx / speed) * 26;
    const ty = (ball.vy / speed) * 26;
    const g = ctx.createLinearGradient(ball.x, ball.y, ball.x - tx, ball.y - ty);
    g.addColorStop(0, 'rgba(255,240,180,0.85)');
    g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = BALL.radius * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x - tx, ball.y - ty);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#ffd76b';
    ctx.shadowBlur = 20;
    const rg = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL.radius);
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(0.5, '#ffe98a');
    rg.addColorStop(1, '#ff9d45');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShards(state, time) {
    for (const shard of state.powerups) {
      const style = shardStyle(shard.kind);
      const bob = Math.sin(time * 4 + shard.x) * 2;
      const y = shard.y + bob;
      ctx.save();
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(10,14,34,0.95)';
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(shard.x, y, POWERUP.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = style.color;
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(shard.kind, shard.x, y + 1);
    }
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts(state) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of state.texts) {
      ctx.globalAlpha = Math.min(1, t.life / 0.5);
      ctx.font = `bold ${t.size}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best, screen) {
    ctx.fillStyle = 'rgba(6,10,26,0.72)';
    ctx.fillRect(0, 0, VIEW_W, 64);
    ctx.fillStyle = 'rgba(120,170,255,0.25)';
    ctx.fillRect(0, 64, VIEW_W, 2);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#8fa8d8';
    ctx.fillText('SCORE', 44, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(String(state.score).padStart(6, '0'), 44, 46);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#8fa8d8';
    ctx.fillText('BEST', 220, 22);
    ctx.fillStyle = '#ffe98a';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(String(Math.max(best, state.score)).padStart(6, '0'), 220, 46);
    // Level + progress.
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#8fa8d8';
    ctx.fillText(`LEVEL ${state.level}/${LEVEL_COUNT} · ${state.levelName}`, VIEW_W / 2, 22);
    const total = state.bricks.reduce((n, b) => n + (b.kind === 'S' ? 0 : 1), 0) || 1;
    const done = 1 - state.bricksLeft / total;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    roundRect(VIEW_W / 2 - 150, 36, 300, 10, 5);
    ctx.fill();
    ctx.fillStyle = state.levelTint;
    if (done > 0) {
      roundRect(VIEW_W / 2 - 150, 36, 300 * done, 10, 5);
      ctx.fill();
    }
    // Lives as forge hearts.
    ctx.textAlign = 'right';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#8fa8d8';
    ctx.fillText('SPARKS', VIEW_W - 44, 22);
    for (let i = 0; i < state.lives; i += 1) {
      const x = VIEW_W - 44 - i * 30;
      ctx.fillStyle = '#ff6b8f';
      ctx.beginPath();
      ctx.arc(x - 8, 44, 6, 0, Math.PI * 2);
      ctx.arc(x + 4, 44, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 15, 46);
      ctx.lineTo(x + 11, 46);
      ctx.lineTo(x - 2, 58);
      ctx.closePath();
      ctx.fill();
    }
    // Combo meter and effect timers belong to live play only: the menus
    // and end screens keep the HUD quiet.
    if (screen !== SCREEN_PLAY && screen !== SCREEN_PAUSED) return;
    if (state.combo > 1) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = state.combo >= 5 ? '#ff6bd6' : '#ffd76b';
      ctx.fillText(`COMBO x${state.combo}`, 44, 92);
    }
    // Active effect timers.
    const p = state.paddle;
    const effects = [];
    if (state.time < p.laserUntil) effects.push(`LASER ${Math.ceil(p.laserUntil - state.time)}s`);
    if (p.wideUntil) effects.push(`WIDE ${Math.ceil(p.wideUntil - state.time)}s`);
    if (p.shield) effects.push('GUARD');
    if (effects.length) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#7dffb0';
      ctx.fillText(effects.join('  ·  '), VIEW_W - 44, 92);
    }
  }

  function dim(alpha) {
    ctx.fillStyle = `rgba(4,6,18,${alpha})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function bigText(text, y, size, color, glow) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${size}px sans-serif`;
    if (glow) {
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 30;
      ctx.fillStyle = color;
      ctx.fillText(text, VIEW_W / 2, y);
      ctx.restore();
    } else {
      ctx.fillStyle = color;
      ctx.fillText(text, VIEW_W / 2, y);
    }
  }

  function drawTitle(state, best, time) {
    dim(0.6);
    const bob = Math.sin(time * 1.4) * 6;
    bigText('LUMENFORGE', 218 + bob, 84, '#ffffff', '#37e2ff');
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffd76b';
    ctx.fillText('SHATTER THE VOID CRYSTALS · FORGE THE STARLIGHT', VIEW_W / 2, 286);
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#c4d4f5';
    ctx.fillText('Five forges stand between the dark and the dawn. Break every crystal,', VIEW_W / 2, 330);
    ctx.fillText('catch the falling shards, and do not let the spark go out.', VIEW_W / 2, 354);
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS SPACE OR CLICK TO BEGIN', VIEW_W / 2, 424);
    ctx.globalAlpha = 1;
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#8fa8d8';
    ctx.fillText('← → or A / D to move · mouse moves the forge bar · SPACE launches & fires · P pauses · M mutes', VIEW_W / 2, 478);
    if (best > 0) {
      ctx.font = 'bold 19px sans-serif';
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(`BEST SCORE  ${String(best).padStart(6, '0')}`, VIEW_W / 2, 524);
    }
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(143,168,216,0.7)';
    ctx.fillText('An original game · all art and sound made in code', VIEW_W / 2, 690);
  }

  function drawPaused() {
    dim(0.6);
    bigText('PAUSED', 300, 56, '#ffffff', '#37e2ff');
    ctx.textAlign = 'center';
    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#c4d4f5';
    ctx.fillText('Press P, Space or click to keep forging', VIEW_W / 2, 360);
  }

  function drawStats(state, y) {
    ctx.textAlign = 'center';
    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#c4d4f5';
    ctx.fillText(
      `Crystals shattered ${state.stats.broken}   ·   Shards caught ${state.stats.shards}   ·   Best combo x${state.stats.maxCombo}`,
      VIEW_W / 2,
      y,
    );
  }

  function drawOver(state, best, time) {
    dim(0.7);
    bigText('THE SPARK GOES OUT', 250, 54, '#ff6b8f', '#ff2a54');
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SCORE  ${String(state.score).padStart(6, '0')}`, VIEW_W / 2, 322);
    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#ffe98a';
    ctx.fillText(`BEST  ${String(Math.max(best, state.score)).padStart(6, '0')}   ·   REACHED LEVEL ${state.level} · ${state.levelName}`, VIEW_W / 2, 362);
    drawStats(state, 402);
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS SPACE OR CLICK TO TRY AGAIN', VIEW_W / 2, 470);
    ctx.globalAlpha = 1;
  }

  function drawWin(state, best, time) {
    dim(0.55);
    // Crown of light.
    const cx = VIEW_W / 2;
    const rg = ctx.createRadialGradient(cx, 210, 10, cx, 210, 190);
    rg.addColorStop(0, 'rgba(255,233,138,0.5)');
    rg.addColorStop(1, 'rgba(255,233,138,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(cx - 200, 20, 400, 380);
    bigText('★ THE DAWN IS FORGED ★', 212, 50, '#ffe98a', '#ffd76b');
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Every forge burns bright. The void retreats.', VIEW_W / 2, 268);
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`FINAL SCORE  ${String(state.score).padStart(6, '0')}`, VIEW_W / 2, 330);
    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#ffe98a';
    const bonus = state.lives * 500;
    ctx.fillText(`Spark bonus +${bonus}  (${state.lives} sparks kept)   ·   BEST  ${String(Math.max(best, state.score)).padStart(6, '0')}`, VIEW_W / 2, 370);
    drawStats(state, 410);
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS SPACE OR CLICK TO PLAY AGAIN', VIEW_W / 2, 478);
    ctx.globalAlpha = 1;
  }

  function drawBanner(state) {
    if (state.banner <= 0) return;
    const a = Math.min(1, state.banner / 0.5, (2.2 - state.banner) / 0.3);
    ctx.globalAlpha = Math.max(0, a);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 44px sans-serif';
    ctx.save();
    ctx.shadowColor = state.levelTint;
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`LEVEL ${state.level}`, VIEW_W / 2, 470);
    ctx.restore();
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = state.levelTint;
    ctx.fillText(state.levelName, VIEW_W / 2, 510);
    ctx.globalAlpha = 1;
  }

  function drawWorld(state, time) {
    drawBackground(time);
    for (const brick of state.bricks) {
      if (brick.alive) drawBrick(brick, time);
    }
    drawShards(state, time);
    for (const bolt of state.bolts) {
      ctx.save();
      ctx.shadowColor = '#ff8a3d';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffd0a0';
      roundRect(bolt.x - 2.5, bolt.y - 8, 5, 16, 2);
      ctx.fill();
      ctx.restore();
    }
    drawPaddle(state, time);
    for (const ball of state.balls) drawBall(ball, time);
    drawParticles(state);
    drawTexts(state);
  }

  function draw(state, screen, best) {
    const time = state.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04061a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.save();
    if (state.shake > 0) {
      const m = state.shake * 14;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    drawWorld(state, time);
    ctx.restore();
    drawHud(state, best, screen);
    if (screen === SCREEN_TITLE) drawTitle(state, best, time);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best, time);
    else if (screen === SCREEN_WIN) drawWin(state, best, time);
    else if (screen === SCREEN_PLAY) drawBanner(state);
  }

  return { draw };
}
