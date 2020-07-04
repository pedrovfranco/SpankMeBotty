const common = require('../common');

module.exports = {
	name: 'kill',
    description: 'pew pew!',
    args: true,
    usage: '<@someone>',
	execute,
};

async function execute(message, args) {

	if (args.length !== 1) {
		message.channel.send('yikes');
		return;
	}

	message.channel.send("( ͡° ͜ʖ ͡°)=ε/̵͇̿̿/'̿̿ ̿ ̿̿ ̿ ̿   " + args[0]);
	let guildMember = message.member;
    
	if (common.killList.includes(guildMember.user.tag)) {
		message.channel.send("Say your prayers :)");

		setTimeout((guildMember) => {
			guildMember.voice.kick();

		}, 3000, guildMember);

	}
	else {
		message.channel.send("Looks like you escaped :(");
	}

}