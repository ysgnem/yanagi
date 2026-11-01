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
    .addStringOption((opt) =>
      opt.setName('url').setDescription('公開HTTPSの音声ファイルURL').setRequired(true),
    ),
  async execute(i, { maxBytes, maxQueue, logger }) {
    if (!i.guildId) return i.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
    await i.deferReply();
    let session;
    let file;
    let abortCtl;
    let queueEpoch;
    try {
      session = await ensureSession(i);
      if (session.closed) throw new Error('再生セッションが終了しました。もう一度お試しください。');
      if (session.queue.length + session.pendingDownloads.size >= maxQueue)
        throw new Error('再生キューがいっぱいです。');
      if (activeDownloads.size >= maxConcurrentDownloads)
        throw new Error('音声取得が混み合っています。少し待ってから再試行してください。');
      abortCtl = new AbortController();
      session.pendingDownloads.add(abortCtl);
      activeDownloads.add(abortCtl);
      queueEpoch = session.queueEpoch;
      file = path.join(os.tmpdir(), `p1228-music-${randomUUID()}.audio`);
      const { url } = await downloadPublicAudio(i.options.getString('url', true), file, {
        maxBytes,
        signal: abortCtl.signal,
      });
      if (abortCtl.signal.aborted || session.closed || queueEpoch !== session.queueEpoch)
        throw new Error('再生キューへの追加はキャンセルされました。');
      session.queue.push({ path: file, url });
      file = null;
      const isPlaying = Boolean(session.current);
      void playNext(session);
      return i.editReply(
        isPlaying
          ? `再生キューに追加しました（待機順: ${session.queue.length}）。`
          : '音声の再生を開始しました。',
      );
    } catch (err) {
      if (file)
        await fs.rm(file, { force: true }).catch((cleanupErr) => {
          logger.error('Could not remove incomplete Music download', {
            file,
            error: String(cleanupErr),
          });
        });
      if (abortCtl?.signal.aborted)
        return i.editReply('再生キューへの追加はキャンセルされました。');
      logger.warn('Music URL could not be queued', { error: String(err) });
      return i.editReply(
        err.message || 'URL検証・取得・接続に失敗しました。公開HTTPS音声URLを確認してください。',
      );
    } finally {
      if (abortCtl) {
        session?.pendingDownloads.delete(abortCtl);
        activeDownloads.delete(abortCtl);
      }
    }
  },
};
