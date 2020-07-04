const common = require('../common');
const fs = require('fs');
const {spawn} = require('child_process');
const http = require('http');
const path = require('path');
const pathToFfmpeg = require('ffmpeg-static');

module.exports = {
	name: 'join',
	description: 'Joins the voice channel!',
	execute
};

async function execute(message, args) {

	if (args.length !== 0) {
		message.channel.send('Join command has no arguments!');
		console.log('Join command has no arguments!');
		return;
	}
	
	if (!common.validObject(message.member.voice.channel)) {
		message.channel.send('User not in a voice channel!');
		console.log('User not in a voice channel!');
		return;
	}

	let voiceConnection = await message.member.voice.channel.join();
	await voiceConnection.voice.setSelfMute(true);

	fixSpeakingBug(voiceConnection);

	voiceConnection.on('speaking', (user, speaking) => {		

		if (!speaking.has('SPEAKING') || !common.validObject(user))
			return;

		// console.log(`started listening  to ${user.username}...`);

		const filename = 'user_audio' + common.audioFileCounter++;
		const filepath = 'speechRecognizer/tmp_audio_files/' + filename;
		let audioStream = voiceConnection.receiver.createStream(user, {mode: 'pcm'});
		let outputStream = fs.createWriteStream(path.join(__dirname, '..', filepath));
		audioStream.pipe(outputStream);

		audioStream.on('error', (error) => {
			console.log(error);
		});

		// when the stream ends (the user stopped talking) tell the user
		audioStream.on('end', () => {
			// console.log(`done listening to ${user.username}`);

			convertPCM(filepath, filename, user, message);
		});

	})

	console.log('Joined channel ' + voiceConnection.channel.name);
}

function convertPCM(filepath, filename, user, message) {
    filepath = path.resolve(__dirname, '..', filepath);

	const newFilepath = filepath + '.' + common.audioFileFormat;
	const newFilename = filename + '.' + common.audioFileFormat;

	const spawnedProcess = spawn(pathToFfmpeg, ['-nostdin', '-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', filepath, '-ar', '16000', '-ac', '1', newFilepath]);

	spawnedProcess.on('error', function (err) {
		console.log("FFmpeg was not found");
	});

	spawnedProcess.stdout.on('data', function (data) {
		console.log('ffmpeg: ' + data.toString());
	});

	spawnedProcess.stderr.on('data', function (data) {
		// console.log('ffmpeg: ' + data.toString());
	});

	spawnedProcess.on('exit', function (code) {

		if (code === 0) {
		}
		else {
			console.log("ffmpeg failed");
		}
		
		fs.unlink(filepath, () => {
			requestRecognition(newFilename, user, message);
		});
	});
}

function requestRecognition(filename, user, message) {

	http.get(common.recognitionServiceEndpoint + '/recognize/' + filename, (res) => {

		const { statusCode } = res;
		const contentType = res.headers['content-type'];

		let error;
		if (statusCode !== 200) {
			error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
		} else if (!/^application\/json/.test(contentType)) {
			error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
		}
		if (error) {
			console.error(error.message);
			// Consume response data to free up memory
			res.resume();
			return;
		}

		res.setEncoding('utf8');
		let rawData = '';
		res.on('data', (chunk) => { rawData += chunk; });
		res.on('end', () => {
			try {
				const parsedData = JSON.parse(rawData);

				if (parsedData.success) {
					console.log(parsedData);

					let channel = message.guild.channels.resolve('728239336214102116');

					if (channel.type === "text") {
						channel.send('Watch your profanity ' + user.toString());
					}
				}

			} catch (e) {
				console.error(e.message);
			}
		});
	}).on('error', (e) => {
	  console.error(`Got error: ${e.message}`);
	});

}

const { Readable } = require('stream');
const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);

class Silence extends Readable {
	  _read() {
		this.push(SILENCE_FRAME);
		this.destroy();
	}
 }

function fixSpeakingBug(voiceConnection) {
	voiceConnection.play(new Silence(), { type: 'opus' });
}
