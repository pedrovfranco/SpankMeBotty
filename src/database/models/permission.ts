import {Schema, model } from 'mongoose';

interface IPermission {
	guildId: string,
	roleName: string,
	type: string,
};

const permissionSchema = new Schema<IPermission>(
	{
		guildId: { type: String, required: true},
		roleName: { type: String, required: true },
		type: { type: String, required: true },
	},
	{
		timestamps: true,
	},
);

export default model<IPermission>(
	'permission',
	permissionSchema,
);