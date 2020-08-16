const common = require('../common/common');
const music = require('../common/music');

module.exports = {
    name: 'queue',
    description: 'Displays the music queue',
    args: false,
    alias: ['q'],
    execute,
};

async function execute(message, args) {
    
    message.channel.send(common.secondsToSecondsAndMinutes(Math.round(parseInt(music.streamDispatcher.streamTime) / 1000)) + ' / ' + common.secondsToSecondsAndMinutes(music.currentVideoDetails.lengthSeconds));

}
