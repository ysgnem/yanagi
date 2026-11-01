import { SlashCommandBuilder } from 'discord.js';
import { disposeSession, sessionKey, sessions } from '../features/voice.js';

export default {
  data: new SlashCommandBuilder().setName('leave').setDescription('ボイスチャンネルから退出します'),
  async execute(interaction) {
    const key = sessionKey(interaction.client.user.id, interaction.guildId);
    const session = sessions.get(key);
    if (session) await disposeSession(key, session);
    return interaction.reply({ content: '退出しました。', ephemeral: true });
  },
};
