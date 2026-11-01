import { SlashCommandBuilder } from 'discord.js';
import { getSession } from '../features/player.js';

export default {
  data: new SlashCommandBuilder().setName('skip').setDescription('再生中の音声をスキップします'),
  async execute(i) {
    const session = getSession(i.client.user.id, i.guildId);
    if (!session?.current)
      return i.reply({ content: '現在再生中の音声はありません。', ephemeral: true });
    session.player.stop(true);
    return i.reply({ content: 'スキップしました。', ephemeral: true });
  },
};
