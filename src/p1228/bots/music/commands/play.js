import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { SlashCommandBuilder } from 'discord.js';
import { downloadPublicAudio } from '../../../core/security.js';
import {
  activeDownloads,
  ensureSession,
  maxConcurrentDownloads,
  playNext,
} from '../features/player.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('公開HTTPSの音声URLを再生キューに追加します')
    .addStringOption((option) =>
      option.setName('url').setDescription('公開HTTPSの音声ファイルURL').setRequired(true),
    ),
  async execute(interaction, { maxBytes, maxQueue, logger }) {
    if (!interaction.guildId)
      return interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    await interaction.deferReply();
    let session;
    let file;
    let controller;
    let queueEpoch;
    try {
      session = await ensureSession(interaction);
      if (session.closed) throw new Error('再生セッションが終了しました。もう一度お試しください。');
      if (session.queue.length + session.pendingDownloads.size >= maxQueue)
        throw new Error('再生キューがいっぱいです。');
      if (activeDownloads.size >= maxConcurrentDownloads)
        throw new Error('音声取得が混み合っています。少し待ってから再試行してください。');
      controller = new AbortController();
      session.pendingDownloads.add(controller);
      activeDownloads.add(controller);
      queueEpoch = session.queueEpoch;
      file = path.join(os.tmpdir(), `p1228-music-${randomUUID()}.audio`);
      const { url } = await downloadPublicAudio(interaction.options.getString('url', true), file, {
        maxBytes,
        signal: controller.signal,
      });
      if (controller.signal.aborted || session.closed || queueEpoch !== session.queueEpoch)
        throw new Error('再生キューへの追加はキャンセルされました。');
      session.queue.push({ path: file, url });
      file = null;
      const isPlaying = Boolean(session.current);
      void playNext(session);
      return interaction.editReply(
        isPlaying
          ? `再生キューに追加しました（待機順: ${session.queue.length}）。`
          : '音声の再生を開始しました。',
      );
    } catch (error) {
      if (file)
        await fs.rm(file, { force: true }).catch((cleanupError) => {
          logger.error('Could not remove incomplete Music download', {
            file,
            error: String(cleanupError),
          });
        });
      if (controller?.signal.aborted)
        return interaction.editReply('再生キューへの追加はキャンセルされました。');
      logger.warn('Music URL could not be queued', { error: String(error) });
      return interaction.editReply(
        error.message || 'URL検証・取得・接続に失敗しました。公開HTTPS音声URLを確認してください。',
      );
    } finally {
      if (controller) {
        session?.pendingDownloads.delete(controller);
        activeDownloads.delete(controller);
      }
    }
  },
};
