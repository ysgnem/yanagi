import { isMain, startBot } from '../../core/runtime.js';
import { loadModules } from '../module-loader.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));

export async function startTts() {
  const [commands, featureFactories] = await Promise.all([
    loadModules(path.join(directory, 'commands')),
    loadModules(path.join(directory, 'features')),
  ]);
  if (featureFactories.some((createFeature) => typeof createFeature !== 'function'))
    throw new TypeError('TTS feature modules must default-export a factory function');
  const features = await Promise.all(featureFactories.map((createFeature) => createFeature()));

  return startBot({
    botName: 'tts-bot',
    tokenEnv: 'TTS_BOT_TOKEN',
    multiTokenEnv: 'TTS_BOT_TOKENS',
    commands,
    intents: features.flatMap((feature) => feature.intents ?? []),
    ...Object.assign({}, ...features.map((feature) => feature.context ?? {})),
    onShutdown: () => {
      features.forEach((feature) => feature.onShutdown?.());
    },
  });
}

if (isMain(import.meta.url)) await startTts();
