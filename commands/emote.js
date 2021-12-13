const { SlashCommandBuilder } = require('@discordjs/builders');
const common = require('../common/common');
const emoteConfig = require('./emoteconfig')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('emote')
		.setDescription('Prints an emote to the text channel')
        .addStringOption(option =>
            option.setName('emote_name')
                .setDescription('The name of the emote')),
    
	async execute(interaction) {
        let emoteName = interaction.options.getString('emote_name');

		if (emoteName == null) {
			emoteConfig.handleList(interaction);
		}
		else {
			common.sendEmote(interaction, emoteName, true);
		}
	}
};