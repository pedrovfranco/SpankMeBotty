const music = require('../common/music');

module.exports = {
    name: 'clear',
    description: 'Clears the music queue',
    args: false,
    execute,
};

async function execute(message, args) {
    
    let guild = music.getGuild(message);

    music.clearQueue(guild);
}