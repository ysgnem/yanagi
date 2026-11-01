import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('サーバーメンバーへコインを送金します')
    .addUserOption((opt) => opt.setName('member').setDescription('送金先').setRequired(true))
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('送金額')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000000),
    ),
  async execute(i, { repository: repo }) {
    if (!i.guildId) return i.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const member = i.options.getUser('member', true);
    const amount = i.options.getInteger('amount', true);
    try {
      repo.transfer(i.guildId, i.user.id, member.id, amount);
      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('送金しました')
            .setColor(0x57f287)
            .addFields(
              { name: '送金先', value: `<@${member.id}>`, inline: true },
              { name: '送金額', value: `${amount.toLocaleString('ja-JP')} コイン`, inline: true },
            ),
        ],
      });
    } catch (err) {
      return i.reply({ content: err.message, ephemeral: true });
    }
  },
};
