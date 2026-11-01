import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('lottery').setDescription('1日1回の宝くじに参加します'),
  async execute(i, { repository: repo, startBalance, lotteryCost }) {
    if (!i.guildId) return i.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const outcomes = [
      [0, 65],
      [50, 25],
      [150, 9],
      [1000, 1],
    ];
    const weightSum = outcomes.reduce((sum, item) => sum + item[1], 0);
    let roll = Math.random() * weightSum;
    let payout = 0;
    for (const [amount, weight] of outcomes) {
      roll -= weight;
      if (roll < 0) {
        payout = amount;
        break;
      }
    }
    try {
      const amount = repo.lottery(i.guildId, i.user.id, lotteryCost, payout, startBalance);
      const result = payout
        ? `当選！ ${payout.toLocaleString('ja-JP')} コイン`
        : '残念、今回はハズレです。';
      return i.reply({
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
    } catch (err) {
      return i.reply({
        content:
          err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
            ? '今日は既に宝くじに参加済みです。'
            : err.message,
        ephemeral: true,
      });
    }
  },
};
