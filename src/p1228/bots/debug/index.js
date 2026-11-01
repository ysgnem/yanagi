import { isMain, startBot } from '../../core/runtime.js';
import { loadModules } from '../module-loader.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));

export async function startDebug() {
  const [cmds, factories] = await Promise.all([
    loadModules(path.join(dir, 'commands')),
    loadModules(path.join(dir, 'features')),
  ]);
  if (factories.some((create) => typeof create !== 'function'))
    throw new TypeError('Debug feature modules must default-export a factory function');
  const feats = await Promise.all(factories.map((create) => create()));

  return startBot({
    botName: 'debug-bot',
    tokenEnv: 'DEBUG_BOT_TOKEN',
    multiTokenEnv: 'DEBUG_BOT_TOKENS',
    commands: cmds,
    ...Object.assign({}, ...feats),
  });
}

if (isMain(import.meta.url)) await startDebug();
