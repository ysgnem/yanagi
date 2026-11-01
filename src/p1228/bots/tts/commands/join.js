import { SlashCommandBuilder } from 'discord.js';
import { ensureSession } from '../features/voice.js';

export default {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('実行者のボイスチャンネルに参加します'),
  async execute(interaction) {
    try {
      const session = await ensureSession(interaction);
      return interaction.reply({
        content: `<#${session.channelId}> に接続しました。`,
        ephemeral: true,
      });
    } catch (error) {
      return interaction.reply({ content: error.message, ephemeral: true });
    }
  },
};
