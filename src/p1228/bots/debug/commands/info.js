import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('debug-info')
    .setDescription('ユーザー・サーバー・時刻情報を表示します'),
  async execute(interaction) {
    const guild = interaction.guild;
    const embed = new EmbedBuilder()
      .setTitle('デバッグ情報')
      .setColor(0x5865f2)
      .addFields(
        {
          name: 'ユーザー',
          value: `${interaction.user}\n\`${interaction.user.id}\``,
          inline: true,
        },
        { name: 'サーバー', value: guild ? `${guild.name}\n\`${guild.id}\`` : 'DM', inline: true },
        {
          name: '実行時刻',
          value: `<t:${Math.floor(interaction.createdTimestamp / 1000)}:F>`,
          inline: false,
        },
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
