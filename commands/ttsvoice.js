const common = require('../common');

module.exports = {
    name: 'ttsvoice',
    args: true,
    minargs: 2,
    description: 'Voices your tts message with a specific voice. You must choose a voice from the following: Amy,Brian,Emma(ENG), Ivy,Joanna,Justin,Kendra,Kimberly,Salli(US), Nicole,Russell(AU), Geraint(WLS), Raveena(IN)!',
    usage: '<voice> <text>',
    execute
};

async function execute(message, args) {

    if (!common.validObject(message.member.voice.channel)) {
        common.alertAndLog(message, 'User not in a voice channel!');
        return;
    }

    let textStr = args.slice(1).join(' ');
    console.log(textStr);

    common.playTTS(message, textStr, args[0]);
}