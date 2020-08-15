const ytdl = require('ytdl-core');

const common = require('../common');

module.exports = {
    name: 'play',
    description: 'Plays music from youtube',
    args: true,
    minargs: 1,
    alias: ['p'],
    usage: '<youtube_link>',
    execute,
};


async function execute(message, args) {

    if (args.length === 1) {

        const link = args[0];
        const expression = /^(https?\:\/\/)?(www\.)?youtube\.com/g;
        
        if (expression.test(link)) {
            let voiceConnection = await message.member.voice.channel.join();

            try {
                voiceConnection.play(ytdl(link));
            }
            catch (exception) {
                if (exception.message.startsWith('No video id found')) {
                    common.alertAndLog(message, "Link must be a video");
                }
                else {
                    common.alertAndLog(message, "Failed to play, the link is probably broken");
                }
            }
        }
        else {
            common.alertAndLog(message, "Must be a youtube link");
        }

    }
    else {
        common.printUsage(message, module.exports);
    }

}