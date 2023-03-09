import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import {  } from '../common/common';
import KillList from '../database/models/killList';

export let data = new SlashCommandBuilder()
	.setName('kill')
	.setDescription('pew pew!')
	.addUserOption(option => option
		.setName('target')
		.setDescription('The person to kill')
		.setRequired(true)
	)

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    if (interaction.guild == undefined) {
		return;
	}

	let target = interaction.options.getUser('target', true);

	await interaction.reply(`( ͡° ͜ʖ ͡°)=ε/̵͇̿̿/'̿̿ ̿ ̿̿ ̿ ̿   <@${target.id}>`);

	interaction.guild.members.fetch(target)
	.then((guildMember) => {

		if (guildMember.voice.channelId == undefined) {
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