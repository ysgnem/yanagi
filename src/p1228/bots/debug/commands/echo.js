import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('debug-echo')
    .setDescription('入力したテキストを返します')
    .addStringOption((option) =>
      option.setName('text').setDescription('返すテキスト').setRequired(true).setMaxLength(1900),
    ),
  async execute(interaction) {
    return interaction.reply({
      content: interaction.options.getString('text', true),
      ephemeral: true,
    });
  },
};
