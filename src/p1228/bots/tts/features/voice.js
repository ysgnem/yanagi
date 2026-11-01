import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { GatewayIntentBits } from 'discord.js';
import {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from '@discordjs/voice';
import { env, positiveInt } from '../../../core/config.js';

export const sessions = new Map();
const sessionCreations = new Map();
export const sessionKey = (clientId, guildId) => `${clientId}:${guildId}`;

export async function disposeSession(key, session) {
  if (sessions.get(key) === session) sessions.delete(key);
  session.closed = true;
  for (const controller of session.pendingRequests) controller.abort();
  session.pendingRequests.clear();
  session.queue.length = 0;
  session.player.stop(true);
  session.connection.destroy();
  if (session.currentFile) {
    await fs.rm(session.currentFile, { force: true }).catch((error) => {
      console.error('Could not remove TTS temporary file', error);
    });
    session.currentFile = null;
  }
}

export async function ensureSession(interaction) {
  const channel = interaction.member?.voice?.channel;
  if (!interaction.guild || !channel) throw new Error('先にボイスチャンネルへ参加してください。');
  const key = sessionKey(interaction.client.user.id, interaction.guildId);
  const creating = sessionCreations.get(key);
  if (creating) {
    const session = await creating;
    if (session.channelId === channel.id && sessions.get(key) === session) return session;
    return ensureSession(interaction);
  }
  const existing = sessions.get(key);
  if (existing?.channelId === channel.id) return existing;

  const create = (async () => {
    if (existing) await disposeSession(key, existing);
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20000);
    } catch (error) {
      connection.destroy();
      throw error;
    }
    const player = createAudioPlayer();
    const session = {
      connection,
      player,
      channelId: channel.id,
      queue: [],
      currentFile: null,
      playing: false,
      pendingRequests: new Set(),
      closed: false,
    };
    connection.subscribe(player);
    player.on(AudioPlayerStatus.Idle, async () => {
      if (session.currentFile) {
        await fs.rm(session.currentFile, { force: true }).catch((error) => {
          console.error('Could not remove TTS temporary file', error);
        });
      }
      session.currentFile = null;
      session.playing = false;
      void playNext(session);
    });
    player.on('error', (error) => {
      console.error('TTS player error', error);
    });
    sessions.set(key, session);
    return session;
  })();
  sessionCreations.set(key, create);
  try {
    return await create;
  } finally {
    if (sessionCreations.get(key) === create) sessionCreations.delete(key);
  }
}

export async function playNext(session) {
  if (session.closed || session.playing || session.queue.length === 0) return;
  const buffer = session.queue.shift();
  const file = path.join(os.tmpdir(), `p1228-tts-${randomUUID()}.wav`);
  session.playing = true;
  session.currentFile = file;
  try {
    await fs.writeFile(file, buffer);
    if (session.closed) {
      await fs.rm(file, { force: true });
      session.currentFile = null;
      session.playing = false;
      return;
    }
    session.player.play(createAudioResource(file));
  } catch (error) {
    await fs.rm(file, { force: true }).catch((cleanupError) => {
      console.error('Could not remove TTS temporary file', cleanupError);
    });
    session.currentFile = null;
    session.playing = false;
    console.error('Could not start TTS playback', error);
    void playNext(session);
  }
}

export default function createVoiceFeature() {
  return {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    context: {
      voicevoxUrl: env('VOICEVOX_URL', 'http://127.0.0.1:50021').replace(/\/$/u, ''),
      defaultSpeaker: positiveInt('VOICEVOX_SPEAKER', 1, { minimum: 0 }),
      maxText: positiveInt('TTS_MAX_TEXT_LENGTH', 200),
      maxQueue: positiveInt('TTS_QUEUE_MAX_ITEMS', 10),
    },
    onShutdown() {
      for (const [key, session] of sessions) {
        void disposeSession(key, session).catch((error) => {
          console.error('Could not dispose TTS session during shutdown', error);
        });
      }
    },
  };
}
