import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('1日1回、デイリー報酬を受け取ります'),
  async execute(interaction, { repository, startBalance, dailyReward }) {
    if (!interaction.guildId)
      return interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    repository.ensureAccount(interaction.guildId, interaction.user.id, startBalance);
    try {
      const amount = repository.claim(
        interaction.guildId,
        interaction.user.id,
        dailyReward,
        'entertainment-daily',
      );
      return interaction.reply({
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
    } catch (error) {
      return interaction.reply({
        content:
          error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
            ? '今日は既に受け取り済みです。'
            : error.message,
        ephemeral: true,
      });
    }
  },
};
