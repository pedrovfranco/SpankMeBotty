const { SlashCommandBuilder } = require('discord.js');

const music = require('../common/music');

// module.exports = {
//     name: 'musicvolume',
//     description: 'Sets the music volume (100 being default, 200 being double and 50 being half)',
//     usage: '<new_volume> or no arguments to get the music volume',
//     execute,
// };


module.exports = {	
	data: new SlashCommandBuilder()
		.setName('musicvolume')
		.setDescription('Gets or sets the music volume (100 being default, 50 being half and 0 being mute)')
        .addIntegerOption(option => option
            .setName('new_volume')
            .setDescription('The desired new volume (pick a value between 0 and 100)')
   		),


    async execute(interaction) {
     
        let guild = music.getGuild(interaction);

        let newVolume = interaction.options.getInteger('new_volume');

        if (newVolume == null) {
            interaction.reply('Current music volume is ' + Math.round(guild.volume*100) + '%');
        }
        else {
            console.log(newVolume);

            if (isNaN(newVolume) || newVolume === NaN || newVolume === "NaN" || newVolume > 100.0 || newVolume < 0.0){
                interaction.reply('Error setting volume, \"' + newVolume + '\" must be a number between 0 and 100');
                return;
            }

            try {
                music.changeVolume(guild, newVolume/100, true);
                interaction.reply('Changed volume to ' + newVolume + '%');
            }
            catch (ex) {
                console.log(ex)
                interaction.reply('Error setting volume');
            }
        }
    }
}