import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('1日1回、Minaseポイントを受け取ります'),
  async execute(i, { repository: repo, dailyReward }) {
    if (!i.guildId) return i.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    try {
      const amount = repo.claim(i.guildId, i.user.id, dailyReward, 'minase-daily');
      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('デイリー報酬を受け取りました')
            .setColor(0x57f287)
            .addFields(
              {
                name: '獲得ポイント',
                value: `+${dailyReward.toLocaleString('ja-JP')} pt`,
                inline: true,
              },
              { name: '現在の残高', value: `${amount.toLocaleString('ja-JP')} pt`, inline: true },
            ),
        ],
      });
    } catch (err) {
      return i.reply({
        content:
          err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
            ? '今日は既に受け取り済みです。'
            : err.message,
        ephemeral: true,
      });
    }
  },
};
