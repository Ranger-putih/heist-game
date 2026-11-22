// The Quiet Vault — the hand-in program (Node 22, standard library only).
//
// It gathers this repository's game/ and screenshots/ into the output
// directory the grader provides and writes dossier.json there, using the
// vendored make.fun library so the dossier is exactly what the scorer
// rebuilds. Run it twice and the two outputs are byte for byte the same:
// nothing here reads the clock, the network or a random source.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Before the screenshots are taken the dossier cannot be built: the kit's
// library refuses an entry with no cover image. Tolerate that state during
// development (copy game/ and exit cleanly) instead of failing the run; the
// submitted commit always carries 3–4 screenshots, so the grader's two runs
// always take the dossier path below.
const shotDir = join(repoRoot, 'screenshots');
const hasShots =
  existsSync(shotDir) && readdirSync(shotDir).some((name) => !name.startsWith('.'));
if (!hasShots) {
  console.warn('main.ts: no screenshots yet, dossier.json skipped');
  process.exit(0);
}

// The scorer's caps, as the kit states them: the text budget shapes the
// dossier's bytes, the rest refuse an entry the scorer would refuse — more
// than 4 screenshots or one over 256 KiB, more than 993 entries in game/,
// more than 48 MiB of game files, or a game path over 1000 bytes.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
