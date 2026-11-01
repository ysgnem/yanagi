import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('debug-permission')
    .setDescription('Botの権限状態を確認します'),
  async execute(i) {
    if (!i.guild)
      return i.reply({
        content: 'テストサーバー内で実行してください。',
        ephemeral: true,
      });
    const me = await i.guild.members.fetchMe();
    const perms = me.permissions;
    const checks = [
      ['管理者', perms.has(PermissionFlagsBits.Administrator)],
      [
        'ボイスチャンネル接続',
        perms.has(PermissionFlagsBits.Connect) || perms.has(PermissionFlagsBits.Administrator),
      ],
      [
        '発言',
        perms.has(PermissionFlagsBits.Speak) || perms.has(PermissionFlagsBits.Administrator),
      ],
      [
        'メッセージ送信',
        perms.has(PermissionFlagsBits.SendMessages) || perms.has(PermissionFlagsBits.Administrator),
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
    return i.reply({ embeds: [embed], ephemeral: true });
  },
};
