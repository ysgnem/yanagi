import { isMain, startBot } from '../../core/runtime.js';
import { loadModules } from '../module-loader.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));

export async function startEntertainment() {
  const [commands, featureFactories] = await Promise.all([
    loadModules(path.join(directory, 'commands')),
    loadModules(path.join(directory, 'features')),
  ]);
  if (featureFactories.some((createFeature) => typeof createFeature !== 'function'))
    throw new TypeError('Entertainment feature modules must default-export a factory function');
  const features = await Promise.all(featureFactories.map((createFeature) => createFeature()));

  return startBot({
    botName: 'entertainment-bot',
    tokenEnv: 'ENTERTAINMENT_BOT_TOKEN',
    multiTokenEnv: 'ENTERTAINMENT_BOT_TOKENS',
    commands,
    ...Object.assign({}, ...features.map((feature) => feature.context ?? {})),
    onShutdown: () => {
      features.forEach((feature) => feature.onShutdown?.());
    },
  }).catch((error) => {
    features.forEach((feature) => feature.onShutdown?.());
    throw error;
  });
}

if (isMain(import.meta.url)) await startEntertainment();
