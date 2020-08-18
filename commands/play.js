const common = require('../common/common');
const music = require('../common/music');


module.exports = {
    name: 'play',
    description: 'Plays music from youtube',
    args: true,
    minargs: 1,
    alias: ['p'],
    usage: '<youtube_link_or_search_query>',
    execute,
};


async function execute(message, args) {

    if (!common.validObject(message.member) || !common.validObject(message.member.voice) || !common.validObject(message.member.voice.channel)) {
        common.alertAndLog(message, 'User not in a voice channel!');
        return;
    }

    const search_query = args.join(' ');

    music.addToQueue(message, search_query);
}