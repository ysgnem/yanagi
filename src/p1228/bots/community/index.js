import { GatewayIntentBits } from 'discord.js';
import { isMain, startBot } from '../../core/runtime.js';
import { loadModules } from '../module-loader.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));

export async function startCommunity() {
  const [commands, featureFactories] = await Promise.all([
    loadModules(path.join(directory, 'commands')),
    loadModules(path.join(directory, 'features')),
  ]);
  if (featureFactories.some((createFeature) => typeof createFeature !== 'function'))
    throw new TypeError('Community feature modules must default-export a factory function');
  const features = await Promise.all(featureFactories.map((createFeature) => createFeature()));
  const memberJoinHandlers = features
    .map((feature) => feature.onMemberJoin)
    .filter((handler) => handler !== undefined);

  return startBot({
    botName: 'community-bot',
    tokenEnv: 'COMMUNITY_BOT_TOKEN',
    multiTokenEnv: 'COMMUNITY_BOT_TOKENS',
    intents: features.flatMap((feature) => feature.intents ?? []),
    commands,
    ...Object.assign({}, ...features.map((feature) => feature.context ?? {})),
    ...(memberJoinHandlers.length
      ? {
          onMemberJoin: async (member, context) =>
            Promise.all(memberJoinHandlers.map((handler) => handler(member, context))),
        }
      : {}),
  });
}

if (isMain(import.meta.url)) await startCommunity();
