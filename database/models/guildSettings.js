'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const guildSettingsSchema = new Schema(
	{
		guildId: { type: String, required: true},
		musicvolume: { type: Number, required: true},
	},
	{
		timestamps: true,
	},
);

module.exports = mongoose.model(
	'guildSettings',
	guildSettingsSchema,
);