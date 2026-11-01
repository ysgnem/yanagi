import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('自分のMinaseポイントを確認します'),
  async execute(interaction, { repository }) {
    if (!interaction.guildId)
      return interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const value = repository.balance(interaction.guildId, interaction.user.id);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Minaseポイント残高')
          .addFields({ name: '現在の残高', value: `**${value.toLocaleString('ja-JP')} pt**` })
          .setColor(0x5865f2),
      ],
      ephemeral: true,
    });
  },
};
