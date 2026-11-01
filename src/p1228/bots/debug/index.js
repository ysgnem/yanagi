import { isMain, startBot } from '../../core/runtime.js';
import { loadModules } from '../module-loader.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));

export async function startDebug() {
  const [commands, featureFactories] = await Promise.all([
    loadModules(path.join(directory, 'commands')),
    loadModules(path.join(directory, 'features')),
  ]);
  if (featureFactories.some((createFeature) => typeof createFeature !== 'function'))
    throw new TypeError('Debug feature modules must default-export a factory function');
  const features = await Promise.all(featureFactories.map((createFeature) => createFeature()));

  return startBot({
    botName: 'debug-bot',
    tokenEnv: 'DEBUG_BOT_TOKEN',
    multiTokenEnv: 'DEBUG_BOT_TOKENS',
    commands,
    ...Object.assign({}, ...features),
  });
}

if (isMain(import.meta.url)) await startDebug();
