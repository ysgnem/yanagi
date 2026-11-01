import { GatewayIntentBits } from 'discord.js';
import { env } from '../../../core/config.js';

function snowflake(name, optional = true) {
  const value = env(name);
  if (!value && optional) return null;
  if (!/^\d{5,25}$/.test(value))
    throw new TypeError(`${name} must be a positive Discord snowflake ID`);
  return value;
}

export default function createAutoroleFeature() {
  const memberRole = snowflake('COMMUNITY_MEMBER_ROLE_ID');
  const botRole = snowflake('COMMUNITY_BOT_ROLE_ID');
  const alertChannel = snowflake('COMMUNITY_ROLE_ALERT_CHANNEL_ID');
  const blacklist = new Set(
    env('COMMUNITY_AUTO_ROLE_BLACKLIST_USER_IDS')
      .split(/[\r\n,]+/u)
      .map((value) => value.trim())
      .filter(Boolean),
  );
  for (const id of blacklist)
    if (!/^\d{5,25}$/.test(id))
      throw new TypeError('COMMUNITY_AUTO_ROLE_BLACKLIST_USER_IDS must contain Discord snowflakes');
  if (Boolean(memberRole) !== Boolean(botRole))
    throw new Error('Community auto-role requires both member and bot role IDs.');
  if (blacklist.size && !alertChannel)
    throw new Error('COMMUNITY_ROLE_ALERT_CHANNEL_ID is required when blacklist is enabled.');

  const autorole = { memberRole, botRole, alertChannel, blacklist };
  return {
    intents: [...(memberRole || blacklist.size ? [GatewayIntentBits.GuildMembers] : [])],
    context: { autorole },
    async onMemberJoin(member, { logger }) {
      if (blacklist.has(member.id)) {
        try {
          const channel = await member.guild.channels.fetch(alertChannel);
          await channel?.send(
            `⚠️ ブラックリスト対象の参加を検知しました: ${member} (\`${member.id}\`)`,
          );
        } catch (error) {
          logger.error('Blacklist alert failed; role assignment remains blocked', {
            error: String(error),
            userId: member.id,
          });
        }
        return;
      }
      const roleId = member.user.bot ? botRole : memberRole;
      if (!roleId) return;
      try {
        const role = await member.guild.roles.fetch(roleId);
        if (!role)
          return logger.error('Configured auto-role does not exist', {
            roleId,
            guildId: member.guild.id,
          });
        await member.roles.add(role, 'p1228 Community auto-role');
      } catch (error) {
        logger.error('Could not assign community auto-role', {
          error: String(error),
          userId: member.id,
          roleId,
        });
      }
    },
  };
}
