'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const emoteSchema = new Schema(
	{
		name: { type: String, required: true, unique: true },
		filepath: { type: String, required: true },
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