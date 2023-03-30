import { Schema, Model, model } from 'mongoose';
import { clearCache } from '../mongo';

interface IEmote {
	name: string,
	guildId: string,
	data: Buffer,
	filename: string,
	creator: string,
};

interface EmoteModel extends Model<IEmote> {
	clearCache(): void;
}
  
// The Primary Key for an emote would be a pair of {name, guildId}
const emoteSchema = new Schema<IEmote, EmoteModel>(
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

emoteSchema.index({guildId: 1, name: 1}, {unique: true});

let exportModel = model<IEmote, EmoteModel>(
	'emote',
	emoteSchema,
);

emoteSchema.static('clearCache', () => {
	clearCache(exportModel.collection.name);
});


export default exportModel;
