const { SlashCommandBuilder } = require('@discordjs/builders');

const common = require('../common/common');
const Permission = require('../database/models/permission');

// module.exports = {
// 	name: 'listpermissions',
//     description: 'Lists the permissions for this server',
//     usage: '',
// 	execute,
// };


module.exports = {	
	data: new SlashCommandBuilder()
		.setName('listpermissions')
		.setDescription('Lists the permissions for this server')
    ,

    async execute(interaction) {

        console.log('Guild id = ' + interaction.guild.id);
        
        Permission.find({guildId: interaction.guild.id})
        .then(mappings => {
            if (mappings.length !== 0) {
                let list = 'Permissions:\n\`\`\`Role name - Permission type\n';
                list += '---------------------------\n';

                for (let i = 0; i < mappings.length; i++) {
                    const entry = mappings[i];
                    list += entry.roleName + ' - ' + entry.type;

                    if (i < mappings.length-1) {
                        list += '\n';
                    }
                }

                list += '\`\`\`';
                interaction.reply(list);
            }
            else
                interaction.reply('There are no permissions set on this server');
        })
        .catch(err => {
            console.log(err);
            interaction.reply("Oops, something went wrong!");
        })
    }
}