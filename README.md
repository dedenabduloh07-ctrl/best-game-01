# Lumenforge

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/dedenabduloh07-ctrl/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/dedenabduloh07-ctrl/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Lumenforge is a complete, original arcade game: bounce the spark off the forge bar, shatter the void crystals across five hand-built forges, catch falling shards for wide bars, multiball, lasers and guard shields, and forge the dawn before your sparks run out. All art is drawn in code and all sound is synthesised with WebAudio — no assets, no network, no build step.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Or open `game/index.html` directly from disk.

## Controls

- **← →** or **A / D** — move the forge bar (the mouse moves it too)
- **Space / Enter / click** — start, launch the spark, fire the laser, restart
- **P** or **Esc** — pause · **M** — mute

## How it plays

- 5 levels, each with its own layout, palette and hazards: plain crystals, tough 2- and 3-hit crystals, volatile crystals that burst their neighbours, unbreakable starsteel, and golden crystals worth bonus points.
- Combo multiplier up to x8 for breaking crystals without touching the bar.
- Shards fall from broken crystals: **W** wide bar, **M** multiball, **S** slow spark, **L** laser cannons, **G** guard shield, **E** extra spark.
- Score, best score (saved in the browser), level progress, combo meter and lives on the HUD; title, pause, victory and game-over screens, all with restart.
- Screenshots are real renders of the game's own code: each `?shot=` scene plays the real rules forward from a seed (`shots.json` lists them).

## Layout

- `game/index.html` + `game/src/` — the game: `config.js` (tuning), `world.js` (rules), `render.js` (drawing), `input.js`, `audio.js`, `levels.js`, `random.js`, `shots.js`, `main.js`
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — a tiny static server for local play
- `screenshots/` — 3–4 real captures of the game running

---

Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards
