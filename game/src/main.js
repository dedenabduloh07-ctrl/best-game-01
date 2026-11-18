// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between five screens: title, play, paused, game over and victory.
//
// ?seed=N fixes the run. ?shot=start|play|win|over (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_BRICK,
  EVENT_CRACK,
  EVENT_EXPLODE,
  EVENT_LASER,
  EVENT_LEVEL,
  EVENT_LOST,
  EVENT_OVER,
  EVENT_PADDLE,
  EVENT_POWER,
  EVENT_WALL,
  EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import { initAudio, isMuted, sfx, toggleMute } from './audio.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const world = createWorld(random);
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, random);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let fired = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    initAudio();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing Lumenforge. ${LIVES} sparks. Level 1, First Light.`);
  }

  function finishRun(win) {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (win) {
      screen = SCREEN_WIN;
      sfx.win();
      announce(`Victory! Final score ${world.state.score}. Best ${best}.`);
    } else {
      screen = SCREEN_OVER;
      sfx.over();
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function playSounds(events) {
    if (events & EVENT_EXPLODE) sfx.explode();
    else if (events & EVENT_BRICK) sfx.brick(1);
    else if (events & EVENT_CRACK) sfx.crack();
    if (events & EVENT_PADDLE) sfx.paddle();
    if (events & EVENT_WALL) sfx.wall();
    if (events & EVENT_POWER) sfx.power();
    if (events & EVENT_LASER) sfx.laser();
    if (events & EVENT_LOST) sfx.lose();
    if (events & EVENT_LEVEL) sfx.level();
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The title plays a demo game behind it.
      const demo = { dir: 0, pointer: null, launch: true, fire: false };
      const flying = world.state.balls.find((b) => !b.stuck);
      if (flying) demo.pointer = flying.x;
      world.step(STEP, demo, true);
      return;
    }
    const control = {
      dir: input.direction(),
      pointer: input.pointer(),
      launch: false,
      fire: false,
    };
    // A confirm press launches a stuck spark or fires the laser; it is read
    // fresh each frame from the queued actions.
    if (fired) {
      control.launch = true;
      control.fire = true;
      fired = false;
    }
    const events = world.step(STEP, control, false);
    playSounds(events);
    if (events & EVENT_WIN) finishRun(true);
    else if (events & EVENT_OVER) finishRun(false);
    else if (events & EVENT_LOST) announce(`Spark lost. ${world.state.lives} left.`);
    else if (events & EVENT_LEVEL) announce(`Level ${world.state.level}, ${world.state.levelName}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const before = input.takeActions();
    if (before & ACTION_CONFIRM) {
      // Confirm both starts the game from a menu and launches/fires in play.
      if (screen === SCREEN_PLAY) fired = true;
      handleActionsFrom(before);
    } else {
      handleActionsFrom(before);
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  function handleActionsFrom(actions) {
    if (actions & ACTION_MUTE) {
      const nowMuted = toggleMute();
      announce(nowMuted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) {
      initAudio();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumenforge. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
