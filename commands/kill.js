const common = require('../common/common');
const KillList = require('../database/models/killList');

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

	try {
		message.channel.send("( ͡° ͜ʖ ͡°)=ε/̵͇̿̿/'̿̿ ̿ ̿̿ ̿ ̿   " + args[0]);
		let usrID = args[0].substr(3, args[0].length-4);
	
		message.guild.members.fetch(usrID)
		.then((res) => {

			let guildMember = res;

			if (!common.validObject(guildMember.voice.channelID)) {
				message.channel.send("User is not on a voice channel!");
				return;
			}

			let tag = guildMember.user.tag;
			console.log(tag);
		
			KillList.findOne({ tag: tag }).orFail()
			.then(result => {
		
				message.channel.send("Say your prayers :)");
		
				setTimeout((guildMember) => {
					guildMember.voice.kick();
		
				}, 3000, guildMember);
			})
			.catch(err => {
				message.channel.send("Looks like you escaped :(");
			})
		
		})
		.catch((err) => {
			message.channel.send("First argument should be @user!");
		})
	}
	catch(err) {
		message.channel.send("First argument should be @user!");
	}
	
}