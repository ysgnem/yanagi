import { isMain, startBot } from '../../core/runtime.js';
import { loadModules } from '../module-loader.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));

export async function startTts() {
  const [cmds, factories] = await Promise.all([
    loadModules(path.join(dir, 'commands')),
    loadModules(path.join(dir, 'features')),
  ]);
  if (factories.some((create) => typeof create !== 'function'))
    throw new TypeError('TTS feature modules must default-export a factory function');
  const feats = await Promise.all(factories.map((create) => create()));

  return startBot({
    botName: 'tts-bot',
    tokenEnv: 'TTS_BOT_TOKEN',
    multiTokenEnv: 'TTS_BOT_TOKENS',
    commands: cmds,
    intents: feats.flatMap((feat) => feat.intents ?? []),
    ...Object.assign({}, ...feats.map((feat) => feat.context ?? {})),
    onShutdown: () => {
      feats.forEach((feat) => feat.onShutdown?.());
    },
  });
}

if (isMain(import.meta.url)) await startTts();
