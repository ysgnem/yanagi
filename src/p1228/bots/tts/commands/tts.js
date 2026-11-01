import { SlashCommandBuilder } from 'discord.js';
import { playNext, sessionKey, sessions } from '../features/voice.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('VOICEVOXでテキストを読み上げます')
    .addStringOption((option) =>
      option.setName('text').setDescription('読み上げる文章').setRequired(true).setMaxLength(1000),
    )
    .addIntegerOption((option) =>
      option.setName('speaker').setDescription('VOICEVOX話者ID（省略時は既定値）').setMinValue(0),
    ),
  async execute(interaction, { voicevoxUrl, defaultSpeaker, maxText, maxQueue, logger }) {
    const text = interaction.options.getString('text', true).trim();
    const speaker = interaction.options.getInteger('speaker') ?? defaultSpeaker;
    if (!text || text.length > maxText)
      return interaction.reply({
        content: `文章は1〜${maxText}文字で指定してください。`,
        ephemeral: true,
      });
    if (!interaction.guild?.voiceAdapterCreator)
      return interaction.reply({ content: '先に `/join` を実行してください。', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    let session;
    let controller;
    try {
      session = sessions.get(sessionKey(interaction.client.user.id, interaction.guildId));
      if (!session) throw new Error('先に `/join` を実行してください。');
      const memberChannel = interaction.member?.voice?.channel;
      if (!memberChannel || memberChannel.id !== session.channelId)
        throw new Error('ボイスボットと同じボイスチャンネルに参加してください。');
      if (
        session.queue.length + Number(session.playing) + session.pendingRequests.size >=
        maxQueue
      ) {
        throw new Error('読み上げキューがいっぱいです。');
      }
      controller = new AbortController();
      session.pendingRequests.add(controller);

      const queryUrl = new URL('/audio_query', voicevoxUrl);
      queryUrl.searchParams.set('text', text);
      queryUrl.searchParams.set('speaker', String(speaker));
      const queryResponse = await fetch(queryUrl, {
        method: 'POST',
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
      });
      if (!queryResponse.ok) throw new Error(`VOICEVOX audio_query HTTP ${queryResponse.status}`);
      const query = await queryResponse.json();
      const synthesisUrl = new URL('/synthesis', voicevoxUrl);
      synthesisUrl.searchParams.set('speaker', String(speaker));
      const audioResponse = await fetch(synthesisUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(query),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
      });
      if (!audioResponse.ok) throw new Error(`VOICEVOX synthesis HTTP ${audioResponse.status}`);
      const audio = Buffer.from(await audioResponse.arrayBuffer());
      if (
        controller.signal.aborted ||
        session.closed ||
        sessions.get(sessionKey(interaction.client.user.id, interaction.guildId)) !== session
      ) {
        throw new Error('読み上げ処理はキャンセルされました。');
      }
      session.queue.push(audio);
      void playNext(session);
      return interaction.editReply('読み上げキューに追加しました。');
    } catch (error) {
      if (controller?.signal.aborted)
        return interaction.editReply('読み上げ処理はキャンセルされました。');
      logger.error('VOICEVOX request failed', { error: String(error) });
      return interaction.editReply(
        error.message || 'VOICEVOXへの接続または音声生成に失敗しました。',
      );
    } finally {
      if (session && controller) session.pendingRequests.delete(controller);
    }
  },
};
