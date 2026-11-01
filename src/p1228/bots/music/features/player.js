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
import { positiveInt } from '../../../core/config.js';

export const sessions = new Map();
const sessionCreations = new Map();
export const activeDownloads = new Set();
export const maxConcurrentDownloads = 4;
export const sessionKey = (clientId, guildId) => `${clientId}:${guildId}`;

export function getSession(clientId, guildId) {
  return sessions.get(sessionKey(clientId, guildId));
}

export async function disposeSession(key, session) {
  if (sessions.get(key) === session) sessions.delete(key);
  session.closed = true;
  session.queueEpoch += 1;
  for (const controller of session.pendingDownloads) controller.abort();
  const files = [...session.queue.map((item) => item.path)];
  if (session.current) files.push(session.current.path);
  session.queue.length = 0;
  session.current = null;
  session.player.stop(true);
  session.connection.destroy();
  await Promise.all(
    files.map((file) =>
      fs.rm(file, { force: true }).catch((error) => {
        console.error('Could not remove Music temporary file', { file, error });
      }),
    ),
  );
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
      current: null,
      pendingDownloads: new Set(),
      queueEpoch: 0,
      closed: false,
    };
    connection.subscribe(player);
    player.on(AudioPlayerStatus.Idle, () => {
      if (session.current) {
        void fs.rm(session.current.path, { force: true }).catch((error) => {
          console.error('Could not remove Music temporary file', error);
        });
      }
      session.current = null;
      void playNext(session);
    });
    player.on('error', (error) => console.error('Music player error', error));
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
  if (session.closed || session.current || !session.queue.length) return;
  const item = session.queue.shift();
  session.current = item;
  try {
    session.player.play(createAudioResource(item.path));
  } catch (error) {
    await fs.rm(item.path, { force: true }).catch((cleanupError) => {
      console.error('Could not remove Music temporary file', cleanupError);
    });
    session.current = null;
    console.error('Could not start music playback', error);
    void playNext(session);
  }
}

export default function createPlayerFeature() {
  return {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    context: {
      maxBytes: positiveInt('MUSIC_MAX_BYTES', 50 * 1024 * 1024),
      maxQueue: positiveInt('MUSIC_QUEUE_LIMIT', 20),
    },
  };
}
