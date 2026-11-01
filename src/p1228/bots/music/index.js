import { isMain, startBot } from '../../core/runtime.js';
import { loadModules } from '../module-loader.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));

export async function startMusic() {
  const [cmds, factories] = await Promise.all([
    loadModules(path.join(dir, 'commands')),
    loadModules(path.join(dir, 'features')),
  ]);
  if (factories.some((create) => typeof create !== 'function'))
    throw new TypeError('Music feature modules must default-export a factory function');
  const feats = await Promise.all(factories.map((create) => create()));

  return startBot({
    botName: 'music-bot',
    tokenEnv: 'MUSIC_BOT_TOKEN',
    multiTokenEnv: 'MUSIC_BOT_TOKENS',
    commands: cmds,
    intents: feats.flatMap((feat) => feat.intents ?? []),
    ...Object.assign({}, ...feats.map((feat) => feat.context ?? {})),
  });
}

if (isMain(import.meta.url)) await startMusic();
