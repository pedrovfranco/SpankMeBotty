if (require('dotenv').config({ quiet: true }).error) {
	console.error("Failed to load .env file!");
}

import { UploadAuth } from "./database/playdlAuthScript";

UploadAuth();