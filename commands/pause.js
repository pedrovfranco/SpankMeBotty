const music = require('../common/music');

module.exports = {
    name: 'pause',
    description: 'Pauses the music stream',
    args: false,
    execute,
};

async function execute(message, args) {
    
    if (music.streamDispatcher.paused) {
        message.channel.send('Song is already paused');
    }
    else {
        music.streamDispatcher.pause(false);
        message.channel.send('Paused');
    }
}