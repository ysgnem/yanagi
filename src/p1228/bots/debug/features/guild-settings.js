import { GatewayIntentBits } from 'discord.js';

export default function createGuildSettingsFeature() {
  return {
    intents: [GatewayIntentBits.Guilds],
    requireTestGuild: true,
  };
}
