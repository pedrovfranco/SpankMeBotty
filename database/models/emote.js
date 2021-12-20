'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// The Primary Key for an emote would be a pair of {name, guildId}
const emoteSchema = new Schema(
	{
		name: { type: String, required: true },
		guildId: { type: String, required: true},
		data: { type: mongoose.SchemaTypes.Buffer, required: true },
		filename: { type: String, required: true },
		creator: { type: String, required: true },
	},
	{
		timestamps: false,
	},
);

module.exports = mongoose.model(
	'emote',
	emoteSchema,
);