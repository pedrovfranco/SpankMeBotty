const { SlashCommandBuilder } = require('@discordjs/builders');

const common = require('../common/common');

// module.exports = {
//     name: 'roll',
//     description: 'Rolls a pseudo dice. If no args then rolls between 1 and 100',
//     usage: '<max_bound>\n<min_bound> <max_bound>',
//     execute,
// };

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('roll')
		.setDescription('Rolls a pseudo dice. If no args then rolls between 1 and 100')
        .addIntegerOption(option => option
            .setName('min_value')
            .setDescription('The minimum value of the dice (defaults to 1)')
		)
        .addIntegerOption(option => option
            .setName('max_value')
            .setDescription('The maximum value of the dice (defaults to 100)')
		),


    async execute(interaction, args) {
        
        let min = interaction.options.getInteger('min_value');
        let max = interaction.options.getInteger('max_value');

        if (min == null)
            min = 1;

        if (max == null)
            max = 100;

        if (max < min) {
            interaction.reply('The maximum should be greater than the minimum value!')
            return;
        }

        let rnd = Math.random() * (max-min+1) + min;
        rnd = Math.floor(rnd);

        let msg = 'I rolled ' + rnd;
        interaction.reply(msg);
    }
}