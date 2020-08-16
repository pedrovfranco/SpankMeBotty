const music = require('../common/music');

module.exports = {
    name: 'skip',
    description: 'Skip the currently playing song',
    args: false,
    alias: 's',
    execute,
};

async function execute(message, args) {
    
    music.skipCurrentSong(music.getGuild(message));

}