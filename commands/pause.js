const music = require('../common/music');

module.exports = {
    name: 'pause',
    description: 'Pauses the music stream',
    args: false,
    execute,
};

async function execute(message, args) {
    
    let guild = music.getGuild(message);

    if (guild.queue.length === 0) {
        message.channel.send('The queue is empty');
        return;
    }

    if (music.pause(guild)) {
        message.channel.send('Paused');
    }
    else {
        message.channel.send('Song is already paused');
    }

}