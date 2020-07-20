
const fs = require('fs');
const path = require('path');
const axios = require('axios').default;
const querystring = require('querystring');
const httpsProxyAgent = require('https-proxy-agent');

const Emote = require('./database/models/emote');

exports.prefix = ',';
exports.audioFileFormat = 'flac';
exports.recognitionServiceEndpoint = process.env.NODE_ENV==='production' ? 'https://spank-me-botty.herokuapp.com' : 'http://localhost:' + (5000);
exports.audioFileCounter = 0;


exports.validObject = (obj) => {
	return (obj !== undefined && obj !== null);
}

exports.printCommand = (message) => {
	let msg = message.content.slice(exports.prefix.length);

	console.log('Received command: ' + msg);
}


exports.sendEmote = (message, emoteName) => {
	Emote.findOne({ name: emoteName }).orFail()
	.then(result => {

		let filepath = path.join('emotes', result.filename);
		
		if (!fs.existsSync(filepath))
			fs.writeFileSync(filepath, result.data, {encoding: 'binary'});

		let cleanTag = message.author.tag.substr(0, message.author.tag.indexOf('#'));

		message.channel.send(cleanTag, {
			files: [{
				attachment: filepath,
			  }]
		})
		.then((res) => {
			message.delete()
			.catch(console.error);
		})
		.catch((err) => {
			console.log('Failed to send ' + emoteName);
			console.error(err);
		});
	})
	.catch(err => {
	})

}

exports.alertAndLog = (message, text) => {
	message.channel.send(text);
	console.log(text);
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


exports.playTTS = async (message, text = '', voice = 'Brian') => {


	let ttsAddress = `https://ttsmp3.com/makemp3_new.php`;

	if (text.length >= 3000) {
		this.alertAndLog(message, 'Message must have less than 3000 characters');
		return;
	}

	let proxyLink

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

			exports.getNewProxy().then(() => {
				exports.playTTS(message, text, voice);
			})

			return;
		}

		// let voiceConnection = await message.member.voice.channel.join();
		// voiceConnection.play(url);

		// Use Axios to download the resulting mp3 file
		axios({
			url,
			method: 'GET',
			responseType: 'stream',
			headers: {
				"accept": "audio/mpeg",
			},

		})
		.then( (res) => {

			const statusCode = res.status;

			let error;
			if (statusCode !== 200) {
				error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
			}

			if (error) {
				console.error(error.message);
				return;
			}

			let filePath = path.join(__dirname, 'tts_files', 'temp.mp3');
			// fs.writeFileSync(filePath, res.data, { encoding: 'binary'});
			
			let outStream = fs.createWriteStream(filePath)

			let promise = new Promise((resolve, reject) => {
				res.data.pipe(outStream);
				let error = null;
				outStream.on('error', err => {
					error = err;
					outStream.close();
					reject(err);
				});
				outStream.on('close', () => {
					if (!error) {
						resolve(true);
					}
				});
			})
			.then( async (res) => {

				let voiceConnection = await message.member.voice.channel.join();
				voiceConnection.play(filePath);

			})
			.catch( (error) => {
				console.log(error);
			})

			return promise;
		})
	})
	.catch((error) => {
		// handle error

		if (this.validObject(error.response)) {
			console.log(`${error.response.status}: ${error.response.statusText}`);
		}
	});
}


exports.getNewProxy = () => {

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