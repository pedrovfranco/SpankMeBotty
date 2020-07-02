const fs = require('fs');
const {spawn} = require('child_process');
const http = require('http');

const prefix = ',';
const audioFileFormat = 'flac';
const recognitionServiceEndpoint = 'http://localhost:8080';
const killList = ['reddevil21', 'tomasbm'];

let bot;
let voiceConnection;
let audioFileCounter = 0;


exports.registerBot = function registerBot(inputBot) {
	bot = inputBot;

	bot.on('message', (message) => {
		if (!message.content.startsWith(prefix) || message.author.bot) 
			return;
	
		const cleanMsg = message.content.slice(prefix.length);
		const args = cleanMsg.split(' ');
		const command = args.shift().toLowerCase();

		if (command === 'join') {
			handleJoin(message, args);
		}
		else if (command === 'leave') {
			handleLeave(message, args);
		}
		else if (command === 'kill') {
			handleKill(message, args);
		}
		else {
			console.log('Unknown command: ' + cleanMsg);
		}

	});

}

exports.ping = function ping() {
	console.log(bot);
}

async function handleJoin(message, args) {

	printCommand(message);
	
	if (args.length !== 0) {
		message.channel.send('Join command has no arguments!');
		console.log('Join command has no arguments!');
		return;
	}
	
	if (!validObject(message.member.voice.channel)) {
		message.channel.send('User not in a voice channel!');
		console.log('User not in a voice channel!');
		return;
	}

	voiceConnection = await message.member.voice.channel.join();
	await voiceConnection.voice.setSelfMute(true);

	fixSpeakingBug();

	voiceConnection.on('speaking', (user, speaking) => {		

		if (!speaking.has('SPEAKING') || !validObject(user))
			return;

		console.log(`started listening  to ${user.username}...`);

		const filename = 'user_audio' + audioFileCounter++;
		const filepath = 'speechRecognizer/tmp_audio_files/' + filename;
		let audioStream = voiceConnection.receiver.createStream(user, {mode: 'pcm'});
		let outputStream = fs.createWriteStream(filepath);
		audioStream.pipe(outputStream);

		audioStream.on('error', (error) => {
			console.log(error);
		});

		// when the stream ends (the user stopped talking) tell the user
		audioStream.on('end', () => {
			console.log(`done listening to ${user.username}`);

			convertPCM(filepath, filename, user, message);
		});

	})

	console.log('Joined channel ' + voiceConnection.channel.name);
}

function convertPCM(filepath, filename, user, message) {
	const newFilepath = filepath + '.' + audioFileFormat;
	const newFilename = filename + '.' + audioFileFormat;

	const spawnedProcess = spawn('ffmpeg', ['-nostdin', '-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', filepath, '-ar', '16000', '-ac', '1', newFilepath]);

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
			console.log("ffmpeg was successful");
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

	http.get(recognitionServiceEndpoint + '/recognize/' + filename, (res) => {

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

async function handleLeave(message, args) {

	printCommand(message);
	
	if (args.length !== 0) {
		message.channel.send('Leave command has no arguments!');
		console.log('Leave command has no arguments!');
		return;
	}
	
	if (!validObject(voiceConnection) || voiceConnection.status === 4) {
		message.channel.send("I'm not in a voice channel!");
		console.log("I'm not in a voice channel!");
		return;
	}

	voiceConnection.disconnect();

	console.log('Left channel');
}

async function handleKill(message, args) {

	if (args.length !== 1) {
		message.channel.send('yikes');
		return;
	}

	message.channel.send("( ͡° ͜ʖ ͡°)=ε/̵͇̿̿/'̿̿ ̿ ̿̿ ̿ ̿   " + args[0]);
	let guildMember = message.guild.member(args[0]);

	console.log(guildMember.user.tag);

	if (killList.includes(guildMember.user.tag)) {
		message.channel.send("Say your prayers :)");

		setTimeout((guildMember) => {
			guildMember.voice.kick();

		}, 3000, guildMember);

	}
	else {
		message.channel.send("Looks like you escaped :(");
	}

}


function validObject(obj) {
	return (obj !== undefined && obj !== null);
}

function printCommand(message) {
	let msg = message.content.slice(prefix.length);

	console.log('Received command: ' + msg);
}


const { Readable } = require('stream');
const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);

class Silence extends Readable {
	  _read() {
		this.push(SILENCE_FRAME);
		this.destroy();
	}
 }

function fixSpeakingBug() {
	voiceConnection.play(new Silence(), { type: 'opus' });
}
