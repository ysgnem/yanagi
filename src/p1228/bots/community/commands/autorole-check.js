import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('autorole-check')
    .setDescription('🎭自動ロール設定を確認します（管理者用）'),
  async execute(interaction, { autorole }) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
      return interaction.reply({ content: 'サーバー管理者のみ実行できます。', ephemeral: true });
    const list = [...autorole.blacklist].sort();
    const preview =
      list
        .slice(0, 10)
        .map((id) => `\`${id}\``)
        .join('\n') || '登録なし';
    const embed = new EmbedBuilder()
      .setTitle('🎭 自動ロール設定')
      .setColor(0x5865f2)
      .addFields(
        {
          name: '👤 人間用ロール',
          value: autorole.memberRole ? `<@&${autorole.memberRole}>` : '未設定',
          inline: true,
        },
        {
          name: '🤖 Bot用ロール',
          value: autorole.botRole ? `<@&${autorole.botRole}>` : '未設定',
          inline: true,
        },
        {
          name: '⛔ ブラックリスト',
          value: `登録数: ${list.length}件\n${preview}${list.length > 10 ? `\nほか ${list.length - 10}件` : ''}`,
          inline: false,
        },
        {
          name: '📣 通知先',
          value: autorole.alertChannel ? `<#${autorole.alertChannel}>` : '未設定',
          inline: true,
        },
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
