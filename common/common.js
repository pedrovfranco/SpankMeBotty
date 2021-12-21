const fs = require('fs');
const path = require('path');
const axios = require('axios').default;
const querystring = require('querystring');
const httpsProxyAgent = require('https-proxy-agent');
var https = require('https');

const Emote = require('../database/models/emote');
const music = require('./music');
const Permission = require('../database/models/permission');

exports.discordClient = null;
exports.prefix = ',';
exports.audioFileFormat = 'flac';
exports.recognitionServiceEndpoint = process.env.NODE_ENV==='production' ? 'https://spank-me-botty.herokuapp.com' : 'http://localhost:' + (5000);
exports.audioFileCounter = 0;
exports.twitchToken  = { access_token: '', expires_in: 0, expiration_date: 0, token_type: ''};
exports.proxyRetryCount = 0;

const useProxy = false;
const proxyMaxRetry = 3;

exports.validObject = (obj) => {
	return (obj !== undefined && obj !== null);
}

exports.printCommand = (interaction) => {
	let msg = interaction.content.slice(exports.prefix.length);

	console.log('Received command: ' + msg);
}

exports.sendEmote = (interaction, emoteName, replyOnFail = false) => {
	
	Emote.findOne({ name: emoteName, guildId: interaction.guild.id }).orFail()
	.then(result => {

		let filepath = path.join('emotes', interaction.guild.id, result.filename);
		
		if (!fs.existsSync(filepath)) {
			// Creates directory recursively
			fs.mkdirSync(path.join('emotes', interaction.guild.id), { recursive: true});

			fs.writeFileSync(filepath, result.data, {encoding: 'binary'});
		}

		interaction.reply({
			files: [{
				attachment: filepath,
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


exports.alertAndLog = (interaction, text) => {
	interaction.reply(text);
	console.log(text);
}

exports.printUsage = (interaction, command) => {
	if (command.usage) {
		let reply = `\nUsage:`;

		let lines = command.usage.split('\n');

		for (const line of lines) {
			reply += `\n\`${exports.prefix}${command.name} ${line}\``;
		}

		return interaction.channel.send(reply);
	}
}

// This function currently calls GET requests on the  "https://api.streamelements.com/kappa/v2/speech" API.
// If for any reason this API stops working we can also use a post request with the following json body "{voice: voice, text: text}"
// to the link "https://streamlabs.com/polly/speak"
exports.playTTS = async (interaction, text = '', voice = 'Brian', callback = null) => {

    Permission.find({guildId: interaction.guild.id, type: 'tts'})
    .then(async mappings => {

        let roles = mappings.map(x => x.roleName);
        let hasRole = interaction.member.roles.cache.some(role => roles.includes(role.name));

        console.log('TTS permissions = ' + JSON.stringify(roles));

		let hasPermission = (hasRole || roles.length === 0);

        if (hasPermission) {
            let streamElementsFlag = true;
			let ttsAddress;

			if (streamElementsFlag) {
				let guild = music.getGuild(interaction);
				ttsAddress = 'https://api.streamelements.com/kappa/v2/speech?voice=' + encodeURIComponent(voice) + '&text=' + encodeURIComponent(text);

				console.log('ttsAddress = ' + ttsAddress);

				https.get(ttsAddress, (res) => {
					if (res.statusCode != 200) {
						callback({
							statusCode: res.statusCode,
							statusMessage: res.statusMessage
						});
					}
					else
						music.playTTS(interaction, guild, res, callback);
				
				});
			}
			else {
				ttsAddress = `https://ttsmp3.com/makemp3_new.php`;	


				if (text.length >= 3000) {
					this.alertAndLog(interaction, 'Message must have less than 3000 characters');
					return;
				}

				let guild = music.getGuild(interaction);
				guild.playing = -1;
				await music.stopPlaying(guild);
				// await music.clearQueue(guild);

				axios.post(ttsAddress, querystring.stringify({
					msg: text,
					lang: voice,
					source: 'ttsmp3'
				}), {

					headers: {
						"Content-Type": "application/x-www-form-urlencoded"
					},
					
					// proxy: (this.validObject(exports.proxy)) ? {
					// 	host: exports.proxy.host,
					// 	port: exports.proxy.port,
					// }
					// : null

					httpsAgent: (this.validObject(exports.proxy)) ? new httpsProxyAgent(`http://${exports.proxy.host}:${exports.proxy.port}`) : null

				}).then( async (res) => {

					const statusCode = res.status;
					const contentType = res.headers['content-type'];

					let error;
					if (statusCode !== 200) {
						error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
					} else if (!/^application\/json/.test(contentType)) {
						error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
					}
					if (error) {
						console.error(error.message);
						return;
					}

					let url = res.data["URL"];
					let errorMsg = res.data["Error"];
					// console.log(res.data);

					if (this.validObject(errorMsg) && errorMsg != '0') {
						console.log(`${errorMsg}`);

						if (useProxy) {
							if (exports.proxyRetryCount < proxyMaxRetry) {
								exports.getNewProxy().then(() => {
				
									exports.proxyRetryCount++;
				
									exports.playTTS(interaction, text, voice);
								})
							}
							else {
								console.log('Proxy retry amount exceed the max value, stopping')
							}
						}
						else {
							exports.restartAllDynos()
						}
						
						return;
					}

					exports.proxyRetryCount = 0;

					// Use Axios to download the resulting mp3 file
					let voiceConnection = await interaction.member.voice.channel.join();
					voiceConnection.play(url);

				})
				.catch((error) => {
					// handle error

					if (this.validObject(error.response)) {
						console.log(`${error.response.status}: ${error.response.statusText}`);
					}
				});
			}
        }
		else
			return false;
    })
    .catch(err => {
        console.log(err);
        interaction.channel.send("Oops, something went wrong!");
    })
}

exports.rollDice = (min = 1, max = 100) => {
	if (max < min) {
		return null;
	}

	let rnd = Math.random() * (max-min+1) + min;
	rnd = Math.floor(rnd);

	return rnd;
}

exports.getNewProxy = () => {

	console.log('Getting new proxy for tts command');

	let url = 'http://pubproxy.com/api/proxy?type=http&https=true&post=true&format=json'; // optinal parameter speed=1-60

	return new Promise((resolve, reject) => {

		axios({
			url,
			method: 'GET',
		})
		.then((res) => {

			const statusCode = res.status;
			const contentType = res.headers['content-type'];

			let error;
			if (statusCode !== 200) {
				error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
			} else if (!/^application\/json/.test(contentType)) {
				error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
			}
			if (error) {
				console.error(error.message);
				reject();
			}

			exports.proxy = {
				host: res.data.data[0].ip,
				port: res.data.data[0].port
			};

			resolve(exports.proxy);
		})
		.catch ((error) => {

			// handle error
			if (this.validObject(error.response)) {
				console.log(`${error.response.status}: ${error.response.statusText}`);
			}
			
			reject(error);
		});
	});
}

exports.registerTwitchToken = (token) => {
	exports.twitchToken = token;
	exports.twitchToken.expiration_date = Date.now() + exports.twitchToken.expires_in * 1000;

	if (exports.twitchToken.token_type.toLowerCase() === 'bearer') {
		exports.twitchToken.token_type = 'Bearer';
	}
}

exports.isTwitchTokenValid = () => {

	if (exports.twitchToken === undefined)
		return false;

	return Date.now > exports.twitchToken.expiration_date;
}

exports.formatSeconds = (input) => {

	input = parseInt(input);

	let seconds = input % 60;
	let minutes = Math.floor(input / 60);
	let hours = Math.floor(input / 60 / 60);

	if (seconds < 10) {
		seconds = '0' + seconds; 
	}

	if (minutes < 10) {
		minutes = '0' + minutes;
	}

	if (hours < 10) {
		hours = '0' + hours;
	}

	let result = "";

	if (hours > 0)
		result += hours + ':';

	result += minutes + ':';
	result += seconds;

	return result;
}

exports.restartAllDynos = () => {
	axios.delete('https://api.heroku.com/apps/spank-me-botty/dynos', {

		headers: {
			"Content-Type": "application/json",
			"Accept": "application/vnd.heroku+json; version=3",
			"Authorization": "Bearer " + process.env.HEROKU_API_AUTH_TOKEN
		}

	}).then( async (res) => {

		const statusCode = res.status;
		const contentType = res.headers['content-type'];

		let error;
		if (statusCode !== 200) {
			error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
		} else if (!/^application\/json/.test(contentType)) {
			error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
		}
		if (error) {
			console.error(error.message);
			return;
		}

		console.log('Restarting all dynos remotely...')
		
	})
}

exports.initializeCookieJar = () => {

	const axios = require('axios').default;

	const axiosCookieJarSupport = require('axios-cookiejar-support').default;
	const tough = require('tough-cookie');

	const instance = axios.create({
		// WARNING: This value will be ignored.
		jar: new tough.CookieJar(),
	});

	// Set directly after wrapping instance.
	axiosCookieJarSupport(instance);
	instance.defaults.jar = new tough.CookieJar();

	exports.axios = instance;

	// exports.axios.defaults.jar.setCookieSync('__cfduid=da3bcda890e0e8767ff80d6d24086adce1595192330', ttsAddress);
	// let cookie = exports.axios.defaults.jar.getCookieStringSync(ttsAddress);
}

