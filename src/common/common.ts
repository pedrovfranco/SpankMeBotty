import { ChatInputCommandInteraction, GuildMember, Client, Message, BaseInteraction } from 'discord.js';
import fs from 'fs';
import path from 'path';
import https from 'https';

import Emote from '../database/models/emote';
import {playTTS as playMusicTTS} from './music';
import {PermissionType, hasPermission} from './permissions';

export let prefix = ',';
export let twitchToken: TwitchToken = { access_token: '', expires_in: 0, expiration_date: 0, token_type: ''};
export let client: Client<boolean> | undefined = undefined;

const useProxy = false;
const availableVoices = ["Filiz", "Astrid", "Tatyana", "Maxim", "Carmen", "Ines", "Cristiano", "Vitoria", "Ricardo", "Maja", "Jan", "Jacek", "Ewa", "Ruben", "Lotte", "Liv", "Seoyeon", "Takumi", "Mizuki", "Giorgio", "Carla", "Bianca", "Karl", "Dora", "Mathieu", "Celine", "Chantal", "Penelope", "Miguel", "Mia", "Enrique", "Conchita", "Geraint", "Salli", "Matthew", "Kimberly", "Kendra", "Justin", "Joey", "Joanna", "Ivy", "Raveena", "Aditi", "Emma", "Brian", "Amy", "Russell", "Nicole", "Vicki", "Marlene", "Hans", "Naja", "Mads", "Gwyneth", "Zhiyu", "es-LA_SofiaVoice", "pt-BR_IsabelaVoice", "en-US_MichaelVoice", "ja-JP_EmiVoice", "en-US_AllisonVoice", "fr-FR_ReneeVoice", "it-IT_FrancescaVoice", "es-ES_LauraVoice", "de-DE_BirgitVoice", "es-ES_EnriqueVoice", "de-DE_DieterVoice", "en-US_LisaVoice", "en-GB_KateVoice", "es-US_SofiaVoice", "es-ES-Standard-A", "it-IT-Standard-A", "it-IT-Wavenet-A", "ja-JP-Standard-A", "ja-JP-Wavenet-A", "ko-KR-Standard-A", "ko-KR-Wavenet-A", "pt-BR-Standard-A", "tr-TR-Standard-A", "sv-SE-Standard-A", "nl-NL-Standard-A", "nl-NL-Wavenet-A", "en-US-Wavenet-A", "en-US-Wavenet-B", "en-US-Wavenet-C", "en-US-Wavenet-D", "en-US-Wavenet-E", "en-US-Wavenet-F", "en-GB-Standard-A", "en-GB-Standard-B", "en-GB-Standard-C", "en-GB-Standard-D", "en-GB-Wavenet-A", "en-GB-Wavenet-B", "en-GB-Wavenet-C", "en-GB-Wavenet-D", "en-US-Standard-B", "en-US-Standard-C", "en-US-Standard-D", "en-US-Standard-E", "de-DE-Standard-A", "de-DE-Standard-B", "de-DE-Wavenet-A", "de-DE-Wavenet-B", "de-DE-Wavenet-C", "de-DE-Wavenet-D", "en-AU-Standard-A", "en-AU-Standard-B", "en-AU-Wavenet-A", "en-AU-Wavenet-B", "en-AU-Wavenet-C", "en-AU-Wavenet-D", "en-AU-Standard-C", "en-AU-Standard-D", "fr-CA-Standard-A", "fr-CA-Standard-B", "fr-CA-Standard-C", "fr-CA-Standard-D", "fr-FR-Standard-C", "fr-FR-Standard-D", "fr-FR-Wavenet-A", "fr-FR-Wavenet-B", "fr-FR-Wavenet-C", "fr-FR-Wavenet-D", "da-DK-Wavenet-A", "pl-PL-Wavenet-A", "pl-PL-Wavenet-B", "pl-PL-Wavenet-C", "pl-PL-Wavenet-D", "pt-PT-Wavenet-A", "pt-PT-Wavenet-B", "pt-PT-Wavenet-C", "pt-PT-Wavenet-D", "ru-RU-Wavenet-A", "ru-RU-Wavenet-B", "ru-RU-Wavenet-C", "ru-RU-Wavenet-D", "sk-SK-Wavenet-A", "tr-TR-Wavenet-A", "tr-TR-Wavenet-B", "tr-TR-Wavenet-C", "tr-TR-Wavenet-D", "tr-TR-Wavenet-E", "uk-UA-Wavenet-A", "ar-XA-Wavenet-A", "ar-XA-Wavenet-B", "ar-XA-Wavenet-C", "cs-CZ-Wavenet-A", "nl-NL-Wavenet-B", "nl-NL-Wavenet-C", "nl-NL-Wavenet-D", "nl-NL-Wavenet-E", "en-IN-Wavenet-A", "en-IN-Wavenet-B", "en-IN-Wavenet-C", "fil-PH-Wavenet-A", "fi-FI-Wavenet-A", "el-GR-Wavenet-A", "hi-IN-Wavenet-A", "hi-IN-Wavenet-B", "hi-IN-Wavenet-C", "hu-HU-Wavenet-A", "id-ID-Wavenet-A", "id-ID-Wavenet-B", "id-ID-Wavenet-C", "it-IT-Wavenet-B", "it-IT-Wavenet-C", "it-IT-Wavenet-D", "ja-JP-Wavenet-B", "ja-JP-Wavenet-C", "ja-JP-Wavenet-D", "cmn-CN-Wavenet-A", "cmn-CN-Wavenet-B", "cmn-CN-Wavenet-C", "cmn-CN-Wavenet-D", "nb-no-Wavenet-E", "nb-no-Wavenet-A", "nb-no-Wavenet-B", "nb-no-Wavenet-C", "nb-no-Wavenet-D", "vi-VN-Wavenet-A", "vi-VN-Wavenet-B", "vi-VN-Wavenet-C", "vi-VN-Wavenet-D", "sr-rs-Standard-A", "lv-lv-Standard-A", "is-is-Standard-A", "bg-bg-Standard-A", "af-ZA-Standard-A", "Tracy", "Danny", "Huihui", "Yaoyao", "Kangkang", "HanHan", "Zhiwei", "Asaf", "An", "Stefanos", "Filip", "Ivan", "Heidi", "Herena", "Kalpana", "Hemant", "Matej", "Andika", "Rizwan", "Lado", "Valluvar", "Linda", "Heather", "Sean", "Michael", "Karsten", "Guillaume", "Pattara", "Jakub", "Szabolcs", "Hoda", "Naayf"];
export const readableNameVoices = availableVoices.filter(x=>!x.includes('-') && !x.includes('_')).sort();

