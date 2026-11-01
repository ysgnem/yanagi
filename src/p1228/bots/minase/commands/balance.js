import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('自分のMinaseポイントを確認します'),
  async execute(i, { repository: repo }) {
    if (!i.guildId) return i.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    const value = repo.balance(i.guildId, i.user.id);
    return i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Minaseポイント残高')
          .addFields({ name: '現在の残高', value: `**${value.toLocaleString('ja-JP')} pt**` })
          .setColor(0x5865f2),
      ],
      ephemeral: true,
    });
  },
};
