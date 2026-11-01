import { isMain, startBot } from '../../core/runtime.js';
import { loadModules } from '../module-loader.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));

export async function startMusic() {
  const [commands, featureFactories] = await Promise.all([
    loadModules(path.join(directory, 'commands')),
    loadModules(path.join(directory, 'features')),
  ]);
  if (featureFactories.some((createFeature) => typeof createFeature !== 'function'))
    throw new TypeError('Music feature modules must default-export a factory function');
  const features = await Promise.all(featureFactories.map((createFeature) => createFeature()));

  return startBot({
    botName: 'music-bot',
    tokenEnv: 'MUSIC_BOT_TOKEN',
    multiTokenEnv: 'MUSIC_BOT_TOKENS',
    commands,
    intents: features.flatMap((feature) => feature.intents ?? []),
    ...Object.assign({}, ...features.map((feature) => feature.context ?? {})),
  });
}

if (isMain(import.meta.url)) await startMusic();
