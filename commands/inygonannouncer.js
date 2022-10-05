const { SlashCommandBuilder } = require('discord.js');

const common = require('../common/common');
const InygonAnnounceList = require('../database/models/inygonAnnounceList');

// module.exports = {
//     name: 'inygonannouncer',
//     description: 'Manages the inygon announcer',
//     args: true,
//     minargs: 1,
//     usage: 'register\nunregister',
//     execute,
// };

// name: 'inygonannouncer',


module.exports = {	
	data: new SlashCommandBuilder()
		.setName('inygonannouncer')
		.setDescription('Manages the inygon announcer')
        .addSubcommand(subcommand => subcommand
            .setName('register')
            .setDescription('Registers the user on the inygon announcer')
        )
        .addSubcommand(subcommand => subcommand
            .setName('unregister')
            .setDescription('Registers the user on the inygon announcer')
        ),

    handleRegister: handleRegister,
    handleUnregister: handleUnregister,
        
    async execute(interaction) {
        let commandType = interaction.options.getSubcommand();

        let author = interaction.member.user;

        if (commandType === 'register') {
            handleRegister(interaction, author);
        }
        else if (commandType === 'unregister') {
            handleUnregister(interaction, author);
        }
    },
}

async function handleRegister(interaction, author) {

    InygonAnnounceList.findOne({ name: author.toString() }).orFail()
    .then(result => {
        common.alertAndLog(interaction, 'You are already registered');
    })
    .catch(err => {

        const newRegistry = new InygonAnnounceList({
            name: author
        });

        newRegistry.save()
        .then(mapping => {
            common.alertAndLog(interaction, 'Registered successfully');
        })
        .catch(err => {
            console.log(err);
            common.alertAndLog(interaction, 'Failed to register');
        })
    })
}

async function handleUnregister(interaction, author) {

    InygonAnnounceList.findOneAndDelete({ name: author.toString() }).orFail()
    .then(result => {
        common.alertAndLog(interaction, 'Unregistered successfully');
    })
    .catch(err => {
        common.alertAndLog(interaction, 'You are not registered');
    })
}
