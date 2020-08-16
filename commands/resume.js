const music = require('../common/music');

module.exports = {
    name: 'resume',
    description: 'Resumes the music stream',
    args: false,
    alias: 'r',
    execute,
};

async function execute(message, args) {
    
    if (music.streamDispatcher.paused) {
        music.streamDispatcher.resume();
        message.channel.send('Playing');
    }
    else {
        message.channel.send('Song is already playing');
    }
}