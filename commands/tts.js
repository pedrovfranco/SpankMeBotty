const { SlashCommandBuilder } = require('@discordjs/builders');

const common = require('../common/common');


// module.exports = {
// 	name: 'tts',
//     description: 'Voices your tts message with british brian',
//     args: true,
//     minargs: 1,
//     usage: '<text>',
// 	execute
// };


module.exports = {	
	data: new SlashCommandBuilder()
		.setName('tts')
		.setDescription('Reads text in voice channel')
        .addStringOption(option => option
            .setName('text')
            .setDescription('The text to be read')
            .setRequired(true)
		)
        .addStringOption(option => option
            .setName('voice')
            .setDescription('The voice that reads the text (defaults to Brian)')
		),


    async execute(interaction) {
        
        if (!common.validObject(interaction.member) || !common.validObject(interaction.member.voice) || !common.validObject(interaction.member.voice.channel)) {
            common.alertAndLog(interaction, 'User not in a voice channel!');
            return;
        }

        const text = interaction.options.getString('text');
        let voice = interaction.options.getString('voice');

        if (voice == null)
            voice = 'Brian';

        common.playTTS(interaction, text, voice, (err) => {
            if (err == null)
                interaction.reply('TTS: ' + text);
            else {
                interaction.reply('Failed!');
                console.log('TTS error = ' + JSON.stringify(err));
            }
        });
    }
}