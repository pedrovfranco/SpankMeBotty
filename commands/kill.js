const common = require('../common');
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

	message.channel.send("( ͡° ͜ʖ ͡°)=ε/̵͇̿̿/'̿̿ ̿ ̿̿ ̿ ̿   " + args[0]);
	let guild = message.guild;

	console.log("guild.available = " + guild.available);

	let usrID = args[0].substr(3, args[0].length-4);
	console.log("usrID = " + usrID);

	guild.members.fetch(usrID)
	.then((res) => {

		let guildMember = res;
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
		console.log(err);
	})

}