import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Minaseポイントランキングを表示します'),
  async execute(interaction, { repository }) {
    if (!interaction.guildId)
      return interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const rows = repository.top(interaction.guildId, 10);
    const description = rows.length
      ? rows
          .map(
            (row, index) =>
              `**${index + 1}.** <@${row.userId}> — ${row.balance.toLocaleString('ja-JP')} pt`,
          )
          .join('\n')
      : 'まだランキングデータがありません。';
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🏆 Minaseランキング')
          .setDescription(description)
          .setColor(0x5865f2),
      ],
    });
  },
};
