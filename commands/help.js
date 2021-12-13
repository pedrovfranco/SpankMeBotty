const common = require('../common/common');
const { SlashCommandBuilder } = require('@discordjs/builders');

// module.exports = {
// 	name: 'help',
// 	description: 'List all of my commands or info about a specific command.',
// 	usage: '[command name]',
// 	cooldown: 5,
// 	execute
// };

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('List all of my commands or info about a specific command')
        // .addStringOption(option => option
        //     .setName('command_name')
        //     .setDescription('The name of a specific command to see usage')
        // )
        ,

    async execute(interaction) {
        // let commandName = interaction.options.getString('command_name');
        // console.log(commandName);

        const data = [];
        const { commands } = common.discordClient;
        const prefix = common.prefix;
    
        // if (commandName == null) {
            data.push('Here\'s a list of all my commands:');
            data.push(commands.map(command => {
                console.log(command.data.name);

             
                return command.data.name;
            }).join(', '));
            data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);
            
            return interaction.member.user.send(data.join('\n'), { split: true })
            .then(() => {
                if (interaction.channel.type === 'dm') return;
                interaction.reply('I\'ve sent you a DM with all my commands!');
            })
            .catch(error => {
                console.error(`Could not send help DM to ${interaction.member.user.tag}.\n`, error);
                interaction.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
            });
        // }
        // else {
        //     const name = commandName.toLowerCase();
        //     const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));
    
        //     if (!command) {
        //         return interaction.reply('that\'s not a valid command!');
        //     }
    
        //     data.push(`**Name:** ${command.name}`);
    
        //     if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
        //     if (command.description) data.push(`**Description:** ${command.description}`);
        //     if (command.usage) {
        //         let lines = command.usage.split('\n');
        //         let reply = "";
                
        //         for (const line of lines) {
        //             reply += `\n\`${common.prefix}${command.name} ${line}\``;
        //         }
    
        //         data.push(`**Usage:** ${reply}`);
        //     } 
    
    
        //     if (command.cooldown)
        //         data.push(`**Cooldown:** ${command.cooldown} second(s)`);
    
        //     interaction.reply(data, { split: true });
        // }
    },
};
