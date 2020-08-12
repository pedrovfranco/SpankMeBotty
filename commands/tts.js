const common = require('../common');

module.exports = {
	name: 'tts',
    description: 'Voices your tts message with british brian',
    args: true,
    minargs: 1,
    usage: '<text>',
	execute
};

async function execute(message, args) {
	
	if (!common.validObject(message.member) || !common.validObject(message.member.voice) || !common.validObject(message.member.voice.channel)) {
        common.alertAndLog(message, 'User not in a voice channel!');
		return;
    }
    
    // let textStr = args.join(' ');
    let textStr = message.content.slice(5);
    let ttsAddress = 'https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=' + encodeURIComponent(textStr);

    common.initializeCookieJar();

    common.playTTS(message, textStr);
}
