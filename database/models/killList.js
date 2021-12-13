'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const killListSchema = new Schema(
	{
        tag: { type: String, required: true, unique: true },
	},
	{
		timestamps: false,
	},
);

module.exports = mongoose.model(
	'killList',
	killListSchema,
);