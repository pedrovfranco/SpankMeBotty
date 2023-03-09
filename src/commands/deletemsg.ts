import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, TextChannel } from 'discord.js';

export let data = new SlashCommandBuilder()
    .setName('deletemsg')
    .setDescription('Deletes last X messages')
    .addIntegerOption(option => option
        .setName('num_messages')
        .setDescription('The number of messages to delete')
        .setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild?.id;

    if (!(interaction.member instanceof GuildMember) || interaction.channel == undefined) {
		return;
	}

    if (!(interaction.channel instanceof TextChannel)) {
        interaction.reply('Wrong channel type!');
        console.log('Wrong channel type!');
		return;
	}


    let numMsgs = interaction.options.getInteger('num_messages', true);

    if (numMsgs < 1) {
        interaction.reply('Number of messages must be greater than 0!');
        console.log('Number of messages must be greater than 0!');
        return;
    } 
    
    if (interaction.member.user.tag !== "pedrofixe#4200") {
        interaction.reply('You don\'t have permission to use this command!');
        console.log('You don\'t have permission to use this command!');
        return;
    }

    await interaction.channel.bulkDelete(numMsgs+1);
    interaction.reply(`Deleted ${numMsgs} messages`);
}
