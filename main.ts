import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const sourceRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
mkdirSync(outputRoot, { recursive: true });
for (const directory of ['game', 'screenshots']) {
  cpSync(join(sourceRoot, directory), join(outputRoot, directory), { recursive: true });
}
const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputRoot, 'dossier.json'), dossier);
console.log(`Kestrel Run handed in to ${outputRoot}`);
