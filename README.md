# The Quiet Vault

[![Competition](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/Ranger-putih/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/Ranger-putih/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

A top-down stealth heist game for the [best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559). After closing time, one thief slips into the bank's vault hall to lift three pieces — the blueprints, the gold bars, and the Marrow Diamond — then slip out the green exit before the alarm hits 100%.

The whole arena fits in one frame: the vault hall with its safes and statue, three patrolling guards with vision cones, two sweeping CCTV cameras, the loot, and the alarm meter up top.

## How to play

Serve the game locally and open it in desktop Chrome:

```sh
node serve.ts
# http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Sneak (slower, harder to spot) |
| E | Grab loot when close |
| Q or mouse click | Throw a noise-maker at the mouse — guards go investigate (2×) |
| F | EMP — shuts both cameras down for 5 seconds (1×) |
| R | Restart after a win or a capture |

Hide behind safes and pillars, cross the shadow patches, and read the cones before you move. A guard who glimpses you shows `?` and stops to stare; a sure guard shows `!` and gives chase. Cameras sweep on their own — an EMP is the only way past them unseen. Get caught by a guard's hands, or let the alarm reach 100%, and the run is over.

## Files

- `game/` — the playable game, plain static files, no network requests, no libraries
  - `game/index.html` — the page, 1280×720 canvas
  - `game/src/config.js` — tuning numbers and palette
  - `game/src/input.js` — keyboard and mouse state
  - `game/src/world.js` — the bank floor: walls, cover, shadows, loot, exits, line of sight
  - `game/src/guards.js` — patrol, suspicion, chase, and noise investigation
  - `game/src/cameras.js` — sweeping CCTV cones and the EMP shutdown
  - `game/src/audio.js` — procedural WebAudio: tense drone, alarm blips, loot chimes
  - `game/src/render.js` — everything drawn each frame, including the HUD
  - `game/src/main.js` — the game loop and the rules of the heist
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library
- `vendor/makefun-game.ts` — the kit's library, unchanged
- `screenshots/` — renders of the game itself

Built for make.fun — [try it yourself](https://make.fun/r/6r5bjdgf).

## License

MIT — see [LICENSE](LICENSE).
