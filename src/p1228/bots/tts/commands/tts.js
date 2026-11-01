import { SlashCommandBuilder } from 'discord.js';
import { playNext, sessionKey, sessions } from '../features/voice.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('VOICEVOXでテキストを読み上げます')
    .addStringOption((opt) =>
      opt.setName('text').setDescription('読み上げる文章').setRequired(true).setMaxLength(1000),
    )
    .addIntegerOption((opt) =>
      opt.setName('speaker').setDescription('VOICEVOX話者ID（省略時は既定値）').setMinValue(0),
    ),
  async execute(i, { voicevoxUrl, defaultSpeaker, maxText, maxQueue, logger }) {
    const text = i.options.getString('text', true).trim();
    const speaker = i.options.getInteger('speaker') ?? defaultSpeaker;
    if (!text || text.length > maxText)
      return i.reply({
        content: `文章は1〜${maxText}文字で指定してください。`,
        ephemeral: true,
      });
    if (!i.guild?.voiceAdapterCreator)
      return i.reply({ content: '先に `/join` を実行してください。', ephemeral: true });
    await i.deferReply({ ephemeral: true });
    let session;
    let abortCtl;
    try {
      session = sessions.get(sessionKey(i.client.user.id, i.guildId));
      if (!session) throw new Error('先に `/join` を実行してください。');
      const memberCh = i.member?.voice?.channel;
      if (!memberCh || memberCh.id !== session.channelId)
        throw new Error('ボイスボットと同じボイスチャンネルに参加してください。');
      if (
        session.queue.length + Number(session.playing) + session.pendingRequests.size >=
        maxQueue
      ) {
        throw new Error('読み上げキューがいっぱいです。');
      }
      abortCtl = new AbortController();
      session.pendingRequests.add(abortCtl);

      const queryUrl = new URL('/audio_query', voicevoxUrl);
      queryUrl.searchParams.set('text', text);
      queryUrl.searchParams.set('speaker', String(speaker));
      const queryRes = await fetch(queryUrl, {
        method: 'POST',
        signal: AbortSignal.any([abortCtl.signal, AbortSignal.timeout(60000)]),
      });
      if (!queryRes.ok) throw new Error(`VOICEVOX audio_query HTTP ${queryRes.status}`);
      const query = await queryRes.json();
      const synthUrl = new URL('/synthesis', voicevoxUrl);
      synthUrl.searchParams.set('speaker', String(speaker));
      const audioRes = await fetch(synthUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(query),
        signal: AbortSignal.any([abortCtl.signal, AbortSignal.timeout(60000)]),
      });
      if (!audioRes.ok) throw new Error(`VOICEVOX synthesis HTTP ${audioRes.status}`);
      const audio = Buffer.from(await audioRes.arrayBuffer());
      if (
        abortCtl.signal.aborted ||
        session.closed ||
        sessions.get(sessionKey(i.client.user.id, i.guildId)) !== session
      ) {
        throw new Error('読み上げ処理はキャンセルされました。');
      }
      session.queue.push(audio);
      void playNext(session);
      return i.editReply('読み上げキューに追加しました。');
    } catch (err) {
      if (abortCtl?.signal.aborted) return i.editReply('読み上げ処理はキャンセルされました。');
      logger.error('VOICEVOX request failed', { error: String(err) });
      return i.editReply(err.message || 'VOICEVOXへの接続または音声生成に失敗しました。');
    } finally {
      if (session && abortCtl) session.pendingRequests.delete(abortCtl);
    }
  },
};