class TwitchToken {
	access_token: string;
	expires_in: number;
	expiration_date: number;
	token_type: string;

	constructor(access_token: string, expires_in: number, token_type: string) {
		this.access_token = access_token;
		
		this.expires_in = expires_in;
		this.expiration_date = Date.now() + expires_in * 1000;

		this.token_type = token_type;
		if (token_type.toLowerCase() === 'bearer') {
			this.token_type = 'Bearer';
		}
	}
}

export function userInVoiceChannel(interaction: BaseInteraction) {
	return (interaction.member instanceof GuildMember) && interaction.member.voice != undefined && interaction.member.voice.channel != undefined;
}

export function sendEmote(interaction: ChatInputCommandInteraction | Message<boolean>, emoteName: string, replyOnFail: boolean = false): void {
	
	if (interaction.guild == undefined) {
		return;
	}

	Emote.findOne({ name: emoteName, guildId: interaction.guild.id }).orFail()
	.then(result => {
	
		if (interaction.guild == undefined) {
			return;
		}
		
		let folderPath = path.join(__dirname, '..', 'emotes', interaction.guild.id);
		let filePath = path.join(folderPath, result.filename);
		
		if (!fs.existsSync(filePath)) {
			// Creates directory recursively
			fs.mkdirSync(folderPath, { recursive: true});

			fs.writeFileSync(filePath, result.data, {encoding: 'binary'});
		}	

		interaction.reply({
			files: [{
				attachment: filePath,
			}]
		})
		.then((res) => {
		})
		.catch((err) => {
			console.log('Failed to send ' + emoteName);
			console.error(err);
		});
	})
	.catch(err => {
		if (replyOnFail)
			interaction.reply('That emote does not exist! To add it use the /emoteconfig register command.');
	})
}

