import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import Permission from '../database/models/permission';


export let data = new SlashCommandBuilder()
    .setName('listpermissions')
    .setDescription('Lists the permissions for this server')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    
    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
		return;
	}

    console.log('Guild id = ' + guildId);
    
    Permission.find({guildId: guildId})
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