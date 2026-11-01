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
const sessionPromises = new Map();
export const sessionKey = (clientId, guildId) => `${clientId}:${guildId}`;

export async function disposeSession(key, session) {
  if (sessions.get(key) === session) sessions.delete(key);
  session.closed = true;
  for (const abortCtl of session.pendingRequests) abortCtl.abort();
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

export async function ensureSession(i) {
  const channel = i.member?.voice?.channel;
  if (!i.guild || !channel) throw new Error('先にボイスチャンネルへ参加してください。');
  const key = sessionKey(i.client.user.id, i.guildId);
  const creating = sessionPromises.get(key);
  if (creating) {
    const session = await creating;
    if (session.channelId === channel.id && sessions.get(key) === session) return session;
    return ensureSession(i);
  }
  const existing = sessions.get(key);
  if (existing?.channelId === channel.id) return existing;

  const create = (async () => {
    if (existing) await disposeSession(key, existing);
    const conn = joinVoiceChannel({
      channelId: channel.id,
      guildId: i.guildId,
      adapterCreator: i.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    try {
      await entersState(conn, VoiceConnectionStatus.Ready, 20000);
    } catch (err) {
      conn.destroy();
      throw err;
    }
    const player = createAudioPlayer();
    const session = {
      connection: conn,
      player,
      channelId: channel.id,
      queue: [],
      currentFile: null,
      playing: false,
      pendingRequests: new Set(),
      closed: false,
    };
    conn.subscribe(player);
    player.on(AudioPlayerStatus.Idle, async () => {
      if (session.currentFile) {
        await fs.rm(session.currentFile, { force: true }).catch((err) => {
          console.error('Could not remove TTS temporary file', err);
        });
      }
      session.currentFile = null;
      session.playing = false;
      void playNext(session);
    });
    player.on('error', (err) => {
      console.error('TTS player error', err);
    });
    sessions.set(key, session);
    return session;
  })();
  sessionPromises.set(key, create);
  try {
    return await create;
  } finally {
    if (sessionPromises.get(key) === create) sessionPromises.delete(key);
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
  } catch (err) {
    await fs.rm(file, { force: true }).catch((cleanupErr) => {
      console.error('Could not remove TTS temporary file', cleanupErr);
    });
    session.currentFile = null;
    session.playing = false;
    console.error('Could not start TTS playback', err);
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
