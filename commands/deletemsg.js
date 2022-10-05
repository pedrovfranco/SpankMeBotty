const { SlashCommandBuilder } = require('discord.js');

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('deletemsg')
		.setDescription('Deletes last X messages')
        .addIntegerOption(option => option
                .setName('num_messages')
                .setDescription('The number of messages to delete')
                .setRequired(true)),
    
    async execute(interaction) {
        let numMsgs = interaction.options.getInteger('num_messages');

        if (numMsgs < 1) {
            interaction.reply('Number of messages must be greater than 0!');
            console.log('Number of messages must be greater than 0!');
            return;
        } 
        
        if (interaction.member.user.tag !== "pedrofixe#4200") {
            interaction.reply('You don\'t have permission to use this command!');
            console.log('You don\'t have permission to use this command!');
            return;
        }
    
        await interaction.channel.bulkDelete(numMsgs+1);
        interaction.reply(`Deleted ${numMsgs} messages`);
    }
};
