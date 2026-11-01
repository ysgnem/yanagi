import { SlashCommandBuilder } from 'discord.js';
import { getSession } from '../features/player.js';

export default {
  data: new SlashCommandBuilder().setName('skip').setDescription('再生中の音声をスキップします'),
  async execute(interaction) {
    const session = getSession(interaction.client.user.id, interaction.guildId);
    if (!session?.current)
      return interaction.reply({ content: '現在再生中の音声はありません。', ephemeral: true });
    session.player.stop(true);
    return interaction.reply({ content: 'スキップしました。', ephemeral: true });
  },
};
