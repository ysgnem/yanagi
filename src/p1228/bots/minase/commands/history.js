import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const labels = {
  'minase-daily': 'デイリー報酬',
  'initial-balance': '初期残高',
  'transfer-out': '送金',
  'transfer-in': '送金受取',
  'lottery-entry': '宝くじ参加費',
  'lottery-prize': '宝くじ当選金',
};

export default {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('自分のポイント履歴を表示します'),
  async execute(interaction, { repository }) {
    if (!interaction.guildId)
      return interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const rows = repository.history(interaction.guildId, interaction.user.id, 10);
    const description = rows.length
      ? rows
          .map(
            (row) =>
              `\`${row.delta >= 0 ? '+' : ''}${row.delta.toLocaleString('ja-JP')} pt\` — ${labels[row.reason] ?? row.reason} · <t:${Math.floor(Date.parse(row.createdAt) / 1000)}:R>`,
          )
          .join('\n')
      : '履歴はまだありません。';
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setTitle('ポイント履歴').setDescription(description).setColor(0x5865f2),
      ],
      ephemeral: true,
    });
  },
};
