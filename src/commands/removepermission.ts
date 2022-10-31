import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionsBitField, GuildMember } from 'discord.js';

import Permission from '../database/models/permission';


export let data = new SlashCommandBuilder()
	.setName('removepermission')
	.setDescription('Removes a permission for a specific role (e.g. tts)')
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

	if (!(interaction.member instanceof GuildMember) || interaction.memberPermissions == undefined || interaction.guild == undefined) {
		return;
	}

	if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
		interaction.reply('You require permission to manage roles to use that command!');
		return;
	}

	let roleName = interaction.options.getString('role_name', true);
	let permissionType = interaction.options.getString('permission_type', true);

	let permissionObject = {guildId: interaction.guild.id, roleName: roleName, type: permissionType};

	Permission.findOneAndDelete(permissionObject).orFail()
	.then( result => {
		interaction.reply("Successfully removed the permission");
	})
	.catch(err => {
		interaction.reply("Failed to remove, that permission does not exist!");
	});
}