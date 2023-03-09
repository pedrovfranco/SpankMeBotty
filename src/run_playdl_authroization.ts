if (require('dotenv').config().error) {
	console.error("Failed to load .env file!");
}

import { UploadAuth } from "./database/playdlAuthScript";
import * as asmongodb from './database/mongo';

UploadAuth();