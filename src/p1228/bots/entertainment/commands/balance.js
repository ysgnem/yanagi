import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('自分のEntertainment通貨残高を確認します'),
  async execute(i, { repository: repo, startBalance }) {
    if (!i.guildId) return i.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    repo.ensureAccount(i.guildId, i.user.id, startBalance);
    const amount = repo.balance(i.guildId, i.user.id);
    return i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Entertainment残高')
          .setColor(0x5865f2)
          .addFields({ name: '現在の残高', value: `**${amount.toLocaleString('ja-JP')} コイン**` }),
      ],
      ephemeral: true,
    });
  },
};
