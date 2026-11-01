import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('debug-echo')
    .setDescription('入力したテキストを返します')
    .addStringOption((opt) =>
      opt.setName('text').setDescription('返すテキスト').setRequired(true).setMaxLength(1900),
    ),
  async execute(i) {
    return i.reply({
      content: i.options.getString('text', true),
      ephemeral: true,
    });
  },
};
