const fs = require('fs');


let bot;
let voiceConnection;
const prefix = ',';

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
	
	voiceConnection = await message.member.voice.channel.join();

	if (!validObject(message.member.voice.channel)) {
		console.log('User not in a voice channel!');
		return;
	}

	await voiceConnection.voice.setSelfMute(true);

	// voiceConnection.on('speaking')

	let members = await voiceConnection.channel.members;

	members.each((value, key, map) => {

		if (value.user.username === 'pedrofixe') {


			let audio = voiceConnection.receiver.createStream(key);
		
			audio.pipe(fs.createWriteStream('user_audio'));

			audio.on('end', () => {
				console.log('done')
			});

			audio.on('error', (error) => {
				console.log(error);
			});
		}

	});

	console.log('Joined channel ' + voiceConnection.channel.name);
}

async function handleLeave(message, args) {

	printCommand(message);
	
	if (args.length !== 0) {
		message.channel.send('Leave command has no arguments!');
		console.log('Leave command has no arguments!');
		return;
	}
	
	if (!validObject(voiceConnection)) {
		console.log("I'm not in a voice channel!");
		return;
	}

	voiceConnection.disconnect();

	console.log('Left channel');
}


function validObject(obj) {
	return (obj !== undefined && obj !== null);
}

function printCommand(message) {
	let msg = message.content.slice(prefix.length);

	console.log('Received command: ' + msg);
}