const fs = require('fs');
const {spawn} = require('child_process');

let bot;
let voiceConnection;
const prefix = ',';
let counter = 0;

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

		if (!speaking.has('SPEAKING') || !validObject(user) || user.username !== 'pedrofixe')
			return;

		console.log(`started listening  to ${user.username}...`);

		let filename = 'user_audio' + counter++;
		let audioStream = voiceConnection.receiver.createStream(user, {mode: 'pcm'});
		let outputStream = fs.createWriteStream(filename);
		audioStream.pipe(outputStream);

		audioStream.on('error', (error) => {
			console.log(error);
		});

		// when the stream ends (the user stopped talking) tell the user
		audioStream.on('end', () => {
			console.log(`done listening to ${user.username}`);

			convertPCMToOpus(filename);
		});

	})

	console.log('Joined channel ' + voiceConnection.channel.name);
}

function convertPCMToOpus(filename) {
	
	const spawnedProcess = spawn('ffmpeg', ['-nostdin', '-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', filename, filename + '.ogg']);

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
		
		fs.unlink(filename, () => {});
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

	message.channel.send("( ͡° ͜ʖ ͡°)=ε/̵͇̿̿/'̿̿ ̿ ̿̿ ̿ ̿   " + args[0]);
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
