const { SlashCommandBuilder, PermissionsBitField  } = require('discord.js');

const Permission = require('../database/models/permission');

// module.exports = {
// 	name: 'setpermission',
//     description: 'Set a permission for a specific role (e.g. tts)',
//     usage: '<role_name> <permission_type>',
// 	execute,
// };


module.exports = {	
	data: new SlashCommandBuilder()
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
		,


	async execute(interaction) {

		let roleName = interaction.options.getString('role_name');
		let permissionType = interaction.options.getString('permission_type');

		if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
			interaction.reply('You require permission to manage roles in this server to use that command!');
			return;
		}

		let permissionJson = {guildId: interaction.guild.id, roleName: roleName, type: permissionType};

		Permission.findOne(permissionJson).orFail()
		.then(() => {
			interaction.reply('That permission already exists!');
		})
		.catch(err => {
			const newPermission = new Permission(permissionJson);

			newPermission.save()
			.then(mapping => {
				console.log('Saved permission ' + JSON.stringify(permissionJson));
				interaction.reply('Saved permission successfully');
			})
			.catch(err => {
				let errorMsg = 'Failed to save ' + emoteName;
	
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
}