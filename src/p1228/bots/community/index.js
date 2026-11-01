import { GatewayIntentBits } from 'discord.js';
import { isMain, startBot } from '../../core/runtime.js';
import { loadModules } from '../module-loader.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));

export async function startCommunity() {
  const [cmds, factories] = await Promise.all([
    loadModules(path.join(dir, 'commands')),
    loadModules(path.join(dir, 'features')),
  ]);
  if (factories.some((create) => typeof create !== 'function'))
    throw new TypeError('Community feature modules must default-export a factory function');
  const feats = await Promise.all(factories.map((create) => create()));
  const joinFns = feats.map((feat) => feat.onMemberJoin).filter((handler) => handler !== undefined);

  return startBot({
    botName: 'community-bot',
    tokenEnv: 'COMMUNITY_BOT_TOKEN',
    multiTokenEnv: 'COMMUNITY_BOT_TOKENS',
    intents: feats.flatMap((feat) => feat.intents ?? []),
    commands: cmds,
    ...Object.assign({}, ...feats.map((feat) => feat.context ?? {})),
    ...(joinFns.length
      ? {
          onMemberJoin: async (member, ctx) =>
            Promise.all(joinFns.map((handler) => handler(member, ctx))),
        }
      : {}),
  });
}

if (isMain(import.meta.url)) await startCommunity();
