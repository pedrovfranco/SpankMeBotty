const ytdl = require('ytdl-core');

const common = require('../common');

module.exports = {
    name: 'play',
    description: 'Plays music from youtube',
    args: true,
    minargs: 1,
    alias: ['p'],
    usage: '<link>',
    execute,
};


async function execute(message, args) {

    if (args.length === 1) {

        const link = args[0];
        const expression = /(http(s)?\:\/\/(www\.)?)?youtube\.com/g;
        
        if (expression.test(link)) {
            let voiceConnection = await message.member.voice.channel.join();
            voiceConnection.play(ytdl(link));
        }
        else {
            common.alertAndLog("Must be a youtube link");
        }

    }
    else {
        common.printUsage(message, module.exports);
    }

}