export async function alertAndLog(interaction: BaseInteraction, text: string) {
	console.log(text);
	if (interaction.isRepliable()) {
		if (interaction.replied || interaction.deferred) 
			await interaction.editReply(text);
		else
			await interaction.reply(text);
	}
}

// This function currently calls GET requests on the  "https://api.streamelements.com/kappa/v2/speech" API.
// If for any reason this API stops working we can also use a post request with the following json body "{voice: voice, text: text}"
// to the link "https://streamlabs.com/polly/speak"
export async function playTTS(interaction: ChatInputCommandInteraction, text: string = '', voice: string = 'Brian', callback?: (errorType?: string, errorMsg?: string) => void) {

	if (interaction.guild == undefined) {
		return;
	}

    let {userHasPermission, roles} = await hasPermission(interaction, PermissionType.tts);

	if (!userHasPermission) {
		let callbackStr = 'You dont have the required permission to use the TTS command. ';
		
		if (roles.length === 1)
			callbackStr += 'You need the ' + roles[0] + ' role.';
		else {
			callbackStr += 'You need one of the following roles: ';

			for (let i = 0; i < roles.length; i++) {
				callbackStr += roles[i];

				if (i === roles.length - 1) // Last element of the 'roles' array
					callbackStr += ', ';
			}
		}
		
		callback?.call(null, 'permissionError', callbackStr);
		return;
	}

	let streamElementsFlag = true;
	let ttsAddress;

	if (streamElementsFlag) {
		ttsAddress = 'https://api.streamelements.com/kappa/v2/speech?voice=' + encodeURIComponent(voice) + '&text=' + encodeURIComponent(text);

		console.log('ttsAddress = ' + ttsAddress);

		https.get(ttsAddress, (res) => {
			if (res.statusCode != 200) {
				callback?.call(null, 'requestError', JSON.stringify({
					statusCode: res.statusCode,
					statusMessage: res.statusMessage
				}));
			}
			else {
				playMusicTTS(interaction, res, callback);
			}
		
		});
	}
	else {
		// ttsAddress = `https://ttsmp3.com/makemp3_new.php`;	


		// if (text.length >= 3000) {
		// 	this.alertAndLog(interaction, 'Message must have less than 3000 characters');
		// 	return;
		// }

		// let guild = music.getGuild(interaction);
		// guild.playing = -1;
		// await music.stopPlaying(guild);
		// // await music.clearQueue(guild);

		// axios.post(ttsAddress, querystring.stringify({
		// 	msg: text,
		// 	lang: voice,
		// 	source: 'ttsmp3'
		// }), {

		// 	headers: {
		// 		"Content-Type": "application/x-www-form-urlencoded"
		// 	},
			
		// 	// proxy: (this.validObject(exports.proxy)) ? {
		// 	// 	host: exports.proxy.host,
		// 	// 	port: exports.proxy.port,
		// 	// }
		// 	// : null

		// 	httpsAgent: (this.validObject(exports.proxy)) ? new httpsProxyAgent(`http://${exports.proxy.host}:${exports.proxy.port}`) : null

		// }).then( async (res) => {

		// 	const statusCode = res.status;
		// 	const contentType = res.headers['content-type'];

		// 	let error;
		// 	if (statusCode !== 200) {
		// 		error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
		// 	} else if (!/^application\/json/.test(contentType)) {
		// 		error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
		// 	}
		// 	if (error) {
		// 		console.error(error.message);
		// 		return;
		// 	}

		// 	let url = res.data["URL"];
		// 	let errorMsg = res.data["Error"];
		// 	// console.log(res.data);

		// 	if (this.validObject(errorMsg) && errorMsg != '0') {
		// 		console.log(`${errorMsg}`);

		// 		if (useProxy) {
		// 			if (exports.proxyRetryCount < proxyMaxRetry) {
		// 				exports.getNewProxy().then(() => {
		
		// 					exports.proxyRetryCount++;
		
		// 					exports.playTTS(interaction, text, voice);
		// 				})
		// 			}
		// 			else {
		// 				console.log('Proxy retry amount exceed the max value, stopping')
		// 			}
		// 		}
		// 		else {
		// 			exports.restartAllDynos()
		// 		}
				
		// 		return;
		// 	}

		// 	exports.proxyRetryCount = 0;

		// 	// Use Axios to download the resulting mp3 file
		// 	let voiceConnection = await interaction.member.voice.channel.join();
		// 	voiceConnection.play(url);

		// })
		// .catch((error) => {
		// 	// handle error

		// 	if (this.validObject(error.response)) {
		// 		console.log(`${error.response.status}: ${error.response.statusText}`);
		// 	}
		// });
	}
}

