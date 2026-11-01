import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('サーバーメンバーへコインを送金します')
    .addUserOption((option) => option.setName('member').setDescription('送金先').setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('送金額')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000000),
    ),
  async execute(interaction, { repository }) {
    if (!interaction.guildId)
      return interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const member = interaction.options.getUser('member', true);
    const amount = interaction.options.getInteger('amount', true);
    try {
      repository.transfer(interaction.guildId, interaction.user.id, member.id, amount);
      return interaction.reply({
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
    } catch (error) {
      return interaction.reply({ content: error.message, ephemeral: true });
    }
  },
};
