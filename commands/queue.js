const common = require('../common/common');
const music = require('../common/music');

module.exports = {
    name: 'queue',
    description: 'Displays the music queue',
    args: false,
    alias: ['q'],
    execute,
};

const maxTitleLength = 30;
const maxQueueSize = 10;

async function execute(message, args) {
    
    let guild = music.getGuild(message);
    
    if (guild.queue.length === 0) {
        message.channel.send("```\n```");
        return;
    }

    let result = "```diff\n";

    for (let i = 0; i < guild.queue.length && i < maxQueueSize; i++) {

        const vid = guild.queue[i];
        let playing = (i === guild.playing);

        if (vid.playing) {
            result += '- ';
        }
        else {
            result += '  ';
        }

        result += '[' + (i+1) + '] ';

        const title = vid.info.title;
        if (title.length > maxTitleLength) {
            title = title.substr(0, maxTitleLength - 3);
            title += '...';
        }

        result += title;

        if (vid.playing) {
            const time = '(' + common.formatSeconds(Math.round(parseInt(guild.streamDispatcher.streamTime) / 1000)) + '/' + common.formatSeconds(guild.currentVideoDetails.lengthSeconds) + ')';
            result += ' ' + time;
        }

        if (i < guild.queue.length - 1) {
            result += '\n';
        }
    }

    result += "```";

    message.channel.send(result);
}
