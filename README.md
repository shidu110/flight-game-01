# Kestrel Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/shidu110/flight-game-01/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/shidu110/flight-game-01/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)


Fly the fictional Kestrel K-1 through a warm, low-poly archipelago at sunset. Choose Island Hopper, a 60% tank Fuel Run, or the elevated Ridge Crosswind course with a steady 7 m/s west wind. Start cold on the 600 m island strip, thread ten ordered rings, then nurse your fuel and hull home. Land and stop to refuel and repair, or press F to explore freely. An ivory and navy bush plane, six backlit cockpit instruments, coastal landmarks, animated water, real shadows and WebAudio all run from local files.

| Control | Action |
| --- | --- |
| Enter / Begin Sortie | Start; Enter returns to flight dispatch after success |
| Arrow keys / sortie buttons in briefing | Select one of three flight plans; the map updates with the route |
| Up / Down | Raise / lower the nose |
| Left / Right | Roll left / right; banking turns the aircraft |
| A / D | Rudder left / right; steer during the takeoff roll |
| Shift or W / Ctrl or S | Increase / decrease throttle |
| C | Cycle chase, cockpit and tower flyby cameras |
| Mouse drag | Look around in cockpit; release to recenter |
| F | Toggle free flight and hide / restore course rings |
| M | Mute / unmute sound |
| R / Restart Sortie | Restart the active sortie, including after a crash |

Run with Node 22.18 or newer:

```sh
node serve.ts
```

Open `http://localhost:8080` in desktop Chrome. No install, build step or network access is needed to play. The engine is off at the briefing. After starting, hold Shift until the throttle reaches full, accelerate past 30 m/s (58 kt), and gently hold Up to rotate. Aim for about 80–100 kt on the course. Below 26 m/s (51 kt) the wing stalls. To land, align with the dark runway, reduce throttle, descend gently with wings level, then idle the engine to stop. The landing gear stays down.

Completed sorties earn a debrief medal using all ten rings, elapsed flight time and hull remaining **before arrival repairs**. GOLD requires at least 90% hull within par; SILVER requires 75% hull within 125% of par; BRONZE requires 50% hull within 150% of par; otherwise the award is COMPLETE. Par is 5:00 for Island Hopper and Fuel Run, and 6:00 for Ridge Crosswind. Next Sortie advances through the three flights cyclically and returns to the briefing, where each flight plan shows its best medal for this session (no storage APIs). Shoreline shallows carry two softly scrolling, warm-tinted caustic layers sampled from a single 128 × 128 canvas tile in the existing shore draw, with no extra lights.

The deterministic camera queries are listed in `shots.json`. Seed 7 stages a 14° banked cockpit cover, lighthouse coast chase, low-fuel final with damage smoke, and close apron briefing. Shot mode freezes simulation and visual animation at time zero, draws cockpit instruments once, and renders even when unfocused. The controls strip stays visible in every camera and state, with crash and debrief overlays ending above its bottom 28 px. Below 25% fuel the HUD and cockpit lamps warn you; hull below 80% produces a faint engine smoke trail. The current `screenshots/` files are the earlier **v1** captures and must be replaced with fresh v2 browser captures before submission. Capture 3–4 real game renders there, each JPEG or PNG with a short side of at least 480 px, a long side no larger than 1280 px, and a file size no larger than 256 KiB.

For this addendum pass, Muse captures screenshots externally. Do not run a browser, headless Chrome or a visual self-check in the sandbox; keep validation to lightweight, sequential code checks.

After capturing screenshots, generate the hand-in:

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the chosen output directory and builds the canonical dossier using the unchanged kit library. The default output path is `/output`. `build/` and `out/` are local scratch artifacts and are outside the game hand-in. The v1 build record is in `build/REPORT.md`; the overhaul and validation record is in `build/REPORT-v2.md`.
