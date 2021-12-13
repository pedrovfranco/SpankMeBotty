const { SlashCommandBuilder } = require('@discordjs/builders');

const common = require('../common/common');
const KillList = require('../database/models/killList');

// module.exports = {
// 	name: 'kill',
//     description: 'pew pew!',
//     args: true,
//     usage: '<@someone>',
// 	execute,
// };

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('kill')
		.setDescription('pew pew!')
        .addUserOption(option => option
            .setName('target')
            .setDescription('The person to kill')
			.setRequired(true)
		),

	async  execute(interaction) {
		let target = interaction.options.getUser('target');
	
		if (target == null) {
			interaction.reply("First argument should be a user!");
			return;
		}
	
		interaction.reply("( ͡° ͜ʖ ͡°)=ε/̵͇̿̿/'̿̿ ̿ ̿̿ ̿ ̿   " + target.username);
	
		interaction.guild.members.fetch(target)
		.then((guildMember) => {

			if (!common.validObject(guildMember.voice.channelId)) {
				interaction.followUp("User is not on a voice channel!");
				return;
			}

			let tag = guildMember.user.tag;
			console.log(tag);
		
			KillList.findOne({ tag: tag }).orFail()
			.then(result => {
		
				interaction.followUp("Say your prayers :)");
		
				setTimeout((guildMember) => {
					guildMember.voice.disconnect('You were killed');
		
				}, 3000, guildMember);
			})
			.catch(err => {
				interaction.followUp("Looks like you escaped :(");
			})
		
		})
		.catch((err) => {
			interaction.followUp("First argument should be @user!");
		})
	}
}