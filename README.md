# Coral Shore

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/kriptmwan/coral-shore/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/kriptmwan/coral-shore/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Coral Shore** — a GTA 6-style open-world crime game, built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

Mara Voss is back in Coral Shore. Two districts (Downtown glass, Beachfront sand and ocean), traffic and pedestrians, cars to steal and drive, a 0–5 star wanted level with VCPD pursuit cars, roadblocks and a searchlight helicopter, 8 story missions, 3 radio stations, a weapon wheel, a 3-tier garage, and a save system.

## Play

Serve `game/` and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

- **WASD** move / drive, **mouse** aim, **click** shoot
- **E** enter car, **F** steal car, **Q** weapon wheel, **R** radio
- **G** garage (near the garage), **M** next mission, **P** pause

## Build

`main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and writes `dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
