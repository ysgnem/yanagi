import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('ping').setDescription('🏓ボットの応答速度を確認します'),
  async execute(i, { client }) {
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(0x5865f2)
      .addFields({ name: '応答速度', value: `\`${Math.round(client.ws.ping)} ms\`` });
    return i.reply({ embeds: [embed] });
  },
};
