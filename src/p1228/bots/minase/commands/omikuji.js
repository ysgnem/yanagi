import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const fortunes = [
  ['大吉', '今日は最高の流れ。新しいことに挑戦してみよう！'],
  ['中吉', '焦らず進めば、良い結果につながりそう。'],
  ['小吉', '小さな幸運を見逃さないで。'],
  ['吉', 'いつも通りが吉。丁寧さを大切に。'],
  ['末吉', '後半に向けて運気が上向きそう。'],
  ['凶', '無理は禁物。今日は慎重にいこう。'],
];

export default {
  data: new SlashCommandBuilder().setName('omikuji').setDescription('今日の運勢を占います'),
  async execute(i) {
    const [fortune, msg] = fortunes[Math.floor(Math.random() * fortunes.length)];
    return i.reply({
      embeds: [new EmbedBuilder().setTitle(`🔮 ${fortune}`).setDescription(msg).setColor(0x5865f2)],
    });
  },
};
