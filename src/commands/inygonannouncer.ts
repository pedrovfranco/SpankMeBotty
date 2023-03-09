import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';

import { alertAndLog } from '../common/common';
import InygonAnnounceList from '../database/models/inygonAnnounceList';


export let data = new SlashCommandBuilder()
    .setName('inygonannouncer')
    .setDescription('Manages the inygon announcer')
    .addSubcommand(subcommand => subcommand
        .setName('register')
        .setDescription('Registers the user on the inygon announcer')
    )
    .addSubcommand(subcommand => subcommand
        .setName('unregister')
        .setDescription('Registers the user on the inygon announcer')
    )

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
   
    if (interaction.member == undefined || !(interaction.member instanceof GuildMember)) {
		return;
	}

    let commandType = interaction.options.getSubcommand(true);

    let author = interaction.member.user.toString();

    if (commandType === 'register') {
        handleRegister(interaction, author);
    }
    else if (commandType === 'unregister') {
        handleUnregister(interaction, author);
    }
}

async function handleRegister(interaction: ChatInputCommandInteraction, author: string) {

    InygonAnnounceList.findOne({ name: author }).orFail()
    .then(result => {
        alertAndLog(interaction, 'You are already registered');
    })
    .catch(err => {

        const newRegistry = new InygonAnnounceList({
            name: author
        });

        newRegistry.save()
        .then(mapping => {
            alertAndLog(interaction, 'Registered successfully');
        })
        .catch(err => {
            console.log(err);
            alertAndLog(interaction, 'Failed to register');
        })
    })
}

async function handleUnregister(interaction: ChatInputCommandInteraction, author: string) {

    InygonAnnounceList.findOneAndDelete({ name: author }).orFail()
    .then(result => {
        alertAndLog(interaction, 'Unregistered successfully');
    })
    .catch(err => {
        alertAndLog(interaction, 'You are not registered');
    })
}
