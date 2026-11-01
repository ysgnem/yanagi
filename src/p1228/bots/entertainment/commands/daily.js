import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('1日1回、デイリー報酬を受け取ります'),
  async execute(i, { repository: repo, startBalance, dailyReward }) {
    if (!i.guildId) return i.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    repo.ensureAccount(i.guildId, i.user.id, startBalance);
    try {
      const amount = repo.claim(i.guildId, i.user.id, dailyReward, 'entertainment-daily');
      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('デイリー報酬を受け取りました')
            .setColor(0x57f287)
            .addFields(
              {
                name: '獲得コイン',
                value: `+${dailyReward.toLocaleString('ja-JP')}`,
                inline: true,
              },
              {
                name: '現在の残高',
                value: `${amount.toLocaleString('ja-JP')} コイン`,
                inline: true,
              },
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
