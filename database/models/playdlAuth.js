'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const playdlAuthSchema = new Schema(
	{
		spotifyAuth: { type: String},
		youtubeAuth: { type: String },
	},
	{
		timestamps: true,
	},
);

module.exports = mongoose.model(
	'playdlAuth',
	playdlAuthSchema,
);