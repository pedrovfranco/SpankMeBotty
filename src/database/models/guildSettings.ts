import {Schema, model } from 'mongoose';

interface IGuildSettings {
	guildId: string
	musicvolume: number
	soundboardVolume: number
};

const guildSettingsSchema = new Schema<IGuildSettings>(
	{
		guildId: { type: String, required: true},
		musicvolume: { type: Number, required: true},
		soundboardVolume: { type: Number, required: true},
	},
	{
		timestamps: true,
	},
);

// The Primary Key for guild settings should be the {guildId}
guildSettingsSchema.index({guildId: 1}, {unique: true});

export default model<IGuildSettings>(
	'guildSettings',
	guildSettingsSchema,
);