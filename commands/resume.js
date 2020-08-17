const music = require('../common/music');

module.exports = {
    name: 'resume',
    description: 'Resumes the music stream',
    args: false,
    alias: 'r',
    execute,
};

async function execute(message, args) {

    let guild = music.getGuild(message);

    if (guild.queue.length === 0) {
        message.channel.send('The queue is empty');
        return;
    }

    if (music.resume(guild)) {
        message.channel.send('Playing');
    }
    else {
        message.channel.send('Song is already playing');
    }
}