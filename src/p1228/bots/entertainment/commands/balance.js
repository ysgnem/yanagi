import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('自分のEntertainment通貨残高を確認します'),
  async execute(interaction, { repository, startBalance }) {
    if (!interaction.guildId)
      return interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    repository.ensureAccount(interaction.guildId, interaction.user.id, startBalance);
    const amount = repository.balance(interaction.guildId, interaction.user.id);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Entertainment残高')
          .setColor(0x5865f2)
          .addFields({ name: '現在の残高', value: `**${amount.toLocaleString('ja-JP')} コイン**` }),
      ],
      ephemeral: true,
    });
  },
};
