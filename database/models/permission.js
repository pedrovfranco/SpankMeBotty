'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const permissionSchema = new Schema(
	{
		guildId: { type: String, required: true},
		roleName: { type: String, required: true },
		type: { type: String, required: true },
	},
	{
		timestamps: true,
	},
);

module.exports = mongoose.model(
	'permission',
	permissionSchema,
);