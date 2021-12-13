const { SlashCommandBuilder } = require('@discordjs/builders');
const music = require('../common/music');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears the music queue'),

    async execute(interaction) {
        music.clearQueue(music.getGuild(interaction));
    },
};