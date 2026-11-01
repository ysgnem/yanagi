import fs from 'node:fs/promises';
import { SlashCommandBuilder } from 'discord.js';
import { getSession } from '../features/player.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('再生を停止してキューを消去します'),
  async execute(interaction, { logger }) {
    const session = getSession(interaction.client.user.id, interaction.guildId);
    if (session) {
      session.queueEpoch += 1;
      for (const controller of session.pendingDownloads) controller.abort();
      const queued = session.queue.splice(0);
      for (const item of queued) {
        await fs.rm(item.path, { force: true }).catch((error) => {
          logger.error('Could not remove queued Music temporary file', {
            file: item.path,
            error: String(error),
          });
        });
      }
      if (session.current) session.player.stop(true);
    }
    return interaction.reply({
      content: '再生を停止し、待機キューを消去しました。',
      ephemeral: true,
    });
  },
};
