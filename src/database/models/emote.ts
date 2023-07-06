import {Schema, model } from 'mongoose';

interface IEmote {
	name: string,
	guildId: string,
	data: Buffer,
	filename: string,
	creator: string,
};

const emoteSchema = new Schema<IEmote>(
	{
		name: { type: String, required: true },
		guildId: { type: String, required: true },
		data: { type: Buffer, required: true },
		filename: { type: String, required: true },
		creator: { type: String, required: true },
	},
	{
		timestamps: false,
	},
);

// The Primary Key for an emote would be a pair of {name, guildId}
emoteSchema.index({guildId: 1, name: 1}, {unique: true});

export default model<IEmote>(
	'emote',
	emoteSchema,
);