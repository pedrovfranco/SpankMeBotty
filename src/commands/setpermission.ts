import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionsBitField, GuildMember } from 'discord.js';

import Permission from '../database/models/permission';


export let data = new SlashCommandBuilder()
	.setName('setpermission')
	.setDescription('Sets a permission for a specific role on this server')
	.addStringOption(option => option
		.setName('role_name')
		.setDescription('The name of the discord role associated with this permission')
		.setRequired(true)
	)
	.addStringOption(option => option
		.setName('permission_type')
		.setDescription('The permission type')
		.setRequired(true)
	)

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

	let roleName = interaction.options.getString('role_name' ,true);
	let permissionType = interaction.options.getString('permission_type', true);

	if (!(interaction.member instanceof GuildMember) || interaction.memberPermissions == undefined || interaction.guild == undefined) {
		return;
	}

	if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
		interaction.reply('You require permission to manage roles in this server to use that command!');
		return;
	}

	let permissionObj = {guildId: interaction.guild.id, roleName: roleName, type: permissionType};

	Permission.findOne(permissionObj).orFail()
	.then(() => {
		interaction.reply('That permission already exists!');
	})
	.catch(err => {
		const newPermission = new Permission(permissionObj);

		newPermission.save()
		.then(mapping => {
			console.log('Saved permission ' + JSON.stringify(permissionObj));
			interaction.reply('Saved permission successfully');
		})
		.catch(err => {
			let errorMsg = 'Failed to save ';

			if (err.code === 11000) {
				errorMsg += ', name already exists';
			}
			else {
				errorMsg += ', unknown error';
				console.log(err);
			}

			interaction.reply(errorMsg);
		});

	});
}