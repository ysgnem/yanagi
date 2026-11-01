import { SlashCommandBuilder } from 'discord.js';
import { ensureSession } from '../features/voice.js';

export default {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('実行者のボイスチャンネルに参加します'),
  async execute(i) {
    try {
      const session = await ensureSession(i);
      return i.reply({
        content: `<#${session.channelId}> に接続しました。`,
        ephemeral: true,
      });
    } catch (err) {
      return i.reply({ content: err.message, ephemeral: true });
    }
  },
};
