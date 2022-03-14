if (require('dotenv').config().error && process.env.NODE_ENV !== 'production') {
	console.error("Failed to load .env file!");
}

const playdlAuthScript = require("./database/playdlAuthScript");
const mongodb = require('./database/mongo');

playdlAuthScript.UploadAuth();