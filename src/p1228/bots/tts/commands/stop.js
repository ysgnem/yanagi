import { SlashCommandBuilder } from 'discord.js';
import { sessionKey, sessions } from '../features/voice.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('読み上げを停止してキューを消去します'),
  async execute(interaction) {
    const session = sessions.get(sessionKey(interaction.client.user.id, interaction.guildId));
    if (session) {
      for (const controller of session.pendingRequests) controller.abort();
      session.queue.length = 0;
      session.player.stop(true);
    }
    return interaction.reply({ content: '読み上げを停止しました。', ephemeral: true });
  },
};
