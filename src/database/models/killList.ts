import {Schema, model } from 'mongoose';

interface IKillList {
	tag: string
};

const killListSchema = new Schema<IKillList>(
	{
        tag: { type: String, required: true, unique: true },
	},
	{
		timestamps: false,
	},
);

export default model<IKillList>(
	'killList',
	killListSchema,
);