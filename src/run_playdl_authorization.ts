if (require('dotenv').config().error) {
	console.error("Failed to load .env file!");
}

import { UploadAuth } from "./database/playdlAuthScript";

UploadAuth();