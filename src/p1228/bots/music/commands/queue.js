import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getSession } from '../features/player.js';

export default {
  data: new SlashCommandBuilder().setName('queue').setDescription('現在の再生キューを表示します'),
  async execute(i, { maxQueue }) {
    const session = getSession(i.client.user.id, i.guildId);
    const current = session?.current;
    const entries = session?.queue ?? [];
    const showUrl = (url) => (url.length > 180 ? `${url.slice(0, 177)}...` : `<${url}>`);
    const desc = [
      current ? `再生中: ${showUrl(current.url)}` : '現在、再生中の音声はありません。',
      '',
    ];
    let omitted = 0;
    for (const [index, item] of entries.entries()) {
      const line = `**${index + 1}.** ${showUrl(item.url)}`;
      if (desc.join('\n').length + line.length + 1 > 4096) {
        omitted = entries.length - index;
        break;
      }
      desc.push(line);
    }
    if (!entries.length) desc.push('待機中の音声はありません。');
    if (omitted) {
      const marker = `…ほか ${omitted} 件`;
      while (desc.join('\n').length + marker.length + 1 > 4096) desc.pop();
      desc.push(marker);
    }
    return i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('再生キュー')
          .setDescription(desc.join('\n'))
          .setFooter({ text: `待機中: ${entries.length} / ${maxQueue}` })
          .setColor(0x5865f2),
      ],
      ephemeral: true,
    });
  },
};
