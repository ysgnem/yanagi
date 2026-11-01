import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getSession } from '../features/player.js';

export default {
  data: new SlashCommandBuilder().setName('queue').setDescription('現在の再生キューを表示します'),
  async execute(interaction, { maxQueue }) {
    const session = getSession(interaction.client.user.id, interaction.guildId);
    const current = session?.current;
    const entries = session?.queue ?? [];
    const displayUrl = (url) => (url.length > 180 ? `${url.slice(0, 177)}...` : `<${url}>`);
    const description = [
      current ? `再生中: ${displayUrl(current.url)}` : '現在、再生中の音声はありません。',
      '',
    ];
    let omitted = 0;
    for (const [index, item] of entries.entries()) {
      const line = `**${index + 1}.** ${displayUrl(item.url)}`;
      if (description.join('\n').length + line.length + 1 > 4096) {
        omitted = entries.length - index;
        break;
      }
      description.push(line);
    }
    if (!entries.length) description.push('待機中の音声はありません。');
    if (omitted) {
      const marker = `…ほか ${omitted} 件`;
      while (description.join('\n').length + marker.length + 1 > 4096) description.pop();
      description.push(marker);
    }
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('再生キュー')
          .setDescription(description.join('\n'))
          .setFooter({ text: `待機中: ${entries.length} / ${maxQueue}` })
          .setColor(0x5865f2),
      ],
      ephemeral: true,
    });
  },
};
