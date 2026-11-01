import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Minaseポイントランキングを表示します'),
  async execute(i, { repository: repo }) {
    if (!i.guildId) return i.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const rows = repo.top(i.guildId, 10);
    const desc = rows.length
      ? rows
          .map(
            (row, index) =>
              `**${index + 1}.** <@${row.userId}> — ${row.balance.toLocaleString('ja-JP')} pt`,
          )
          .join('\n')
      : 'まだランキングデータがありません。';
    return i.reply({
      embeds: [
        new EmbedBuilder().setTitle('🏆 Minaseランキング').setDescription(desc).setColor(0x5865f2),
      ],
    });
  },
};
