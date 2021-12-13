const { SlashCommandBuilder } = require('@discordjs/builders');

const common = require('../common/common');
const music = require('../common/music');

// module.exports = {
//     name: 'queue',
//     description: 'Displays the music queue',
//     args: false,
//     alias: ['q'],
//     execute,
// };


const maxTitleLength = 41;
const maxQueueSize = 10;

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Displays the music queue')
    ,


    async execute(interaction) {
        
        let guild = music.getGuild(interaction);
        
        if (guild.queue.length === 0) {
            interaction.reply('The queue is empty');
            return;
        }

        let result = "```diff\n";

        for (let i = 0; i < guild.queue.length && i < maxQueueSize; i++) {

            const vid = guild.queue[i];
            let playing = (i === guild.playing);

            if (playing) {
                result += '- ';
            }
            else {
                result += '  ';
            }

            result += '[' + (i+1) + '] ';

            let title = vid.info.title;
            if (title.length > maxTitleLength) {
                title = title.substr(0, maxTitleLength - 3);
                title += '...';
            }

            result += title;

            let time = '(';

            if (vid.playing) {
                time += common.formatSeconds(Math.round(parseInt(guild.streamDispatcher.streamTime) / 1000)) + '/';
            }

            time += common.formatSeconds(vid.info.lengthSeconds) + ')';

            result += ' ' + time;

            if (i < guild.queue.length - 1) {
                result += '\n';
            }
        }

        result += "```";

        interaction.reply(result);
    }
}