import { SlashCommandBuilder } from 'discord.js';
import { disposeSession, sessionKey, sessions } from '../features/voice.js';

export default {
  data: new SlashCommandBuilder().setName('leave').setDescription('ボイスチャンネルから退出します'),
  async execute(i) {
    const key = sessionKey(i.client.user.id, i.guildId);
    const session = sessions.get(key);
    if (session) await disposeSession(key, session);
    return i.reply({ content: '退出しました。', ephemeral: true });
  },
};
