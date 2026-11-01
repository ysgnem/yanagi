import { SlashCommandBuilder } from 'discord.js';
import { sessionKey, sessions } from '../features/voice.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('読み上げを停止してキューを消去します'),
  async execute(i) {
    const session = sessions.get(sessionKey(i.client.user.id, i.guildId));
    if (session) {
      for (const abortCtl of session.pendingRequests) abortCtl.abort();
      session.queue.length = 0;
      session.player.stop(true);
    }
    return i.reply({ content: '読み上げを停止しました。', ephemeral: true });
  },
};
