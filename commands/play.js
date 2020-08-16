
const common = require('../common/common');
const music = require('../common/music');

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

            music.addToQueue(message, link);
        }
        else {
            common.alertAndLog(message, "Must be a youtube link");
        }

    }
    else {
        common.printUsage(message, module.exports);
    }

}