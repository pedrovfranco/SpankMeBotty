import {Schema, model } from 'mongoose';

interface IPlaydlAuth {
	spotifyAuth: string,
	youtubeAuth: string,
}

const playdlAuthSchema = new Schema<IPlaydlAuth>(
	{
		spotifyAuth: { type: String},
		youtubeAuth: { type: String },
	},
	{
		timestamps: true,
	},
);

export default model<IPlaydlAuth>(
	'playdlAuth',
	playdlAuthSchema,
);