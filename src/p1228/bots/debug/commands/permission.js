import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('debug-permission')
    .setDescription('Botの権限状態を確認します'),
  async execute(interaction) {
    if (!interaction.guild)
      return interaction.reply({
        content: 'テストサーバー内で実行してください。',
        ephemeral: true,
      });
    const me = await interaction.guild.members.fetchMe();
    const permissions = me.permissions;
    const checks = [
      ['管理者', permissions.has(PermissionFlagsBits.Administrator)],
      [
        'ボイスチャンネル接続',
        permissions.has(PermissionFlagsBits.Connect) ||
          permissions.has(PermissionFlagsBits.Administrator),
      ],
      [
        '発言',
        permissions.has(PermissionFlagsBits.Speak) ||
          permissions.has(PermissionFlagsBits.Administrator),
      ],
      [
        'メッセージ送信',
        permissions.has(PermissionFlagsBits.SendMessages) ||
          permissions.has(PermissionFlagsBits.Administrator),
      ],
    ];
    const embed = new EmbedBuilder()
      .setTitle('Botの権限')
      .setColor(0x5865f2)
      .addFields(
        checks.map(([name, allowed]) => ({
          name,
          value: allowed ? '許可' : '未許可',
          inline: true,
        })),
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
