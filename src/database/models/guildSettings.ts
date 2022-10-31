import {Schema, model } from 'mongoose';

interface IGuildSettings {
	guildId: string
	musicvolume: number
};

const guildSettingsSchema = new Schema<IGuildSettings>(
	{
		guildId: { type: String, required: true},
		musicvolume: { type: Number, required: true},
	},
	{
		timestamps: true,
	},
);

export default model<IGuildSettings>(
	'guildSettings',
	guildSettingsSchema,
);