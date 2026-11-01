import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('lottery').setDescription('1日1回の宝くじに参加します'),
  async execute(interaction, { repository, startBalance, lotteryCost }) {
    if (!interaction.guildId)
      return interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const outcomes = [
      [0, 65],
      [50, 25],
      [150, 9],
      [1000, 1],
    ];
    const totalWeight = outcomes.reduce((sum, item) => sum + item[1], 0);
    let roll = Math.random() * totalWeight;
    let payout = 0;
    for (const [amount, weight] of outcomes) {
      roll -= weight;
      if (roll < 0) {
        payout = amount;
        break;
      }
    }
    try {
      const amount = repository.lottery(
        interaction.guildId,
        interaction.user.id,
        lotteryCost,
        payout,
        startBalance,
      );
      const result = payout
        ? `当選！ ${payout.toLocaleString('ja-JP')} コイン`
        : '残念、今回はハズレです。';
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('宝くじの結果')
            .setDescription(result)
            .setColor(payout ? 0xfee75c : 0x5865f2)
            .addFields(
              {
                name: '参加費',
                value: `${lotteryCost.toLocaleString('ja-JP')} コイン`,
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
            ? '今日は既に宝くじに参加済みです。'
            : error.message,
        ephemeral: true,
      });
    }
  },
};
