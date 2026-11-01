import {
  Client,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActivityType,
  GatewayIntentBits,
} from 'discord.js';
import { parseTokens, commonSettings } from './config.js';
import { createLogger } from './logging.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const shutdownCbs = new Set();
let shutdownInit = false;
function registerShutdown(cb) {
  shutdownCbs.add(cb);
  if (shutdownInit) return;
  shutdownInit = true;
  const shutdown = () => {
    for (const cleanup of shutdownCbs) {
      try {
        cleanup();
      } catch (err) {
        process.stderr.write(`Shutdown cleanup failed: ${String(err)}\n`);
      }
    }
    shutdownCbs.clear();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

const baseCmds = [
  {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('このBotの利用可能なコマンドを表示します'),
    async execute(i, ctx) {
      const lines = ctx.commands
        .filter((cmd) => !ctx.disabled.has(cmd.data.name))
        .map((cmd) => `\`/${cmd.data.name}\` — ${cmd.data.description}`);
      const embed = new EmbedBuilder()
        .setTitle(`${ctx.botName} | 利用可能なコマンド`)
        .setDescription(lines.join('\n') || '現在利用可能なコマンドはありません。')
        .setColor(0x5865f2);
      await i.reply({ embeds: [embed], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('feature')
      .setDescription('スラッシュコマンドの有効・無効を切り替えます')
      .addStringOption((opt) =>
        opt.setName('name').setDescription('対象コマンド名').setRequired(true),
      )
      .addBooleanOption((opt) =>
        opt.setName('enabled').setDescription('有効にする場合はTrue').setRequired(true),
      ),
    async execute(i, ctx) {
      if (!i.memberPermissions?.has(PermissionFlagsBits.Administrator))
        return i.reply({ content: 'サーバー管理者のみ実行できます。', ephemeral: true });
      const name = i.options.getString('name', true);
      if (!ctx.commandMap.has(name) || ['help', 'feature'].includes(name))
        return i.reply({ content: 'そのコマンドは見つかりません。', ephemeral: true });
      const enabled = i.options.getBoolean('enabled', true);
      if (enabled) ctx.disabled.delete(name);
      else ctx.disabled.add(name);
      return i.reply({
        content: `\`/${name}\` を${enabled ? '有効' : '無効'}にしました。`,
        ephemeral: true,
      });
    },
  },
];

function uptimeText(startedAt) {
  let sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const days = Math.floor(sec / 86400);
  sec %= 86400;
  const hours = Math.floor(sec / 3600);
  sec %= 3600;
  const minutes = Math.floor(sec / 60);
  return `${days}日${hours}時間${minutes}分`;
}

export async function startBot({
  botName,
  tokenEnv,
  multiTokenEnv,
  commands: cmds = [],
  intents = [],
  setup,
  onMemberJoin,
  onShutdown,
  requireTestGuild = false,
  ...sharedCtx
}) {
  const cfg = commonSettings();
  if (requireTestGuild && !cfg.testGuildId)
    throw new Error(`${botName} requires DISCORD_TEST_GUILD_ID`);
  const tokens = parseTokens(multiTokenEnv, tokenEnv);
  if (!tokens.length)
    throw new Error(`No token configured for ${botName}. Set ${tokenEnv} or ${multiTokenEnv}.`);
  const allCmds = [...baseCmds, ...cmds];
  const cmdMap = new Map(allCmds.map((cmd) => [cmd.data.name, cmd]));
  if (cmdMap.size !== allCmds.length)
    throw new Error(`${botName} has duplicate slash command names`);

  const clients = tokens.map((token, index) => {
    const logger = createLogger(`${botName}-${index + 1}`, cfg.logDir, cfg.logLevel);
    const client = new Client({ intents: [...new Set([GatewayIntentBits.Guilds, ...intents])] });
    const ctx = {
      botName,
      logger,
      ...sharedCtx,
      client,
      commands: allCmds,
      commandMap: cmdMap,
      disabled: new Set(),
      startedAt: Date.now(),
    };
    let timer;

    client.once(Events.ClientReady, async (ready) => {
      try {
        logger.info('起動進捗 85% | Discord Gateway接続完了', {
          user: ready.user.tag,
          instance: index + 1,
          total: tokens.length,
        });
        const rest = new REST({ version: '10' }).setToken(token);
        const body = allCmds.map((cmd) => cmd.data.toJSON());
        if (cfg.testGuildId)
          await rest.put(Routes.applicationGuildCommands(ready.user.id, cfg.testGuildId), {
            body,
          });
        else await rest.put(Routes.applicationCommands(ready.user.id), { body });
        logger.info('Slash commands registered', {
          count: body.length,
          scope: cfg.testGuildId ? 'guild' : 'global',
        });
        let toggle = false;
        const setPresence = () => {
          const name = toggle
            ? `🌟稼働：${uptimeText(ctx.startedAt)}`
            : `🏓PING：${Math.round(ready.ws.ping)} ms`;
          toggle = !toggle;
          ready.user.setPresence({
            activities: [{ name, type: ActivityType.Watching }],
            status: 'online',
          });
        };
        setPresence();
        timer = setInterval(setPresence, 15000);
        await setup?.(client, ctx);
        logger.info('起動完了');
      } catch (err) {
        logger.error('Ready hook failed', { error: err.stack ?? String(err) });
      }
    });

    client.on(Events.InteractionCreate, async (i) => {
      if (!i.isChatInputCommand()) return;
      const cmd = cmdMap.get(i.commandName);
      if (!cmd) return;
      if (ctx.disabled.has(cmd.data.name))
        return i
          .reply({
            content: `\`/${cmd.data.name}\` は現在無効化されています。`,
            ephemeral: true,
          })
          .catch(() => {});
      try {
        await cmd.execute(i, ctx);
      } catch (err) {
        logger.error('Slash command failed', {
          command: i.commandName,
          error: err.stack ?? String(err),
        });
        const msg = 'コマンドの実行中にエラーが発生しました。管理者はBotログを確認してください。';
        if (i.deferred || i.replied)
          await i.followUp({ content: msg, ephemeral: true }).catch(() => {});
        else await i.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    });

    if (onMemberJoin)
      client.on(Events.GuildMemberAdd, (member) =>
        onMemberJoin(member, ctx).catch((err) =>
          logger.error('Member join handler failed', { error: String(err) }),
        ),
      );
    client.on(Events.Error, (err) =>
      logger.error('Discord client error', { error: err.stack ?? String(err) }),
    );
    client.once(Events.ClientReady, () => logger.info(`Connected as ${client.user.tag}`));
    client.on(Events.ShardDisconnect, () => logger.warn('Discord Gateway disconnected'));
    client.on(Events.ShardReconnecting, () => logger.info('Reconnecting to Discord Gateway'));
    client.on(Events.ClientReady, () => {});
    client
      .login(token)
      .catch((err) => logger.error('Login failed', { error: err.stack ?? String(err) }));
    client.once(Events.ClientReady, () => {});
    registerShutdown(() => {
      if (timer) clearInterval(timer);
      client.destroy();
    });
    return client;
  });
  if (onShutdown) registerShutdown(onShutdown);
  return clients;
}

export function isMain(modUrl) {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(modUrl);
}