export function rollDice(min: number = 1, max: number = 100): number | undefined {
	if (max < min) {
		return undefined;
	}

	let rnd = Math.random() * (max-min+1) + min;
	rnd = Math.floor(rnd);
	return rnd;
}

// function getNewProxy() {

// 	console.log('Getting new proxy for tts command');

// 	let url = 'http://pubproxy.com/api/proxy?type=http&https=true&post=true&format=json'; // optinal parameter speed=1-60

// 	return new Promise((resolve, reject) => {

// 		axios({
// 			url,
// 			method: 'GET',
// 		})
// 		.then((res) => {

// 			const statusCode = res.status;
// 			const contentType = res.headers['content-type'];

// 			let error;
// 			if (statusCode !== 200) {
// 				error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
// 			} else if (!/^application\/json/.test(contentType)) {
// 				error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
// 			}
// 			if (error) {
// 				console.error(error.message);
// 				reject();
// 			}

// 			exports.proxy = {
// 				host: res.data.data[0].ip,
// 				port: res.data.data[0].port
// 			};

// 			resolve(exports.proxy);
// 		})
// 		.catch ((error) => {

// 			// handle error
// 			if (this.validObject(error.response)) {
// 				console.log(`${error.response.status}: ${error.response.statusText}`);
// 			}
			
// 			reject(error);
// 		});
// 	});
// }

export function registerTwitchToken(token: any) {
	twitchToken = new TwitchToken(token.access_token, token.expires_in, token.token_type);
}
 
export function isTwitchTokenValid() {

	if (twitchToken === undefined)
		return false;

	return Date.now() > twitchToken.expiration_date;
}

export function formatSeconds(input: number) {

	let seconds = input % 60;
	let minutes = Math.floor(input / 60) % 60;
	let hours = Math.floor(input / 60 / 60);

	let secondsStr: string = seconds.toString();
	let minutesStr: string = minutes.toString();
	let hoursStr: string = hours.toString();

	if (seconds < 10) {
		secondsStr = '0' + secondsStr; 
	}

	if (minutes < 10) {
		minutesStr = '0' + minutesStr;
	}

	if (hours < 10) {
		hoursStr = '0' + hoursStr;
	}

	let result = "";

	if (hours > 0)
		result += hoursStr + ':';

	result += minutesStr + ':';
	result += secondsStr;

	return result;
}

// export function restartAllDynos() {
// 	axios.delete('https://api.heroku.com/apps/spank-me-botty/dynos', {

// 		headers: {
// 			"Content-Type": "application/json",
// 			"Accept": "application/vnd.heroku+json; version=3",
// 			"Authorization": "Bearer " + process.env.HEROKU_API_AUTH_TOKEN
// 		}

// 	}).then( async (res) => {

// 		const statusCode = res.status;
// 		const contentType = res.headers['content-type'];

// 		let error;
// 		if (statusCode !== 200 || contentType == undefined) {
// 			error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
// 		} else if (!/^application\/json/.test(contentType)) {
// 			error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
// 		}
// 		if (error) {
// 			console.error(error.message);
// 			return;
// 		}

// 		console.log('Restarting all dynos remotely...')
		
// 	})
// }

// export function initializeCookieJar() {

// 	const axios = require('axios').default;

// 	const axiosCookieJarSupport = require('axios-cookiejar-support').default;
// 	const tough = require('tough-cookie');

// 	const instance = axios.create({
// 		// WARNING: This value will be ignored.
// 		jar: new tough.CookieJar(),
// 	});

// 	// Set directly after wrapping instance.
// 	axiosCookieJarSupport(instance);
// 	instance.defaults.jar = new tough.CookieJar();

// 	exports.axios = instance;

// 	// exports.axios.defaults.jar.setCookieSync('__cfduid=', ttsAddress);
// 	// let cookie = exports.axios.defaults.jar.getCookieStringSync(ttsAddress);
// }


export function isValidInteraction(interaction: ChatInputCommandInteraction): boolean {
	return (interaction.guild != undefined && interaction.guild.available && interaction.member instanceof GuildMember)
}