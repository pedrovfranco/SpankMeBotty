const common = require('../common/common');

module.exports = {
	name: 'help',
	description: 'List all of my commands or info about a specific command.',
	usage: '[command name]',
	cooldown: 5,
	execute
};

async function execute(message, args) {

    const data = [];
    const { commands } = message.client;
    const prefix = common.prefix;

    if (!args.length) {
        data.push('Here\'s a list of all my commands:');
        data.push(commands.map(command => command.name).join(', '));
        data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);
        
        return message.author.send(data, { split: true })
        .then(() => {
            if (message.channel.type === 'dm') return;
            message.reply('I\'ve sent you a DM with all my commands!');
        })
        .catch(error => {
            console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
            message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
        });
    }
    else {
        const name = args[0].toLowerCase();
        const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

        if (!command) {
            return message.reply('that\'s not a valid command!');
        }

        data.push(`**Name:** ${command.name}`);

        if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
        if (command.description) data.push(`**Description:** ${command.description}`);
        if (command.usage) {
            let lines = command.usage.split('\n');
            let reply = "";
            
            for (const line of lines) {
                reply += `\n\`${common.prefix}${command.name} ${line}\``;
            }

            data.push(`**Usage:** ${reply}`);
        } 


        if (command.cooldown)
            data.push(`**Cooldown:** ${command.cooldown} second(s)`);

        message.channel.send(data, { split: true });
    }
}