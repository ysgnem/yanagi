import fs from 'node:fs/promises';
import { SlashCommandBuilder } from 'discord.js';
import { getSession } from '../features/player.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('再生を停止してキューを消去します'),
  async execute(i, { logger }) {
    const session = getSession(i.client.user.id, i.guildId);
    if (session) {
      session.queueEpoch += 1;
      for (const abortCtl of session.pendingDownloads) abortCtl.abort();
      const queued = session.queue.splice(0);
      for (const item of queued) {
        await fs.rm(item.path, { force: true }).catch((err) => {
          logger.error('Could not remove queued Music temporary file', {
            file: item.path,
            error: String(err),
          });
        });
      }
      if (session.current) session.player.stop(true);
    }
    return i.reply({
      content: '再生を停止し、待機キューを消去しました。',
      ephemeral: true,
    });
  },
};
