import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('server-info')
    .setDescription('🏠サーバーの基本情報を表示します'),
  async execute(i) {
    const guild = i.guild;
    if (!guild) return i.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setDescription('サーバーの基本情報')
      .setColor(0x5865f2)
      .addFields(
        {
          name: '👤メンバー数',
          value: `${guild.memberCount.toLocaleString('ja-JP')}人`,
          inline: true,
        },
        { name: '🆔サーバーID', value: `\`${guild.id}\``, inline: true },
        { name: 'オーナー', value: `<@${guild.ownerId}>`, inline: true },
        {
          name: '作成日',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,
          inline: true,
        },
      );
    if (guild.iconURL()) embed.setThumbnail(guild.iconURL());
    return i.reply({ embeds: [embed] });
  },
};
