# Kestrel Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/shidu110/flight-game-01/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/shidu110/flight-game-01/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)


Fly the fictional Kestrel K-1 through a warm, low-poly archipelago at sunset. Start cold on a 600 m island runway, raise the throttle, climb through ten glowing course rings, then nurse your fuel and hull home for a landing. A complete sortie earns ring points and a time bonus; stop on the runway for fuel and repairs, or press F and explore freely. The handcrafted bush plane, six illuminated cockpit instruments, procedural terrain, water, clouds and WebAudio sound all run from local files.

| Control | Action |
| --- | --- |
| Enter / Begin Sortie | Start; Enter also starts the next sortie after success |
| Up / Down | Raise / lower the nose |
| Left / Right | Roll left / right; banking turns the aircraft |
| A / D | Rudder left / right; steer during the takeoff roll |
| Shift or W / Ctrl or S | Increase / decrease throttle |
| C | Cycle chase, cockpit and tower flyby cameras |
| Mouse drag | Look around in cockpit; release to recenter |
| F | Toggle free flight and hide / restore course rings |
| M | Mute / unmute sound |
| R / Restart Sortie | Restart after a crash |

Run with Node 22.18 or newer:

```sh
node serve.ts
```

Open `http://localhost:8080` in desktop Chrome. No install, build step or network access is needed to play. The engine is off at the briefing. After starting, hold Shift until the throttle reaches full, accelerate past 30 m/s (58 kt), and gently hold Up to rotate. Aim for about 80–100 kt on the course. Below 26 m/s (51 kt) the wing stalls. To land, align with the dark runway, reduce throttle, descend gently with wings level, then idle the engine to stop. The landing gear stays down.

The deterministic camera queries are listed in `shots.json`. Seed 7 stages the cover cockpit, banking chase, short final and scenic briefing views while keeping the water, clouds, propeller and instruments animated. `screenshots/` is intentionally empty for the later capture pass. Capture 3–4 real game renders there, each JPEG or PNG with a short side of at least 480 px, a long side no larger than 1280 px, and a file size no larger than 256 KiB.

After capturing screenshots, generate the hand-in:

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the chosen output directory and builds the canonical dossier using the unchanged kit library. The default output path is `/output`. `build/` and `out/` are local scratch artifacts and are outside the game hand-in. The local build and validation record is in `build/REPORT.md`.
