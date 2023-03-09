import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, GuildMember } from 'discord.js';

import { commands } from '../commandsProcessor';


export let data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all of my commands or info about a specific command')
    
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    if (interaction.member == undefined || !(interaction.member instanceof GuildMember) || interaction.channel == undefined) {
		return;
	}

    const data: string[] = [];

    data.push('Here\'s a list of all my commands:');
    data.push(commands.map(command => {
        return command.data.name;
    }).join(', '));
    
    return interaction.member.user.send(data.join('\n'))
    .then(() => {
        if (interaction.channel?.type === ChannelType.DM) return;
        interaction.reply('I\'ve sent you a DM with all my commands!');
    })
    .catch(error => {
        console.error(`Could not send help DM to ${interaction?.member?.user.username}.\n`, error);
        interaction.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
    });
}